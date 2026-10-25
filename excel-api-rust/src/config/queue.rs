// Write-queue lane configuration.

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct QueueConfig {
    pub batch_max_size: usize,
    pub batch_debounce_ms: u64,
    pub lock_timeout_ms: u64,
    pub lock_dir: String,
}
