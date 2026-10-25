// Parsed-workbook cache settings.

use super::defaults::*;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct CacheConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub invalidation: String,
    #[serde(default = "default_poll")]
    pub poll_interval_ms: u64,
}
