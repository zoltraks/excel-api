// Logging, file rotation, lifecycle, and rate-limit settings.

use super::defaults::*;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    #[serde(default = "default_format")]
    pub format: String,
    pub file: Option<LogFileConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LogFileConfig {
    pub enabled: bool,
    pub path: String,
    pub max_files: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LifecycleConfig {
    pub life: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimitConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_token_rpm")]
    pub token_per_minute: u32,
    #[serde(default = "default_rpm")]
    pub requests_per_minute: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            token_per_minute: default_token_rpm(),
            requests_per_minute: default_rpm(),
        }
    }
}
