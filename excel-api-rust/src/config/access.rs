// Access-control configuration: OAuth2, static tokens, and ACL rules.

use serde::Deserialize;

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
