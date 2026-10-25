// Command-line argument parsing: --work, --config, --access, --life.

#[derive(Debug, Default)]
pub struct ServerArgs {
    pub work_dir: Option<String>,
    pub config_path: Option<String>,
    pub access_path: Option<String>,
    pub life: Option<String>,
}

pub fn parse_args<I: Iterator<Item = String>>(mut argv: I) -> ServerArgs {
    let mut result = ServerArgs::default();
    while let Some(arg) = argv.next() {
        match arg.as_str() {
            "--work" => result.work_dir = argv.next(),
            "--config" => result.config_path = argv.next(),
            "--access" => result.access_path = argv.next(),
            "--life" => result.life = argv.next(),
            _ => {}
        }
    }
    result
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
    use super::*;

    #[test]
    fn parses_all_flags() {
        let args = parse_args(
            vec![
                "--work", "/tmp/w", "--config", "c.yaml", "--access", "a.yaml", "--life", "30s",
            ]
            .into_iter()
            .map(String::from),
        );
        assert_eq!(args.work_dir.as_deref(), Some("/tmp/w"));
        assert_eq!(args.config_path.as_deref(), Some("c.yaml"));
        assert_eq!(args.access_path.as_deref(), Some("a.yaml"));
        assert_eq!(args.life.as_deref(), Some("30s"));
    }

    #[test]
    fn empty_when_no_flags() {
        let args = parse_args(Vec::new().into_iter());
        assert!(args.work_dir.is_none());
    }
}
