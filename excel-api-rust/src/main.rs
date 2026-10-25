//! Excel API - Rust implementation.
//!
//! Bootstrap order: CLI args -> config -> logger -> access -> registry ->
//! infrastructure (lock, cache, queue) -> `OpenAPI` document -> router -> serve.

mod app;
mod auth;
mod cache;
mod cli;
mod config;
mod error;
mod excel;
mod lock;
mod logger;
mod metrics;
mod middleware;
mod queue;
mod ratelimit;
mod routes;
mod state;
mod util;
mod workbook;

use serde_json::json;

use crate::logger::Logger;

#[tokio::main]
async fn main() {
    let args = cli::parse_args(std::env::args().skip(1));
    if let Err(e) = app::run(args).await {
        Logger::new("error").error(
            "Fatal startup error",
            Some(json!({ "error": format!("{e:#}") })),
        );
        std::process::exit(1);
    }
}
