// Cross-implementation lockfile protocol.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use crate::util::utc_now_iso;

const POLL_INTERVAL: Duration = Duration::from_millis(25);

#[derive(Debug, Serialize, Deserialize)]
pub struct LockfileContent {
    pub pid: u32,
    pub hostname: String,
    pub implementation: String,
    pub locked_at: String,
}

#[derive(Debug, Serialize)]
pub struct LockInfo {
    pub locked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked_since: Option<String>,
}

#[derive(Debug)]
pub enum LockError {
    Held(String),
    Io(String),
}

impl std::fmt::Display for LockError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Held(m) | Self::Io(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for LockError {}

pub struct FileLock {
    lock_dir: PathBuf,
    timeout: Duration,
    implementation: String,
}

impl FileLock {
    pub fn new(lock_dir: &Path, timeout_ms: u64, implementation: &str) -> std::io::Result<Self> {
        std::fs::create_dir_all(lock_dir)?;
        Ok(Self {
            lock_dir: lock_dir.to_path_buf(),
            timeout: Duration::from_millis(timeout_ms),
            implementation: implementation.to_string(),
        })
    }

    fn path_for(&self, file_id: &str) -> PathBuf {
        self.lock_dir.join(format!("{file_id}.lock"))
    }

    fn host_name() -> String {
        hostname::get()
            .ok()
            .and_then(|h| h.into_string().ok())
            .unwrap_or_else(|| "unknown".to_string())
    }

    fn read_lockfile(path: &Path) -> Option<LockfileContent> {
        let text = std::fs::read_to_string(path).ok()?;
        serde_json::from_str(&text).ok()
    }

    fn is_stale(&self, content: &LockfileContent) -> bool {
        let Ok(locked) = chrono::DateTime::parse_from_rfc3339(&content.locked_at) else {
            return false;
        };
        chrono::Utc::now()
            .signed_duration_since(locked.with_timezone(&chrono::Utc))
            .to_std()
            .map(|age| age >= self.timeout)
            .unwrap_or(false)
    }

    /// Blocking acquire with stale takeover and bounded timeout.
    /// Runs inside `spawn_blocking` on the write path.
    pub fn acquire(&self, file_id: &str) -> Result<(), LockError> {
        let path = self.path_for(file_id);
        let deadline = Instant::now() + self.timeout;
        let pid = std::process::id();

        loop {
            let content = LockfileContent {
                pid,
                hostname: Self::host_name(),
                implementation: self.implementation.clone(),
                locked_at: utc_now_iso(),
            };
            match std::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
            {
                Ok(mut f) => {
                    use std::io::Write;
                    if let Err(e) = f.write_all(
                        serde_json::to_string(&content)
                            .unwrap_or_default()
                            .as_bytes(),
                    ) {
                        let _ = std::fs::remove_file(&path);
                        return Err(LockError::Io(e.to_string()));
                    }
                    return Ok(());
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {}
                Err(e) => return Err(LockError::Io(e.to_string())),
            }

            let existing = Self::read_lockfile(&path);
            if let Some(ref ex) = existing {
                if self.is_stale(ex) {
                    let _ = std::fs::remove_file(&path);
                    continue;
                }
                if ex.pid == pid {
                    return Err(LockError::Held(format!(
                        "File is locked by {} (PID {})",
                        ex.hostname, ex.pid
                    )));
                }
            }

            if Instant::now() >= deadline {
                let holder = existing.map_or_else(
                    || "unknown holder".to_string(),
                    |ex| format!("{} (PID {})", ex.hostname, ex.pid),
                );
                return Err(LockError::Held(format!("File is locked by {holder}")));
            }
            std::thread::sleep(POLL_INTERVAL);
        }
    }

    pub fn release(&self, file_id: &str) {
        let path = self.path_for(file_id);
        if let Some(content) = Self::read_lockfile(&path)
            && content.pid == std::process::id()
        {
            let _ = std::fs::remove_file(&path);
        }
    }

    pub fn lock_info(&self, file_id: &str) -> LockInfo {
        let path = self.path_for(file_id);
        match Self::read_lockfile(&path) {
            Some(content) if !self.is_stale(&content) => LockInfo {
                locked: true,
                locked_by: Some(content.hostname),
                locked_since: Some(content.locked_at),
            },
            _ => LockInfo {
                locked: false,
                locked_by: None,
                locked_since: None,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
    use super::*;

    #[test]
    fn acquire_and_release_round_trip() {
        let dir = std::env::temp_dir().join(format!("locktest-{}", std::process::id()));
        let lock = FileLock::new(&dir, 1000, "excel-api-rust").unwrap();
        lock.acquire("wb1").unwrap();
        assert!(lock.lock_info("wb1").locked);
        lock.release("wb1");
        assert!(!lock.lock_info("wb1").locked);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn same_pid_second_acquire_fails_fast() {
        let dir = std::env::temp_dir().join(format!("locktest2-{}", std::process::id()));
        let lock = FileLock::new(&dir, 100, "excel-api-rust").unwrap();
        lock.acquire("wb2").unwrap();
        let err = lock.acquire("wb2").expect_err("second acquire must fail");
        assert!(matches!(err, LockError::Held(_)));
        lock.release("wb2");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
