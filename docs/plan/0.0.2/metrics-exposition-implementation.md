# Metrics Exposition — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/metrics-exposition.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`.

**Documentation Updates**: `docs/SPECIFICATION.md` metrics section per server if it describes the current malformed output.

**Step by Step Implementation**:

1. **Node: valid exposition**
   - `collector.ts`: one `HELP`/`TYPE` per base metric name (labels only on sample lines); convert the custom percentile series to histogram `_bucket`/`_sum`/`_count`; keep counters/gauges.
   - Files: `excel-api-node/src/metrics/collector.ts`, `src/routes/metrics.ts`.

2. **Java: real metrics**
   - `MetricsController` emits valid exposition: request counters/durations beyond uptime.
   - Files: `excel-api-java/.../controller/MetricsController.java`, a small metrics collector.

3. **C#: real metrics**
   - `HealthEndpoints`/metrics endpoint emits valid exposition with request counters.
   - Files: `excel-api-csharp/src/ExcelApi/Endpoints/`.

4. **Parse check**
   - Verify output parses with `promtool`-style exposition rules (labels on samples, histogram series).

**Testing Strategy**: Unit test on exposition formatting per server.

**Verification**: `docs/TESTING.md` loop on all three servers.
