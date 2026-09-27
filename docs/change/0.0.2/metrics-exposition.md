# Metrics Exposition

**Type**: Fix

**Summary**: `/metrics` output is not valid Prometheus exposition in any server: Node embeds label sets in metric names and uses nonstandard percentile series, while Java and C# expose only uptime. Emit valid exposition in all three servers.

**Description**:

Audit finding FND-INF-004 / recommendation REC-019.

- Emit one `HELP`/`TYPE` pair per base metric name; labels appear only on sample lines.
- Histograms must expose `_bucket`/`_sum`/`_count` series (Prometheus convention).
- Java and C# must expose real request counters and durations, not only uptime and an info gauge.
- Output must parse with a standard Prometheus exposition parser.
- Keep metric names aligned across servers where the contract or docs declare them.

## Out of Scope

- Pushgateway/OTel exporters or dashboards.
