# Implementation Plan - Timezone Identifier Parity

## Change Request Reference

`docs/change/0.0.6/timezone-identifier-parity.md`

## Best Practices

- `docs/standard/csharp-aspnet-development.md`
- `docs/standard/java-spring-development.md`
- `docs/standard/rust-general-development.md`

## Documentation Updates

- `docs/SPECIFICATION.md` - the shared timezone resolution rule

## Step by Step Implementation

**Shared precedence.** Every implementation resolves the reported zone identically: `TZ` environment variable first, then the `/etc/localtime` symlink target on Unix hosts, then the platform default (`Intl`, `ZoneId.systemDefault`, `TimeZoneInfo.Local`+IANA, `iana_time_zone`).

**Per-stack resolver.** Add a small resolver per stack honoring that chain; C# stops trusting `TimeZoneInfo.Local`'s IANA pick as the first source.

## Testing Strategy

- Manual: identical `timezone` string in `/health` from all four servers on the same host; `TZ=...` override honored identically.

## Verification

Per `docs/TESTING.md` loops on touched implementations.
