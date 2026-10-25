// Configuration loading and validation: config.yaml + access.yaml.

use anyhow::{Context, bail};
use serde::Deserialize;
use serde_yaml_ng::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
    #[serde(default)]
    pub base_path: String,
    #[serde(default)]
    pub tls: TlsConfig,
    #[serde(default)]
    pub cors: CorsConfig,
    #[serde(default)]
    pub json: JsonConfig,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct TlsConfig {
    #[serde(default)]
    pub enabled: bool,
    pub cert_file: Option<String>,
    pub key_file: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct CorsConfig {
    #[serde(default)]
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct JsonConfig {
    #[serde(default)]
    pub pretty: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpenApiConfig {
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub servers: Vec<OpenApiServer>,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct OpenApiServer {
    pub url: String,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SheetHeaderConfig {
    #[serde(default = "default_mode")]
    pub mode: String,
    pub identifier_row: Option<u32>,
    pub type_row: Option<u32>,
    pub description_row: Option<u32>,
    pub legend_sheet: Option<String>,
}

fn default_mode() -> String {
    "single".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct WorkbookEntry {
    pub id: String,
    pub path: String,
    #[serde(default)]
    pub readonly: bool,
    #[serde(default)]
    pub sheets: HashMap<String, SheetHeaderConfig>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RegistryConfig {
    pub directory: String,
    pub workbooks: Vec<WorkbookEntry>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueueConfig {
    pub batch_max_size: usize,
    pub batch_debounce_ms: u64,
    pub lock_timeout_ms: u64,
    pub lock_dir: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CacheConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub invalidation: String,
    #[serde(default = "default_poll")]
    pub poll_interval_ms: u64,
}

const fn default_true() -> bool {
    true
}
const fn default_poll() -> u64 {
    2000
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuthConfig {
    #[serde(default = "default_mode")]
    pub mode: String,
    pub jwt: JwtConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JwtConfig {
    pub issuer: String,
    pub expiration_minutes: u64,
    #[serde(default = "default_alg")]
    pub algorithm: String,
}

fn default_alg() -> String {
    "HS256".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    #[serde(default = "default_format")]
    pub format: String,
    pub file: Option<LogFileConfig>,
}

fn default_format() -> String {
    "json".to_string()
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

const fn default_token_rpm() -> u32 {
    20
}
const fn default_rpm() -> u32 {
    600
}

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
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

#[derive(Debug, Clone, Deserialize)]
pub struct OAuth2Client {
    pub client_id: String,
    pub client_secret: String,
    #[serde(default)]
    pub grant_types: Vec<String>,
    #[serde(default)]
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OAuth2User {
    pub username: String,
    pub password_hash: String,
    #[serde(default)]
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StaticToken {
    pub token: String,
    pub name: String,
    #[serde(default)]
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AclRule {
    pub scope: String,
    pub allow: Vec<String>,
    #[serde(default)]
    pub admin_endpoints: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccessConfig {
    pub jwt: AccessJwt,
    pub oauth2: AccessOAuth2,
    #[serde(default)]
    pub tokens: AccessTokens,
    pub acl: AccessAcl,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccessJwt {
    pub secret: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccessOAuth2 {
    #[serde(default)]
    pub clients: Vec<OAuth2Client>,
    #[serde(default)]
    pub users: Vec<OAuth2User>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct AccessTokens {
    #[serde(default)]
    pub r#static: Vec<StaticToken>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccessAcl {
    pub rules: Vec<AclRule>,
}

/// Replace `${VAR}` in every YAML string with the environment variable value.
fn interpolate(value: &mut Value) -> anyhow::Result<()> {
    match value {
        Value::String(s) => {
            let mut out = String::with_capacity(s.len());
            let mut rest = s.as_str();
            while let Some(start) = rest.find("${") {
                out.push_str(&rest[..start]);
                let end = rest[start + 2..]
                    .find('}')
                    .map(|i| start + 2 + i)
                    .with_context(|| "unterminated ${} interpolation")?;
                let var = &rest[start + 2..end];
                let env = std::env::var(var).with_context(|| {
                    format!("Environment variable {var} not found for interpolation")
                })?;
                out.push_str(&env);
                rest = &rest[end + 1..];
            }
            out.push_str(rest);
            *s = out;
            Ok(())
        }
        Value::Sequence(seq) => {
            for item in seq {
                interpolate(item)?;
            }
            Ok(())
        }
        Value::Mapping(map) => {
            for (_, v) in map.iter_mut() {
                interpolate(v)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn resolve_named_path(
    work_dir: Option<&str>,
    explicit: Option<&str>,
    default_name: &str,
) -> PathBuf {
    if let Some(target) = explicit {
        let p = PathBuf::from(target);
        if p.is_absolute() {
            return p;
        }
        return match work_dir {
            Some(dir) => Path::new(dir).join(p),
            None => p,
        };
    }
    match work_dir {
        Some(dir) => Path::new(dir).join("config").join(default_name),
        None => Path::new("config").join(default_name),
    }
}

fn resolve_against_work(path: &str, work_dir: Option<&str>) -> PathBuf {
    let p = PathBuf::from(path);
    if p.is_absolute() {
        return p;
    }
    match work_dir {
        Some(dir) => Path::new(dir).join(p),
        None => std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(p),
    }
}

fn merge_profile(base: &mut Value, profile: &Value) {
    const SECTIONS: &[&str] = &[
        "server",
        "openapi",
        "registry",
        "queue",
        "cache",
        "auth",
        "logging",
        "lifecycle",
    ];
    let (Some(base_map), Some(profile_map)) = (base.as_mapping_mut(), profile.as_mapping()) else {
        return;
    };
    for section in SECTIONS {
        let (Some(base_section), Some(profile_section)) = (
            base_map.get_mut(Value::from(*section)),
            profile_map.get(Value::from(*section)),
        ) else {
            continue;
        };
        if let (Some(b), Some(p)) = (base_section.as_mapping_mut(), profile_section.as_mapping()) {
            for (k, v) in p {
                b.insert(k.clone(), v.clone());
            }
        }
    }
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
