// Shared serde default helpers for the configuration structs.

pub(super) fn default_mode() -> String {
    "single".to_string()
}

pub(super) fn default_alg() -> String {
    "HS256".to_string()
}

pub(super) const fn default_true() -> bool {
    true
}

pub(super) const fn default_poll() -> u64 {
    2000
}

pub(super) fn default_format() -> String {
    "json".to_string()
}

pub(super) const fn default_token_rpm() -> u32 {
    20
}

pub(super) const fn default_rpm() -> u32 {
    600
}
