# Batch Operations and Write Queue

**Type**: Feature

**Summary**: The contract declares `POST .../operations` and `POST .../cells/operations` but no server registers them, and the documented write-queue architecture is dead code (Node's `WriteQueue` is never invoked, `queue_depth` is hardcoded to 0 everywhere). Implement both batch endpoints per contract and wire real write queues in all three servers.

**Description**:

Audit findings FND-ARC-001 and FND-CQY-008 / recommendations REC-008 and REC-027.

- Implement `POST /workbooks/{fileId}/sheets/{sheetName}/operations` accepting `BatchRecordRequest` and `POST /workbooks/{fileId}/sheets/{sheetName}/cells/operations` accepting `BatchCellRequest`, returning the contract `BatchResult` in all three servers.
- Batch operations run under the lockfile protocol (`lockfile-protocol` change) and execute within a single file open/save cycle per `docs/ARCHITECTURE.md`.
- Per-operation results must report per the `BatchResult` schema (per-op `op`/`status`/`index` entries), including partial-failure semantics declared by the contract.
- Wire the Node `WriteQueue` into the write routes with real debounce (`batch_debounce_ms`) and size (`batch_max_size`) behavior; Java and C# get equivalent per-workbook write serialization (BlockingQueue/executor and `Channel<T>` per their standards).
- `queue_depth` in `lock-status` responses must reflect the real pending depth; enforce queue capacity with `503 SERVICE_BUSY` when the contract declares it.
- The dead debounce no-op callback in Node's queue must become real batching or be removed as part of the wiring.

## Hints

- Node `src/queue/writeQueue.ts` exists with promise-chain serialization; Java and C# have the documented queue slots in SPECIFICATION but need implementation.
- Integration coverage lands in `integration-test-suite`.

## Out of Scope

- Nothing about single-record writes changes beyond queue wiring.
