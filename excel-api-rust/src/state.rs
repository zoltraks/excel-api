// Shared application state injected via axum State extractor.

use std::sync::Arc;
use std::sync::Mutex;
use std::time::Instant;

use crate::auth::{AclChecker, JwtAuth};
use crate::cache::WorkbookCache;
use crate::config::{AccessConfig, Config};
use crate::lock::FileLock;
use crate::logger::{FileLogger, Logger};
use crate::metrics::Metrics;
use crate::queue::WriteQueue;
use crate::ratelimit::RateLimiter;
use crate::workbook::WorkbookRegistry;

pub struct AppState {
    pub config: Config,
    pub access: AccessConfig,
    pub registry: Mutex<WorkbookRegistry>,
    pub queue: WriteQueue,
    pub cache: Arc<WorkbookCache>,
    pub lock: Arc<FileLock>,
    pub metrics: Metrics,
    pub logger: Logger,
    pub file_logger: Option<FileLogger>,
    pub acl: AclChecker,
    pub jwt: JwtAuth,
    pub openapi_yaml: String,
    pub openapi_json: String,
    pub pretty: bool,
    pub global_limiter: Option<RateLimiter>,
    pub token_limiter: Option<RateLimiter>,
    pub started: Instant,
}
