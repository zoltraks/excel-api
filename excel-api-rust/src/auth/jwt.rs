// JWT validation: HS256 claims parsing and signature checks.

use serde::{Deserialize, Serialize};

use crate::config::{AccessConfig, Config};

use super::AuthContext;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    #[serde(default)]
    pub scope: Vec<String>,
    pub iss: String,
    pub iat: u64,
    pub exp: u64,
}

pub struct JwtAuth {
    secret: String,
    issuer: String,
    pub expiration_minutes: u64,
}

impl JwtAuth {
    pub fn new(config: &Config, access: &AccessConfig) -> Self {
        Self {
            secret: access.jwt.secret.clone(),
            issuer: config.auth.jwt.issuer.clone(),
            expiration_minutes: config.auth.jwt.expiration_minutes,
        }
    }

    pub fn sign(
        &self,
        sub: &str,
        scopes: &[String],
    ) -> Result<(String, u64), jsonwebtoken::errors::Error> {
        let now = chrono::Utc::now().timestamp() as u64;
        let claims = Claims {
            sub: sub.to_string(),
            scope: scopes.to_vec(),
            iss: self.issuer.clone(),
            iat: now,
            exp: now + self.expiration_minutes * 60,
        };
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(self.secret.as_bytes()),
        )?;
        Ok((token, self.expiration_minutes * 60))
    }

    /// Signature + expiry verification; failures map to `TOKEN_EXPIRED` upstream.
    pub fn verify(&self, token: &str) -> Result<AuthContext, jsonwebtoken::errors::Error> {
        let data = jsonwebtoken::decode::<Claims>(
            token,
            &jsonwebtoken::DecodingKey::from_secret(self.secret.as_bytes()),
            &jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256),
        )?;
        Ok(AuthContext {
            sub: data.claims.sub,
            scopes: data.claims.scope,
        })
    }
}
