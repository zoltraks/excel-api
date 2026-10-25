// Structured JSON console logger + optional rotating file logger.

use chrono::Local;
use serde_json::{Value, json};
use std::io::Write;
use std::sync::Mutex;

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Debug)]
pub enum Level {
    Error = 0,
    Warn = 1,
    Info = 2,
    Debug = 3,
    Trace = 4,
}

impl Level {
    pub fn parse(name: &str) -> Self {
        match name {
            "error" => Self::Error,
            "warn" => Self::Warn,
            "debug" => Self::Debug,
            "trace" => Self::Trace,
            _ => Self::Info,
        }
    }
    const fn label(self) -> &'static str {
        match self {
            Self::Error => "error",
            Self::Warn => "warn",
            Self::Info => "info",
            Self::Debug => "debug",
            Self::Trace => "trace",
        }
    }
}

pub struct FileLogger {
    path: std::path::PathBuf,
    max_files: u32,
    file: Mutex<std::fs::File>,
}

impl FileLogger {
    pub fn create(path: &str, max_files: u32) -> std::io::Result<Self> {
        if let Some(parent) = std::path::Path::new(path).parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;
        Ok(Self {
            path: std::path::PathBuf::from(path),
            max_files: max_files.max(1),
            file: Mutex::new(file),
        })
    }

    pub fn log(&self, record: &Value) {
        let line = record.to_string();
        let mut guard = self
            .file
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if writeln!(guard, "{line}").is_err() {
            return;
        }
        drop(guard);
        self.rotate_if_needed();
    }

    fn rotate_if_needed(&self) {
        const MAX_SIZE: u64 = 5 * 1024 * 1024;
        let Ok(meta) = std::fs::metadata(&self.path) else {
            return;
        };
        if meta.len() < MAX_SIZE {
            return;
        }
        for i in (1..self.max_files).rev() {
            let from = self.path.with_extension(format!("{i}.log"));
            let to = self.path.with_extension(format!("{}.log", i + 1));
            let _ = std::fs::rename(&from, &to);
        }
        let _ = std::fs::rename(&self.path, self.path.with_extension("1.log"));
        if let Ok(f) = std::fs::File::create(&self.path) {
            *self
                .file
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner) = f;
        }
    }
}

pub struct Logger {
    level: Level,
}

impl Logger {
    pub fn new(level: &str) -> Self {
        Self {
            level: Level::parse(level),
        }
    }

    fn emit(&self, level: Level, message: &str, extra: Option<Value>) {
        if level > self.level {
            return;
        }
        let now = Local::now();
        let mut record = json!({
            "level": level.label(),
            "date": now.format("%Y-%m-%d").to_string(),
            "time": now.format("%H:%M:%S%.3f").to_string(),
            "message": message,
        });
        if let (Some(obj), Some(extra)) = (record.as_object_mut(), extra)
            && let Some(extra_obj) = extra.as_object()
        {
            for (k, v) in extra_obj {
                obj.insert(k.clone(), v.clone());
            }
        }
        println!("{}", serde_json::to_string(&record).unwrap_or_default());
    }

    pub fn error(&self, message: &str, extra: Option<Value>) {
        self.emit(Level::Error, message, extra);
    }
    pub fn warn(&self, message: &str, extra: Option<Value>) {
        self.emit(Level::Warn, message, extra);
    }
    pub fn info(&self, message: &str, extra: Option<Value>) {
        self.emit(Level::Info, message, extra);
    }
    pub fn debug(&self, message: &str, extra: Option<Value>) {
        self.emit(Level::Debug, message, extra);
    }
}
