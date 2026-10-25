# Rust API Development Standards

<!-- Standards set: rust-api-development.md@0.1.3 | Date: 2026-10-26 -->

## Purpose

This document defines the engineering standard for HTTP services written in Rust with the axum
framework and the tower middleware stack.

It covers the handler layout, the router and state composition, the error mapping, the request
and response data transfer objects, the blocking-work boundary, and the authentication surface.

It is written to be executed directly by an AI coding agent and to be read without effort by a
human reviewer.

For general Rust conventions such as naming, error types, and module layout,
see the general Rust standard.

For the API contract itself, see the OpenAPI standard.

## Scope

A project is in scope when all of the following conditions hold.

- The project exposes an HTTP API implemented with axum.
- The service runs on a Tokio runtime.
- Handlers perform request validation, call a domain layer, and return typed responses.

A project that uses a different HTTP framework such as actix-web or warp is out of scope, because
the extractor and middleware model differs.

## How To Use This Standard

This section is the entry point for an agent.

Read it before reading anything else in this document.

**Order Of Operations**

1. Read the project rules file, such as `AGENTS.md`, `README.md`, or `docs/GUIDELINES.md`, because
   a project rule overrides this standard.
2. Read the general Rust standard for the shared language conventions.
3. Identify the router composition point and the shared state type in the project.
4. Apply the sections of this standard that match the task.
5. Run the verification steps declared by the project rules before reporting the task complete.

**Precedence**

When two rules conflict, apply the first matching source in this list.

| Rank | Source                                    | Example                                      |
|------|-------------------------------------------|----------------------------------------------|
| 1    | An explicit instruction from the user     | "Return 422, not 400"                        |
| 2    | The project rules file                    | `docs/GUIDELINES.md`                         |
| 3    | The existing convention in the repository | Error shape already used by other routes     |
| 4    | This standard                             | Handler-per-file layout                      |
| 5    | General HTTP API best practice            | Anything the four sources above do not cover |

**Non-Negotiable Rules**

- **No `.unwrap()` in request handlers.** A panic in a handler kills the request with no
  response - every fallible call maps to the shared error type.
- **No blocking call on a runtime worker thread.** Synchronous work goes through
  `tokio::task::spawn_blocking`, because a blocked worker starves every in-flight request.
- **All errors map through the shared `IntoResponse` type.**
  A route that formats its own error body drifts from the contract.
- **State is injected, never global.** `axum::extract::State` carries `Arc<AppState>` -
  a `static` cache or connection pool makes the handler untestable.
- **The OpenAPI contract and the router stay in sync.**
  A route that exists in code but not in the spec is a defect.

A violation of any of these rules is a defect, not a style preference.

## Agent Intake Protocol

**Detection First**

Before asking the user anything, inspect the repository and infer the service shape.

| Signal Found In The Repository     | Inferred Decision                | Confidence |
|------------------------------------|----------------------------------|------------|
| `axum` in `Cargo.toml`             | Axum HTTP service stack          | High       |
| `tokio` with `features = ["full"]` | Tokio async runtime              | High       |
| `tower-http` with `trace` feature  | Structured tracing middleware    | High       |
| `utoipa` or `aide` dependencies    | OpenAPI code-first documentation | High       |
| `sqlx` or `diesel` dependencies    | Database pooling layer           | High       |
| No `Cargo.toml` at all             | New project                      | High       |

**Existing Project**

When detection is confident, state the conclusion and ask for a single confirmation rather than
running a questionnaire.

Example: "I see Axum 0.8, Tokio full features, and `tower-http` trace middleware.

I will follow the existing router and error-type conventions.

Is that correct?"

When detection is ambiguous, ask only the questions that resolve the ambiguity.

**New Project**

When the repository is empty or the user declares a new project, ask the following questions.

| Question            | Options                           | Default If Declined |
|---------------------|-----------------------------------|---------------------|
| Database layer?     | SQLx, Diesel, none                | SQLx                |
| API documentation?  | Utoipa code-first, manual spec    | Utoipa              |
| Telemetry exporter? | tracing-subscriber, OpenTelemetry | tracing-subscriber  |

## Documentation

- axum API reference: https://docs.rs/axum
- tower middleware reference: https://docs.rs/tower
- tower-http utilities: https://docs.rs/tower-http
- HTTP semantics: https://www.rfc-editor.org/rfc/rfc9110
- Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457
- Tokio blocking guidance: https://tokio.rs/tokio/topics/bridging

## Language Version

The project targets Rust 1.85+ on the 2024 edition with Axum 0.8 and Tokio 1.40.

`Cargo.toml` pins `edition = "2024"` and the `rust-version` field.

On runtime upgrade, re-validate all rules against release notes before writing code.

## Project Structure

- One file per resource or route group under the API module, named for the resource in snake
  case, such as `src/api/document.rs`.
- One `mod.rs` that composes the `Router`, declares the shared state type, and mounts every
  route group.
- Request and response types live beside the handler that uses them unless three or more
  handlers share them, in which case they move to a sibling `types.rs` or `model.rs`.
- Route mounting must be conditional when a feature is optional: build the sub-router only when
  the feature is configured, and cover the absence with a test.

## Naming Conventions

- Handler functions use the verb-noun form of the operation, such as `create_document` or
  `list_remotes`.
- Request bodies are named `<Operation>Request` and response bodies `<Operation>Response` or a
  domain noun such as `RepoStats`.
- The shared state type is named `<Domain>State` and is constructed once at router composition.

## Code Conventions

**Handlers**

- Handlers are thin: extract input, call the domain layer, map the result to a response.
  Business logic belongs behind domain traits or services, never inside a handler.
- Extract validated input with axum extractors (`Path`, `Query`, `State`, `Json`) and reject
  malformed payloads automatically through `serde` validation or `garcon`-style validators.
- Return `Result<Response, ApiError>` or an equivalent project error type instead of building
  error responses inline in every handler.

**State and Dependencies**

- Shared dependencies travel in the state struct as `Arc`-wrapped values or trait objects, not
  as globals or `OnceCell` singletons.
- The state type is generic over the domain port where the project defines one, so tests can
  substitute a fake without feature flags.

**Error Handling**

- Define one error enum for the API surface that maps domain errors to status codes in a single
  `IntoResponse` implementation.
- Use stable machine-readable error fields (a `code` or `error` string plus `message`) so
  clients and contract tests do not depend on prose.
- Never leak internal error details (paths, SQL, stack traces) into response bodies.

**Authentication Surface**

- Default every route to authenticated, and opt a route out explicitly and document why.
- A liveness or health endpoint may stay unauthenticated when it reveals no sensitive data, and
  keep its payload minimal.
- Enforce authorization in a single well-defined layer (extractor, middleware, or the first
  lines of each handler) and cover the boundary with tests.

**Blocking Work**

- Never run blocking IO or CPU-heavy work directly in a handler or on the runtime worker
  thread.
  Offload with `tokio::task::spawn_blocking` or call domain APIs that already do so,
  because a blocked executor stalls every task on that worker.
- No `std::thread::sleep` and no synchronous I/O on the async path.
  A task that needs a blocking filesystem or subprocess call wraps that call in
  `spawn_blocking` too, so the worker thread stays free for other tasks.
- Streaming responses must yield the runtime between chunks instead of computing eagerly.

**Async Runtime Rules**

- `tokio::spawn` and `tokio::runtime::Handle::current()` require a reactor context that a
  `spawn_blocking` closure does not have.
  Capture a `Handle` while the code still runs inside async context and call
  `handle.spawn(...)` later, because spawning from a plain thread panics with "there is no
  reactor running".
- Code that reaches the runtime at any depth is exercised by `#[tokio::test]`, because
  `Handle::current()` panics on a plain `#[test]` thread.
- Serialize concurrent passes over the same mutable external resource, such as a git working
  tree or a single-writer store, with a per-entity `tokio::sync::Mutex` or an owned
  `Semaphore`, because two overlapping passes can corrupt shared state even when each pass is
  individually correct.
  Store the guard inside the entity that owns the resource so callers cannot bypass it.
- `JoinHandle::abort` cancels a task at the next yield point but cannot stop code running
  inside `spawn_blocking`, because blocking closures run to completion on a dedicated thread.
  Treat blocking work as non-abortable: shut down by signalling the task and awaiting
  `tokio::time::timeout` around the remaining work, then release resources explicitly.
- Replace a running scheduled task by aborting the old `JoinHandle` before storing the new
  one, because silently dropping the handle leaves the old task running.

**Async Functions in Traits**

- `async fn` in traits is stable since Rust 1.75.
  Use it directly in trait definitions when the trait does not need dyn-dispatch.
- For dyn-dispatchable async traits, use the `async-trait` crate or return
  `Pin<Box<dyn Future>>` explicitly, because native `async fn` in traits does not yet support
  dyn dispatch.

**Responses**

- Use `Json` with concrete `Serialize` types, not `serde_json::json!` literals, so response
  shapes are enforced by the compiler.
- Set explicit status codes for success variants that differ from 200, such as 201 for
  creation.
- Keep response field names snake_case and stable, and a rename is a breaking change that
  requires a contract update.

## Formatting and Linting

Follow the general Rust standard.

Handlers must compile with zero warnings under the project lint configuration.

## Testing

- Unit-test each handler against a fake of the domain port using `tower::ServiceExt::oneshot`
  or the project equivalent, asserting status code and body shape.
- Include permission-boundary tests: every protected route must have a test that an
  under-privileged principal is rejected.
- Include a router-level test for conditionally mounted routes asserting they are absent when
  the feature is disabled.
- Keep the OpenAPI contract test green whenever a route, field, or status code changes.
- Contract metadata such as `info.version` must stay in parity with the crate version, and a
  contract test should assert it, because a version bump in the manifest is easy to ship with a
  stale spec.

## Build

Follow the general Rust standard and the project rules file for build and verification commands.

## Dependencies

- Prefer `axum`, `tower`, `tower-http`, `serde`, `serde_json`, and `thiserror` as the baseline
  stack.
- Add middleware (tracing, compression, CORS, rate limiting) through `tower` layers rather than
  ad-hoc code inside handlers.

## Verification

| Check                   | Command Or Method                                                 | Applies To       |
|-------------------------|-------------------------------------------------------------------|------------------|
| Formatting clean        | `cargo fmt --check`                                               | All Rust files   |
| Clippy clean            | `cargo clippy --all-targets -- -D warnings`                       | Entire crate     |
| Tests pass              | `cargo test --all-targets`                                        | All test targets |
| No `unwrap` in handlers | `grep -r -n "\.unwrap()" src/` must be empty                      | All Rust files   |
| No blocking on async    | `grep -r -n "std::thread::sleep" src/` must be empty in async fns | Async boundary   |
| Build succeeds          | `cargo build --release`                                           | Release artifact |

## Definition of Done

**Correctness**

- New or changed routes are registered in the composed router and in the OpenAPI contract.
- Handlers contain no business logic beyond extraction, delegation, and response mapping.
- Error responses use the shared error type and stable machine-readable fields.

**Structure**

- One file per resource or route group under the API module.
- State is injected through `axum::extract::State`, never a `static`.

**Quality**

- No blocking call runs on a runtime worker thread.
- `cargo clippy` reports zero warnings.
- Every fallible call maps to the shared error type.

**Hygiene**

- Tests cover the happy path, validation failure, authorization failure, and mount-gating.
- No secret, token, or credential was committed.
- `cargo fmt --check` produces no diff.

## General Principles

**Never Block The Async Runtime.** A synchronous call on a worker starves every
in-flight request - `spawn_blocking` is the bridge.

**Custom Errors With `IntoResponse`.** One error type owns the wire format -
a route that formats its own body drifts from the contract.

**Type-Safe Extractors Always.** `State`, `Path`, `Query`, and `Json` carry the
request - `req.body()` is never parsed by hand.

**State Is Shared Through `Arc`.** `Arc<AppState>` at composition time -
interior mutability is explicit, never ambient.

**Graceful Shutdown Is Wired.** `axum::serve` binds a shutdown signal -
a SIGTERM during an in-flight write is not a failure mode.

**The Contract Is The Source.** The OpenAPI spec and the router describe the
same surface - a divergence is a defect.

**Middleware Through Layers.** Cross-cutting concerns are `tower` layers,
not handler code - ordering is declared, not implicit.

**Tests Run Without Ports.** `tower::ServiceExt` drives the router in-process -
a test that binds a port tests the OS, not the app.

## Fed Patterns

**Client Identity**

Read the client address from `ConnectInfo<SocketAddr>`, the real TCP peer.

Never trust `X-Forwarded-For` for security decisions, because the header is caller-supplied.

Copy the peer address into the request before the auth layer runs, so an unauthenticated caller
is still identified for admission decisions such as rate limiting.

**Rate Limiting**

Apply per-key token-bucket or window limits in middleware, with a stricter bucket on the
credential endpoint that checks secrets.

Deny with `429` plus a `Retry-After` hint so well-behaved clients can self-throttle.

Bound the limiter's in-memory state: sweep entries idle past a cutoff once the bucket map exceeds
a fixed ceiling.

Map routes to required permissions in one table or function, and let an unmapped path fall
through to the strictest permission so a newly added route is never silently unprotected.

Pass the authenticated principal to handlers through request extensions, so a handler reads
claims instead of re-parsing the token.

**Blocking Budget**

`spawn_blocking` is an escape hatch, not a compute scheduler - the blocking pool caps at 512
threads by default.

Bound bursty CPU work (embedding inference, hashing, batch transforms) with a
`tokio::sync::Semaphore` or batch aggressively, because one blocking call per request saturates
the pool under load.

A blocking pool checkout (`r2d2`'s `pool.get()`) blocks when the pool is saturated, so the
checkout belongs inside `spawn_blocking` as well.

One shared adapter such as `async fn blocking(f) -> Result<T, StatusCode>` centralizes the
offload plus the domain-error-to-status mapping, so handlers never spell out the join-error
plumbing.

**Listener Lifecycle**

Bind the `TcpListener` once, before loading TLS material, so a port conflict surfaces identically
in plain and TLS modes instead of sneaking between a check and the real bind.

Serve REST and protocol transports (SSE, MCP, metrics) on one listener when they share the port
contract, composing them as merged routers rather than separate servers.

Coordinate shutdown with a signal that every subsystem observes in its own `select!`: a
`oneshot` channel suffices for two subsystems, and `tokio_util::sync::CancellationToken` with
child tokens scales to more without coupling them.

Drain in-flight work inside a bounded `tokio::time::timeout`, then release resources explicitly,
and treat `spawn_blocking` work as non-abortable during the drain.

Add deterministic jitter to periodic tasks sharing an interval, so they do not fire in lockstep.

**Framework Versions**

axum 0.7 uses `/:param` and `/*rest` path syntax, axum 0.8 switched to `/{param}` and `/{*rest}`
and requires `Sync` handlers - a major-version bump is a deliberate migration, not a routine
`cargo update`.

## Sources

The following authoritative references support the rules in this document.

- [axum API Reference](https://docs.rs/axum) - routers, handlers, extractors,
  and the `tower::Service` middleware model.
- [axum Middleware Module](https://docs.rs/axum/latest/axum/middleware/) - `ServiceBuilder` ordering
  and layer application.
- [tower](https://docs.rs/tower) and [tower-http](https://docs.rs/tower-http)
  - the middleware and utility layers for timeouts, tracing, compression, and CORS.
- [Tokio](https://tokio.rs/) - the runtime,
  and [Bridging with sync code](https://tokio.rs/tokio/topics/bridging) for the blocking-call rules.
- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) - status codes, methods,
  and content negotiation the API contract follows.
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) - the error-response format.
- [tracing](https://docs.rs/tracing) - the structured instrumentation used for request
  observability.

## Project Conventions

- `excel-api-rust/` mirrors the sibling servers: `src/`, `tests/`,
  `Dockerfile` (non-root, digest-pinned base, `HEALTHCHECK` against
  `/health`), `config/config.example.yaml`, `README.md`.
- `umya-spreadsheet` is the mandated xlsx crate - `calamine` is read-only
  and `rust_xlsxwriter` rewrites from scratch, destroying formulas and
  styles the write queue must preserve.
- Lockfile protocol, write-queue batching, `config.yaml`/`access.yaml`
  schema, and the error-code vocabulary are contract-owned - the crate
  implements them, it does not reinterpret them.
- `resources/openapi.yaml` is a synced copy of `docs/contract/openapi.yaml`
  via `shell/sync-openapi.sh` - never edit it by hand.
- Verification ladder before reporting done: `cargo fmt --check`,
  `cargo clippy --all-targets -- -D warnings`, `cargo test`,
  `cargo build --release` - zero warnings.
