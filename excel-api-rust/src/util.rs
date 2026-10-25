// Shared helpers: duration parsing, column letters, cell refs, timestamps.

use chrono::Utc;

/// Canonical duration parser: `<number><unit>` where unit is s, m, or h.
/// Returns milliseconds.
pub fn parse_duration(duration: &str) -> anyhow::Result<u64> {
    let (num, unit) = duration.split_at(duration.len().saturating_sub(1));
    let value: u64 = num.parse().map_err(|_| {
        anyhow::anyhow!("Invalid duration format: {duration}. Expected <number><unit> (s, m, h).")
    })?;
    match unit {
        "s" => Ok(value * 1000),
        "m" => Ok(value * 60 * 1000),
        "h" => Ok(value * 60 * 60 * 1000),
        _ => Err(anyhow::anyhow!(
            "Invalid duration unit: {unit}. Expected s, m, or h."
        )),
    }
}

/// 1-based column index to Excel letter (1 -> A, 27 -> AA).
pub fn col_letter(mut col: u32) -> String {
    let mut letters = String::new();
    while col > 0 {
        let rem = (col - 1) % 26;
        letters.insert(0, (b'A' + rem as u8) as char);
        col = (col - 1) / 26;
    }
    letters
}

/// Excel letter to 1-based column index; -1 on invalid input.
pub fn col_index(letter: &str) -> i64 {
    let mut index: i64 = 0;
    for ch in letter.chars() {
        let up = ch.to_ascii_uppercase();
        if !up.is_ascii_uppercase() {
            return -1;
        }
        index = index * 26 + i64::from(up as u8 - b'A' + 1);
    }
    index
}

/// Parse an A1-style cell reference into (col, row), both 1-based.
pub fn parse_cell_ref(cell_ref: &str) -> Option<(u32, u32)> {
    let split = cell_ref.find(|c: char| c.is_ascii_digit())?;
    if split == 0 || split > 3 {
        return None;
    }
    let col = col_index(&cell_ref[..split]);
    let row: u32 = cell_ref[split..].parse().ok()?;
    if col <= 0 || row == 0 {
        return None;
    }
    Some((col as u32, row))
}

/// Current local server time in `YYYY-MM-DD hh:mm:ss.fff` (no zone suffix).
pub fn local_now() -> String {
    chrono::Local::now()
        .format("%Y-%m-%d %H:%M:%S%.3f")
        .to_string()
}

/// File modification time as `YYYY-MM-DD hh:mm:ss.fff` local server time.
pub fn mtime_local(meta: &std::fs::Metadata) -> String {
    let time: chrono::DateTime<Utc> = meta
        .modified()
        .unwrap_or_else(|_| std::time::SystemTime::now())
        .into();
    time.with_timezone(&chrono::Local)
        .format("%Y-%m-%d %H:%M:%S%.3f")
        .to_string()
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
    use super::*;

    #[test]
    fn duration_units() {
        assert_eq!(parse_duration("30s").unwrap(), 30_000);
        assert_eq!(parse_duration("5m").unwrap(), 300_000);
        assert_eq!(parse_duration("2h").unwrap(), 7_200_000);
        assert!(parse_duration("1d").is_err());
        assert!(parse_duration("xs").is_err());
    }

    #[test]
    fn column_letters() {
        assert_eq!(col_letter(1), "A");
        assert_eq!(col_letter(26), "Z");
        assert_eq!(col_letter(27), "AA");
        assert_eq!(col_index("A"), 1);
        assert_eq!(col_index("AA"), 27);
        assert_eq!(col_index("1"), -1);
    }

    #[test]
    fn cell_refs() {
        assert_eq!(parse_cell_ref("A1"), Some((1, 1)));
        assert_eq!(parse_cell_ref("AA100"), Some((27, 100)));
        assert_eq!(parse_cell_ref("1A"), None);
        assert_eq!(parse_cell_ref("A0"), None);
    }
}
