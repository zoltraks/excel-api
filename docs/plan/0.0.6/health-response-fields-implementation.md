# Implementation Plan - Health Response Field Renames

## Approach

Contract-first, then all four servers, then verification. The field
rename is mechanical; the risk is the local-time format (every stack has
a different date API and the format must be identical byte-for-byte in
shape).

## Steps

1. **Contract**: `docs/contract/openapi.yaml` - rename `uptime_seconds`
   to `uptime` (type integer, description: whole seconds since process
   start) and `server_time` to `time` (type string, description: local
   time `YYYY-MM-DD hh:mm:ss.fff`); update `required` to list `time`.
   Run `shell/sync-openapi.sh` to propagate to all four resource copies.
2. **Docs**: update prose references to `server_time`/`uptime_seconds`
   in `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/SPECIFICATION.md`.
3. **Node** (`src/routes/health.ts`): `uptime` already uses
   `Math.floor(process.uptime())`; format `time` via `Intl`/manual
   component padding in local time.
4. **Java** (`HealthController`): `uptime` long seconds; `time` via
   `LocalDateTime.now()` + `DateTimeFormatter.ofPattern("yyyy-MM-dd
   HH:mm:ss.SSS")`.
5. **C#** (`HealthEndpoints`): `uptime` integral seconds;
   `DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff")`.
6. **Rust** (`routes/service.rs`): `uptime` as `u64` (drop the float);
   `time` via `chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f")`.
7. **Verify**: rebuild each impl, restart, `GET /health` on each and
   diff the field set/format; re-run the Jest suite against each
   running instance (suite must stay 26/26 on node/rust and match the
   known java/csharp baselines until their parity fixes land).

## Verification evidence

- `curl /health` output identical in shape across the four servers.
- `grep -rn "uptime_seconds\|server_time"` returns only historical
  references (change docs, old plans, CHANGELOG).
