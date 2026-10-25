// Configuration loading and validation: config.yaml + access.yaml.

mod access;
mod auth;
mod cache;
mod defaults;
mod logging;
mod openapi;
mod queue;
mod registry;
mod resolve;
mod server;

pub use access::*;
pub use auth::*;
pub use cache::*;
pub use logging::*;
pub use openapi::*;
pub use queue::*;
pub use registry::*;
use resolve::*;
pub use server::*;

use anyhow::{Context, bail};
use serde::Deserialize;
use serde_yaml_ng::Value;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    #[allow(dead_code)]
    pub openapi: OpenApiConfig,
    pub registry: RegistryConfig,
    pub queue: QueueConfig,
    pub cache: CacheConfig,
    pub auth: AuthConfig,
    pub logging: LoggingConfig,
    pub lifecycle: Option<LifecycleConfig>,
    #[serde(default)]
    pub rate_limit: RateLimitConfig,
}

pub struct Loaded {
    pub config: Config,
    pub access: AccessConfig,
}

pub fn load(
    work_dir: Option<&str>,
    config_path: Option<&str>,
    access_path: Option<&str>,
    cli_life: Option<&str>,
    warn: &dyn Fn(&str),
) -> anyhow::Result<Loaded> {
    let work = work_dir
        .map(String::from)
        .or_else(|| std::env::var("WORK").ok());
    let cfg_explicit = config_path
        .map(String::from)
        .or_else(|| std::env::var("CONFIG").ok());
    let acc_explicit = access_path
        .map(String::from)
        .or_else(|| std::env::var("ACCESS").ok());
    let env_life = std::env::var("LIFE").ok();

    let config_file = resolve_named_path(work.as_deref(), cfg_explicit.as_deref(), "config.yaml");
    if !config_file.exists() {
        bail!("Config file not found: {}", config_file.display());
    }
    let text = std::fs::read_to_string(&config_file)
        .with_context(|| format!("failed to read {}", config_file.display()))?;
    let mut yaml: Value = serde_yaml_ng::from_str(&text)
        .with_context(|| format!("invalid YAML in {}", config_file.display()))?;
    interpolate(&mut yaml)?;

    if let Ok(profile_name) = std::env::var("CONFIG_PROFILE")
        && let Some(profile) = yaml
            .get("profiles")
            .and_then(Value::as_mapping)
            .and_then(|m| m.get(Value::from(profile_name.as_str())))
    {
        let profile = profile.clone();
        merge_profile(&mut yaml, &profile);
    }

    let mut config: Config = serde_yaml_ng::from_value(yaml)
        .map_err(|e| anyhow::anyhow!("Config validation failed: {e}"))?;

    // Resolve relative paths against the working directory.
    let work_ref = work.as_deref();
    config.registry.directory = resolve_against_work(&config.registry.directory, work_ref)
        .to_string_lossy()
        .into_owned();
    config.queue.lock_dir = resolve_against_work(&config.queue.lock_dir, work_ref)
        .to_string_lossy()
        .into_owned();
    if let Some(f) = &mut config.logging.file {
        f.path = resolve_against_work(&f.path, work_ref)
            .to_string_lossy()
            .into_owned();
    }
    if let Some(f) = &mut config.server.tls.cert_file {
        *f = resolve_against_work(f, work_ref)
            .to_string_lossy()
            .into_owned();
    }
    if let Some(f) = &mut config.server.tls.key_file {
        *f = resolve_against_work(f, work_ref)
            .to_string_lossy()
            .into_owned();
    }

    // Lifecycle override: CLI > env > config.
    let life = cli_life
        .map(String::from)
        .or(env_life)
        .or_else(|| config.lifecycle.as_ref().and_then(|l| l.life.clone()));
    config.lifecycle = life.map(|l| LifecycleConfig { life: Some(l) });

    let access_file = resolve_named_path(work.as_deref(), acc_explicit.as_deref(), "access.yaml");
    if !access_file.exists() {
        bail!("Access file not found: {}", access_file.display());
    }
    check_access_permissions(&access_file, warn);
    let access_text = std::fs::read_to_string(&access_file)
        .with_context(|| format!("failed to read {}", access_file.display()))?;
    let mut access_yaml: Value = serde_yaml_ng::from_str(&access_text)
        .with_context(|| format!("invalid YAML in {}", access_file.display()))?;
    interpolate(&mut access_yaml)?;
    let access: AccessConfig = serde_yaml_ng::from_value(access_yaml)
        .map_err(|e| anyhow::anyhow!("Access config validation failed: {e}"))?;
    if access.jwt.secret.len() < 32 {
        bail!("Access config validation failed: jwt.secret must be at least 32 characters");
    }

    Ok(Loaded { config, access })
}

#[cfg(unix)]
fn check_access_permissions(path: &Path, warn: &dyn Fn(&str)) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = std::fs::metadata(path) {
        let mode = meta.permissions().mode() & 0o777;
        if mode != 0o600 {
            warn(&format!(
                "access.yaml has insecure permissions: {mode:o} (should be 600)"
            ));
        }
    }
}

#[cfg(not(unix))]
fn check_access_permissions(_path: &Path, _warn: &dyn Fn(&str)) {}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn interpolates_env_vars() {
        unsafe {
            std::env::set_var("EXCEL_API_TEST_INTERP", "resolved");
        }
        let mut value = serde_yaml_ng::from_str::<Value>("a: ${EXCEL_API_TEST_INTERP}").unwrap();
        interpolate(&mut value).unwrap();
        assert_eq!(value["a"].as_str(), Some("resolved"));
    }

    #[test]
    fn named_path_resolution() {
        assert_eq!(
            resolve_named_path(Some("/w"), None, "config.yaml"),
            PathBuf::from("/w/config/config.yaml")
        );
        assert_eq!(
            resolve_named_path(Some("/w"), Some("x.yaml"), "config.yaml"),
            PathBuf::from("/w/x.yaml")
        );
        assert_eq!(
            resolve_named_path(None, Some("/abs/x.yaml"), "config.yaml"),
            PathBuf::from("/abs/x.yaml")
        );
    }
}
