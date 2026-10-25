// Environment interpolation, profile merge, and path resolution.

use anyhow::Context;
use serde_yaml_ng::Value;
use std::path::{Path, PathBuf};

/// Replace `${VAR}` in every YAML string with the environment variable value.
pub(crate) fn interpolate(value: &mut Value) -> anyhow::Result<()> {
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

pub(crate) fn resolve_named_path(
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

pub(crate) fn resolve_against_work(path: &str, work_dir: Option<&str>) -> PathBuf {
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

pub(crate) fn merge_profile(base: &mut Value, profile: &Value) {
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
