// Static token lookup against the access configuration.

use crate::config::AccessConfig;

use super::secrets_equal;

pub fn lookup_static_token<'a>(
    access: &'a AccessConfig,
    token: &str,
) -> Option<&'a crate::config::StaticToken> {
    access
        .tokens
        .r#static
        .iter()
        .find(|t| secrets_equal(&t.token, token))
}
