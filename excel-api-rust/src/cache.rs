// Parsed-workbook cache with mtime invalidation.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use umya_spreadsheet::Workbook;

struct Entry {
    book: Arc<Workbook>,
    mtime: SystemTime,
}

pub struct WorkbookCache {
    enabled: bool,
    entries: Mutex<HashMap<PathBuf, Entry>>,
}

fn file_mtime(path: &Path) -> Option<SystemTime> {
    std::fs::metadata(path).ok().and_then(|m| m.modified().ok())
}

impl WorkbookCache {
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            entries: Mutex::new(HashMap::new()),
        }
    }

    /// Returns the cached workbook when still fresh, else None.
    /// The mtime is stat-checked on every get, matching the reference
    /// implementation's behavior.
    pub fn get(&self, path: &Path) -> Option<Arc<Workbook>> {
        if !self.enabled {
            return None;
        }
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let entry = entries.get(path)?;
        match file_mtime(path) {
            Some(mtime) if mtime <= entry.mtime => Some(entry.book.clone()),
            _ => {
                entries.remove(path);
                None
            }
        }
    }

    pub fn set(&self, path: &Path, book: Arc<Workbook>) {
        if !self.enabled {
            return;
        }
        let mtime = file_mtime(path).unwrap_or_else(SystemTime::now);
        self.entries
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .insert(path.to_path_buf(), Entry { book, mtime });
    }

    pub fn invalidate(&self, path: &Path) {
        self.entries
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .remove(path);
    }

    /// Drop every entry whose file mtime advanced past the cached value.
    pub fn invalidate_stale(&self) {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        entries.retain(|path, entry| file_mtime(path).is_some_and(|m| m <= entry.mtime));
    }

    /// Background invalidation loop; cancel by aborting the returned handle.
    pub fn spawn_poll(self: &Arc<Self>, interval: Duration) -> tokio::task::JoinHandle<()> {
        let cache = self.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(interval);
            loop {
                tick.tick().await;
                cache.invalidate_stale();
            }
        })
    }
}
