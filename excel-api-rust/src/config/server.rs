// Server, TLS, CORS, and JSON response settings.

use serde::Deserialize;

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
