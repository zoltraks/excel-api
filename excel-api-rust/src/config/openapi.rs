// OpenAPI metadata settings.

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
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
