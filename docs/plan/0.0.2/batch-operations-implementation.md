# Batch Operations and Write Queue — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/batch-operations.md`

**Best Practices**: `docs/standard/ts-node-development.md`, `docs/standard/java-spring-maven-development.md`, `docs/standard/csharp-aspnet-development.md`. Contract: `docs/contract/openapi.yaml` `batchRecordOperations`/`batchCellOperations`, `BatchRecordRequest`/`BatchCellRequest`/`BatchResult`.

**Documentation Updates**: `docs/ARCHITECTURE.md` batch/queue section verified against the wired behavior; `docs/SPECIFICATION.md` queue modules per server.

**Step by Step Implementation**:

1. **Node: wire WriteQueue**
   - Initialize `initWriteQueue` at startup, enqueue write operations from routes, real `queue_depth` from queue length, debounce (`batch_debounce_ms`) and `batch_max_size` batching, `503 SERVICE_BUSY` at capacity.
   - Files: `excel-api-node/src/queue/writeQueue.ts`, `src/server.ts`, `src/routes/*`, `src/routes/lockStatus.ts`.

2. **Java: write queue**
   - Per-workbook `BlockingQueue` + single-thread executor (`WriteQueue`/`WriteOperation` per SPECIFICATION), serialized writes under the lockfile, depth tracking.
   - Files: `excel-api-java/.../queue/` (new or existing), `service/ExcelService.java` write paths, `controller/LockStatusController.java`.

3. **C#: write queue**
   - `Channel<T>`-based per-workbook queue with `QueueHostedService`/consumer, serialized under the lockfile, depth tracking.
   - Files: `excel-api-csharp/src/ExcelApi/Queue/` (new), `Services/ExcelService.cs`, endpoints.

4. **Batch endpoints ×3**
   - `POST .../operations` (record ops) and `POST .../cells/operations` (cell ops): apply the operation list within one lock+save cycle, return `BatchResult` per-op entries (`op`/`status`/`index`) with the contract's partial-failure semantics.
   - Files: route/controller/endpoint files per server + service-layer batch executors.

5. **Lock-status depth**
   - `queue_depth` reflects the real pending depth in all three.

**Testing Strategy**: Unit tests on queue batching/serialization per server; `integration-test-suite` adds the batch + concurrency specs.

**Verification**: `docs/TESTING.md` loop on all three servers + security gate.
