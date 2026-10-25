// Authentication mode and JWT settings.

use super::defaults::*;
use serde::Deserialize;

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
