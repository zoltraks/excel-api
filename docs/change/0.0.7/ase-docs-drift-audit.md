# ASE Documentation Drift Audit

## Type

Chore

## Summary

Compass-style source-only audit of the live ASE document set after the
0.0.7 window's changes. Live docs are largely current - the audit
confirms one documented-vs-implemented divergence (metrics family set)
now covered by the response-parity change request, and a set of minor
bookkeeping notes.

## Coverage

`docs/` live set: README, PROJECT, ARCHITECTURE, SPECIFICATION,
GUIDELINES, WORKFLOW, TESTING, DEPLOYMENT, AGENTS, contract.

## Description

Audit findings:

- **Metrics canonical set** (ARCHITECTURE.md ~line 179-185): the
  documented family set includes `record_delete_*` and
  `range_get_duration_*` families; the parity matrix shows C# emits
  the full set, node lacks `record_delete_*`, rust lacks
  `record_delete_*` and `range_get_duration_*`. Tracked as an
  implementation fix under `cross-impl-response-parity` - docs
  themselves are accurate.
- **Field-name sweep**: no residual `timezone`/`modified_at`/
  `size_bytes`/`sheet_names` claims in live docs; the `formula`
  mentions are cell-type references, correct by fact.
- **Count sweeps**: no residual "three implementations" claims;
  component counts are "all"/"four servers"/"six components" and
  accurate.
- **Rust source map**: ARCHITECTURE tree matches the reorganized
  layout (config/, auth/, queue/ dirs, routes/ flat).
- **TESTING.md**: cross-implementation section documents ports,
  shared env, harness - matches `shell/cross_test.py`.
- **Minor**: `docs/contract/openapi.yaml` `LockStatus` marks
  `locked_by`/`locked_since` optional while the parity convention
  emits them everywhere - contract could mark them required after
  implementations align (decision under the parity change request).
- **Minor**: served `openapi.yaml` bodies differ in length across
  servers (config `servers` URL + info overrides) - behavior is
  config-driven and documented; no fix.

## Hints

- The behavioral divergences the audit implies live in
  `cross-impl-response-parity` - do not duplicate fixes there.
