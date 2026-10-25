// Composition root: builds state, router, and serves.

const OPENAPI_DOC: &str = include_str!("../resources/openapi.yaml");

use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::{Value, json};

use crate::auth::{AclChecker, JwtAuth};
use crate::cache::WorkbookCache;
use crate::lock::FileLock;
use crate::logger::{FileLogger, Logger};
use crate::metrics::Metrics;
use crate::queue::WriteQueue;
use crate::ratelimit::RateLimiter;
use crate::state::AppState;
use crate::workbook::WorkbookRegistry;

pub(crate) async fn run(args: crate::cli::ServerArgs) -> anyhow::Result<()> {
    let early_logger = Logger::new("info");
    let loaded = crate::config::load(
        args.work_dir.as_deref(),
        args.config_path.as_deref(),
        args.access_path.as_deref(),
        args.life.as_deref(),
        &|m| early_logger.warn(m, None),
    )?;
    let config = loaded.config;
    let access = loaded.access;

    let logger = Logger::new(&config.logging.level);
    if config.auth.jwt.algorithm != "HS256" {
        anyhow::bail!(
            "Unsupported jwt.algorithm '{}' - only HS256 is supported",
            config.auth.jwt.algorithm
        );
    }
    if config.logging.format != "json" {
        logger.warn(
            &format!(
                "Unsupported logging.format '{}' - using json",
                config.logging.format
            ),
            None,
        );
    }
    if config.cache.invalidation != "mtime" && !config.cache.invalidation.is_empty() {
        logger.warn(
            &format!(
                "Unsupported cache.invalidation '{}' - using mtime",
                config.cache.invalidation
            ),
            None,
        );
    }
    logger.info("Configuration loaded", None);

    let file_logger = match &config.logging.file {
        Some(f) if f.enabled => Some(FileLogger::create(&f.path, f.max_files.unwrap_or(5))?),
        _ => None,
    };

    let registry = {
        let warn_logger = &logger;
        WorkbookRegistry::new(&config, &|m| warn_logger.warn(m, None))
    };

    let lock = Arc::new(FileLock::new(
        std::path::Path::new(&config.queue.lock_dir),
        config.queue.lock_timeout_ms,
        "excel-api-rust",
    )?);
    let cache = Arc::new(WorkbookCache::new(config.cache.enabled));
    let _poll = cache.spawn_poll(Duration::from_millis(config.cache.poll_interval_ms));

    let queue = WriteQueue::new(
        config.queue.batch_max_size,
        config.queue.batch_debounce_ms,
        Arc::new(crate::excel::execute_batch),
    );

    let (openapi_yaml, openapi_json) = build_openapi_docs(&config)?;

    let (global_limiter, token_limiter) = if config.rate_limit.enabled {
        (
            Some(RateLimiter::new(
                config.rate_limit.requests_per_minute,
                Duration::from_secs(60),
            )),
            Some(RateLimiter::new(
                config.rate_limit.token_per_minute,
                Duration::from_secs(60),
            )),
        )
    } else {
        (None, None)
    };

    let state = Arc::new(AppState {
        pretty: config.server.json.pretty,
        registry: Mutex::new(registry),
        queue,
        cache,
        lock,
        metrics: Metrics::new(),
        logger: Logger::new(&config.logging.level),
        file_logger,
        acl: AclChecker::new(&access),
        jwt: JwtAuth::new(&config, &access),
        openapi_yaml,
        openapi_json,
        global_limiter,
        token_limiter,
        started: Instant::now(),
        config,
        access,
    });

    let app = crate::routes::router(state.clone());
    let addr: SocketAddr = format!("{}:{}", state.config.server.host, state.config.server.port)
        .parse()
        .map_err(|e| anyhow::anyhow!("invalid listen address: {e}"))?;

    state.logger.info(
        "Excel API Rust starting",
        Some(json!({
            "host": state.config.server.host,
            "port": state.config.server.port,
            "basePath": state.config.server.base_path,
        })),
    );

    let life = state
        .config
        .lifecycle
        .as_ref()
        .and_then(|l| l.life.clone())
        .map(|s| crate::util::parse_duration(&s))
        .transpose()?
        .map(Duration::from_millis);

    if state.config.server.tls.enabled {
        serve_tls(addr, app, state.clone(), life).await?;
    } else {
        serve_plain(addr, app, state.clone(), life).await?;
    }
    state.queue.shutdown().await;

    state.logger.info("Excel API Rust stopped", None);
    Ok(())
}

async fn serve_plain(
    addr: SocketAddr,
    app: axum::Router,
    state: Arc<AppState>,
    life: Option<Duration>,
) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal(state, life))
    .await?;
    Ok(())
}

async fn serve_tls(
    addr: SocketAddr,
    app: axum::Router,
    state: Arc<AppState>,
    life: Option<Duration>,
) -> anyhow::Result<()> {
    let cert =
        state.config.server.tls.cert_file.clone().ok_or_else(|| {
            anyhow::anyhow!("server.tls.cert_file is required when TLS is enabled")
        })?;
    let key =
        state.config.server.tls.key_file.clone().ok_or_else(|| {
            anyhow::anyhow!("server.tls.key_file is required when TLS is enabled")
        })?;
    let tls_config = axum_server::tls_rustls::RustlsConfig::from_pem_file(cert, key).await?;
    let handle = axum_server::Handle::new();
    let shutdown_handle = handle.clone();
    tokio::spawn(async move {
        shutdown_signal(state, life).await;
        shutdown_handle.graceful_shutdown(Some(Duration::from_secs(5)));
    });
    axum_server::bind_rustls(addr, tls_config)
        .handle(handle)
        .serve(app.into_make_service_with_connect_info::<SocketAddr>())
        .await?;
    Ok(())
}

async fn shutdown_signal(state: Arc<AppState>, life: Option<Duration>) {
    let reason = tokio::select! {
        result = tokio::signal::ctrl_c() => {
            result.map_or("signal", |()| "SIGINT")
        }
        () = sigterm() => "SIGTERM",
        () = async {
            match life {
                Some(d) => tokio::time::sleep(d).await,
                None => std::future::pending::<()>().await,
            }
        } => "lifecycle",
    };
    state
        .logger
        .info("Shutdown requested", Some(json!({ "reason": reason })));
}

#[cfg(unix)]
async fn sigterm() {
    match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
        Ok(mut stream) => {
            stream.recv().await;
        }
        Err(_) => std::future::pending::<()>().await,
    }
}

#[cfg(not(unix))]
async fn sigterm() {
    std::future::pending::<()>().await;
}

/// Convert the bundled `OpenAPI` contract to the JSON twin served verbatim.
fn build_openapi_docs(_config: &crate::config::Config) -> anyhow::Result<(String, String)> {
    let doc: serde_yaml_ng::Value = serde_yaml_ng::from_str(OPENAPI_DOC)
        .map_err(|e| anyhow::anyhow!("failed to parse bundled OpenAPI spec: {e}"))?;
    let yaml = OPENAPI_DOC.to_string();
    let json_val: Value =
        serde_json::to_value(&doc).unwrap_or_else(|_| json!({"error": "spec conversion failed"}));
    let json = serde_json::to_string(&json_val)?;
    Ok((yaml, json))
}
