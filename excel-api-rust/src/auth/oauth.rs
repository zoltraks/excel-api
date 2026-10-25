// OAuth2 grants: client credentials and password flows.

use crate::config::AccessConfig;

use super::secrets_equal;

#[derive(Debug)]
pub enum GrantError {
    InvalidRequest,
    InvalidClient,
    UnsupportedGrantType,
}

pub fn client_credentials_grant<'a>(
    access: &'a AccessConfig,
    client_id: &str,
    client_secret: &str,
) -> Result<&'a crate::config::OAuth2Client, GrantError> {
    access
        .oauth2
        .clients
        .iter()
        .find(|c| {
            secrets_equal(&c.client_id, client_id)
                && secrets_equal(&c.client_secret, client_secret)
                && c.grant_types.iter().any(|g| g == "client_credentials")
        })
        .ok_or(GrantError::InvalidClient)
}

pub fn password_grant<'a>(
    access: &'a AccessConfig,
    username: &str,
    password: &str,
) -> Result<&'a crate::config::OAuth2User, GrantError> {
    access
        .oauth2
        .users
        .iter()
        .find(|u| {
            u.username == username && bcrypt::verify(password, &u.password_hash).unwrap_or(false)
        })
        .ok_or(GrantError::InvalidClient)
}
