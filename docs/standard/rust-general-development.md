# Rust General Engineering Standards

<!-- Standards set: rust-general-development.md@0.1.5 | Date: 2026-10-25 -->

## Purpose

This document defines the general engineering standard for Rust projects.

It covers the language edition, the project layout, the coding conventions,
the analyzer configuration, the test setup, and the build.

Rules specific to an application stack live in sibling standards:
the Rust API standard for HTTP services on Tokio, the Rust MCP standard for MCP servers,
the Rust SQLite standard for SQLite storage, and the OpenAPI standard for API contracts.

It is written to be executed directly by an AI coding agent and to be read without effort by a human
reviewer.

## Scope

A project is in scope when all of the following conditions hold.

- The project is built with the Rust toolchain and uses Cargo.
- The output is a library, a binary, a workspace of crates, or a combination.
- The build entry point is `cargo build`.

A project that targets embedded firmware with `no_std` and a custom allocator is out of scope unless
the project rules file explicitly includes it,
because embedded Rust has additional constraints that this document does not cover.

## How To Use This Standard

This section is the entry point for an agent.

Read it before reading anything else in this document.

**Order Of Operations**

Follow these steps in order at the start of every task that touches Rust code.

1. Read the project rules file, such as `AGENTS.md`, `README.md`, or `docs/GUIDELINES.md`,
   because a project rule overrides this standard.
2. Determine the Rust edition, the workspace layout,
   and the async runtime using the Agent Intake Protocol below.
3. Confirm the conclusion with the user when the repository is ambiguous or empty.
4. Apply the sections of this standard that match the confirmed project kind.
5. Run every applicable row of the Verification section.
6. Check the result against the Definition of Done before reporting the task complete.

**Precedence**

When two rules conflict, apply the first matching source in this list.

| Rank | Source                                    | Example                                      |
|------|-------------------------------------------|----------------------------------------------|
| 1    | An explicit instruction from the user     | "Keep this crate on edition 2021"            |
| 2    | The project rules file                    | `AGENTS.md`, `docs/GUIDELINES.md`            |
| 3    | The existing convention in the repository | `anyhow` already used in the binary crate    |
| 4    | This standard                             | `thiserror` for library error types          |
| 5    | General Rust best practice                | Anything the four sources above do not cover |

Never silently reformat existing code to match this standard.

A whole-repository reformat destroys review history and hides the real change inside noise.

Bring a deviation to the user as a proposal, not as an unrequested edit.

**Non-Negotiable Rules**

- **Every fallible function returns `Result<T, E>`.** A `panic` in library code is a defect.
- **No `unwrap` or `expect` in library code outside `#[cfg(test)]` modules.** Use `?` for
  propagation and pattern matching for extraction.
  Test code and test-only helpers are exempt, because a test is expected to fail loudly.
- **No silently discarded `Result`. ** Propagate with `?`, handle explicitly,
  or log a warning before skipping the item.
  `filter_map(|r| r.ok())` hides corruption as an empty result set.
- **Every `unsafe` block carries a `// SAFETY:` comment.** A block without a safety justification is
  a defect.
- **No global mutable state.** State flows through function parameters and struct fields,
  not through `static mut`.
- **`cargo fmt --check` produces no diff.** Unformatted code is a defect.
- ** `cargo clippy` produces no warnings.** A clippy warning is either fixed or suppressed with a
  written reason.
- **`Cargo.lock` is committed for binaries.** A binary build that cannot reproduce is a defect.

A violation of any of these rules is a defect, not a style preference.

## Agent Intake Protocol

**Detection First**

Before asking the user anything, inspect the repository and infer the project shape.

| Signal Found In The Repository                | Inferred Decision                     | Confidence |
| --------------------------------------------- | ------------------------------------- | ---------- |
| `rust-toolchain.toml` with `channel = "1.89"` | Rust 1.89+, edition 2024 available    | High       |
| `Cargo.toml` with `edition = "2024"`          | Rust 2024 edition in use              | High       |
| `Cargo.toml` with `edition = "2021"`          | Rust 2021 edition in use              | High       |
| `[workspace]` in root `Cargo.toml`            | Workspace layout with multiple crates | High       |
| Single `Cargo.toml` at root, no workspace     | Single-crate project                  | High       |
| `tokio` in `Cargo.toml` dependencies          | Async runtime is tokio                 | High       |
| `anyhow` in binary crate only                 | Application error handling with anyhow | High       |
| `thiserror` in library crates                 | Library error types with thiserror     | High       |
| `#![no_std]` in any crate                     | Embedded or `no_std` target            | High       |
| No Rust files at all                          | New project                            | High       |

**Existing Project**

When detection is confident, state the conclusion and ask for a single confirmation rather than
running a questionnaire.

Example: "I see edition 2024 in `Cargo.toml`, a workspace with `core`, `io`, and `app` crates,
and `tokio` in the `app` crate.

I will follow the workspace layout, keep edition 2024, and maintain the existing tokio usage.

Is that correct?"

When detection is ambiguous, ask only the questions that resolve the ambiguity.

**New Project**

When the repository is empty or the user declares a new project, ask the following questions.

| Question                   | Options                    | Default If Declined |
|----------------------------|----------------------------|---------------------|
| Which Rust edition?        | Edition 2024, Edition 2021 | Edition 2024        |
| Single crate or workspace? | Single, Workspace          | Workspace           |
| Is this async?             | Yes, No                    | No                  |
| Which async runtime?       | tokio, none                | tokio               |
| Library, binary, or both?  | Library, Binary, Both      | Both                |

## Documentation

The following are the authoritative sources for Rust development.

- [The Rust Programming Language](https://doc.rust-lang.org/book/) - official book.
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) - API design best practices.
- [Rust Reference](https://doc.rust-lang.org/reference/) - language reference.
- [Rustnomicon](https://doc.rust-lang.org/nomicon/) - `unsafe` Rust guidance.
- [Cargo Reference](https://doc.rust-lang.org/cargo/) - build system and package manager.
- [Rust Edition Guide](https://doc.rust-lang.org/edition-guide/) - edition migration and changes.
- [Clippy Lint List](https://rust-lang.github.io/rust-clippy/master/) - lint catalogue.

## Language Version

The project targets Rust 1.89 or later with edition 2024 - a floor naming the
minimum recommended version, never the concrete pin, because a patch release
carries security fixes the project should take automatically.

Rust 1.85 stabilized the Rust 2024 edition in February 2025.

New projects use edition 2024 unless the project rules file specifies otherwise.

Existing projects on edition 2021 may migrate when ready,
because the edition change is opt-in and does not break existing code.

Pin the toolchain in `rust-toolchain.toml` at the workspace root so the build is reproducible.

```toml
[toolchain]
channel = "1.89"
components = ["rustfmt", "clippy"]
```

`channel = "stable"` follows the latest release, so it cannot enforce a minimum version.

Pin the lowest version the project supports,
because a lower toolchain then fails at toolchain resolution instead of at a confusing compile
error.

The pinned version must equal the real dependency floor,
which the lockfile's `rust-version` requirements determine.

Run the verification loop under the pinned toolchain, not the newest installed one,
because lint sets differ between releases and a clean check on a newer toolchain can hide warnings
the pinned one reports.

Edition 2024 reserves additional keywords, including `gen`.

When a trait method signature or a third-party API names a parameter `gen`,
as manual `JsonSchema` implementations for `schemars` do,
the identifier must be written in raw form,
for example `fn json_schema(r#gen: &mut schemars::r#gen::SchemaGenerator)`.

A compile error reading `expected identifier, found reserved keyword` after an edition bump is this
rule, not a broken dependency.

## Project Structure

A Rust project is a Cargo workspace with one library crate per module and one or more binary crates
as entry points.

```plaintext
/
  Cargo.toml              Workspace manifest
  rust-toolchain.toml     Toolchain pin
  rustfmt.toml            Formatter configuration
  core/
    Cargo.toml
    src/
      lib.rs
      engine.rs
      state.rs
  io/
    Cargo.toml
    src/
      lib.rs
  config/
    Cargo.toml
    src/
      lib.rs
  app/
    Cargo.toml
    src/
      main.rs
  target/                 Build output, gitignored
```

One `.rs` file per logical unit.

Split a file when a module exceeds approximately 300 lines,
because a file that large usually mixes responsibilities.

When splitting a file, move code verbatim into the new module and adjust visibility afterwards.

Cut every block at an item boundary that includes the item's `#[derive]`, `#[cfg]`, and doc
attributes - they precede the item, so a boundary drawn at the `pub` or `fn` line orphans
them in the previous block.
Verify boundaries against the `pub`/`fn`/`impl` marker lines before cutting, because
splitting by line count alone produces files that do not compile.
When a scripted or line-number-driven move corrupts a file, revert it (`git checkout`)
and retry at correct item boundaries instead of patching the damage forward.

Retyping declarations during a move can silently drop trait impls, derives, and bounds,
so compile immediately after every move and let unused imports and missing impls surface at once.

Unit tests live in the same file as the implementation inside `#[cfg(test)]` modules.

Integration tests go in a `tests/` directory within the relevant crate.

No circular dependencies between crates.

A repository may also contain several independent crates with no root workspace manifest.

In that layout each crate directory is its own build root,
and every command in this standard runs once per crate directory rather than once with
`--workspace`.

A small project may also live in a single binary crate with no workspace manifest at all.
Inside a single crate the same split rule applies to directories:
when a flat module file grows past the threshold, it becomes a directory holding `mod.rs`
plus one file per concern (`config/`, `auth/`),
and the entry file keeps only the composition root and shared types.
Helpers shared only between the sibling files of such a directory use `pub(super)` or
`pub(crate)` visibility, so the crate's public surface does not widen during a split.

**Workspace Manifest**

```toml
[workspace]
members = ["core", "io", "config", "app"]
resolver = "2"

[workspace.package]
edition = "2024"
rust-version = "1.89"

[workspace.lints.clippy]
pedantic = "warn"
nursery = "warn"
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
```

The `resolver = "2"` setting uses the feature resolver introduced in Rust 1.51,
which avoids unifying features across targets.

## Naming Conventions

Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/).

| Element                      | Convention           | Example                      |
|------------------------------|----------------------|------------------------------|
| Types, traits, enum variants | `PascalCase`         | `Client`, `Store`, `Error`   |
| Functions, methods, modules  | `snake_case`         | `fetch_byte`, `cycle_count`  |
| Constants and statics        | `UPPER_SNAKE_CASE`   | `CLOCK_HZ`, `BUFFER_SIZE`    |
| Crate names                  | `snake_case`         | `myapp_core`, `myapp_io`     |
| Type aliases                 | `PascalCase`         | `Byte`, `Word`, `Address`    |
| Source files                 | `snake_case.rs`      | `memory_bus.rs`, `engine.rs` |
| Module entry points          | `mod.rs` or `lib.rs` | `core/mod.rs`, `io/lib.rs`   |

## Code Conventions

**Integer Types**

Define type aliases for domain primitives in a shared crate and use them throughout,
because raw `u8` and `u16` values carry no semantic meaning.

```rust
pub type Byte = u8;
pub type Word = u16;
pub type Address = u16;
```

Never use `usize` for domain values where the width matters,
because `usize` differs between 32-bit and 64-bit targets.

Use explicit casts, because Rust forbids implicit numeric conversions.

**Traits for Abstraction**

Model component interfaces as traits, because a trait is the Rust mechanism for polymorphism without
inheritance.

```rust
pub trait Clocked {
    fn tick(&mut self);
}

pub trait IoDevice {
    fn read(&mut self, port: u8) -> u8;
    fn write(&mut self, port: u8, value: u8);
}
```

Depend on traits at module boundaries through `&dyn Trait` or `impl Trait` rather than concrete
types, so tests can substitute an in-memory fake for the real implementation.

A unit that cannot be tested without heavy infrastructure is a design flaw to fix,
not to work around.

**Ownership and Borrowing**

Prefer owned values and references over `Rc` and `Arc`,
because ownership is cheaper than reference counting.

Use `Arc<Mutex<T>>` only when shared mutable state across threads is required.

Avoid `clone()` in performance-critical paths,
because a clone is an allocation that may not be necessary.

**Visibility**

Use the narrowest visibility that satisfies the call sites.

`pub` is reserved for items that form the crate's public API.

Internal helpers, modules, and wiring use `pub(crate)` or private visibility,
because a `pub` item is a contract that callers and reviewers must treat as stable.

**Parameter Lists**

When a function accumulates shared operation parameters (roughly five or more, or enough to trip
`clippy::too_many_arguments`), bundle them into a context struct passed by reference rather than
growing the parameter list.

**Error Handling**

Every fallible function returns `Result<T, E>`.

Keep `std::process::exit` and stderr or stdout output at the outermost layer of a binary,
such as `main`.

Validation and setup helpers return `Result` and let the caller print and exit,
because logic that exits the process inline cannot be unit-tested.

Never silently discard a `Result`.

Propagate it, handle it explicitly, or log a warning and skip the item,
because a dropped error makes corrupt data indistinguishable from an empty result.

Use `thiserror` for library error types, because callers need to match on specific variants.

```rust
#[derive(Debug, thiserror::Error)]
pub enum EngineError {
    #[error("invalid opcode {opcode:#04x} at {address:#06x}")]
    InvalidOpcode { opcode: u8, address: u16 },

    #[error(transparent)]
    Io(#[from] std::io::Error),
}
```

Use `anyhow` for application and binary crates,
because the binary does not need to match on error variants and `anyhow::Context` adds readable
context to every propagation.

```rust
use anyhow::Context;

fn read_config(path: &str) -> anyhow::Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read config from {path}"))?;
    Ok(serde_json::from_str(&content)?)
}
```

Never leak `anyhow::Error` through a library boundary,
because it erases the error type and strips callers of the ability to branch on the failure.

Typed error enums do not implement `From<anyhow::Error>` implicitly.

Convert an `anyhow` result with `map_err` at the boundary instead of relying on `?` to convert,
for example `.map_err(|e| MyError::Backend(e.to_string()))`.

Use `?` for error propagation.

Never use `unwrap` or `expect` in library code outside `#[cfg(test)]` modules,
because a panic in a library is a defect.

Use `expect` in binary crates only in `main` or test setup,
and only with a message that states why the value is guaranteed to be present.

**Validated Deserialization**

Configuration files are deserialized strictly,
because a typo that silently becomes a default is a misconfiguration that behaves like a feature.

Reject unknown keys with `#[serde(deny_unknown_fields)]` on the deserializable shape,
noting that the attribute applies to `Deserialize` only.

When fields need validation beyond the schema shape, deserialize into a plain raw struct,
convert to the domain type, and surface failures through `serde::de::Error::custom`, so enum values,
ranges, and cross-field rules are enforced at load time rather than first use.

```rust
impl<'de> Deserialize<'de> for RemoteConfig {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let def = RemoteConfigDef::deserialize(d)?;
        let parsed = RemoteConfig::try_from(def).map_err(serde::de::Error::custom)?;
        Ok(parsed)
    }
}
```

Deriving `Serialize` on a struct requires `Serialize` on every field type.

Custom enums serialized as strings implement `serialize_str` over a canonical `as_str`,
and the matching strict parse implements `Deserialize` or `FromStr` so the two directions cannot
drift.

`serde_json::Error` and `serde_yaml::Error` are distinct types.

When several formats map into one error enum, convert explicitly in `map_err`,
because a bare `#[from]` variant only matches the error type it wraps.

**Optional Features**

An optional subsystem is configured by an explicit path or by auto-discovery of a conventional
default file.

An explicit path that does not resolve is a hard error,
because a silently ignored path hides a typo.

A conventional default file is loaded only when it exists,
and its absence means the feature is off rather than a failure.

For intervals, counts, and timeouts, `0` is the conventional disabled sentinel and the code treats
it as "never run" rather than "run instantly".

**Resource Acquisition**

Open and configure shared resources through a single internal constructor,
such as one function that opens a database connection and applies its pragmas.

When several modules each repeat the same setup, the configuration can drift between copies.

When one-time setup must complete before a shared resource is usable, gate it on the same
synchronization primitive that publishes the resource - for example, populate an `OnceLock` only
after the gated work finishes - so no caller can check out an uninitialized resource.

**Unsafe Code**

`unsafe` blocks are forbidden unless strictly required for FFI or performance-critical raw pointer
operations.

Every `unsafe` block must carry a `// SAFETY:` comment stating the upheld invariant,
because a reviewer who cannot see the invariant cannot verify the safety.

AI-generated code containing `unsafe` requires mandatory human review before merge.

**Concurrency**

Use `std::thread` for CPU-bound parallelism.

Use `tokio` for async concurrency, because `tokio` is the maintained and widely-adopted async
runtime.

`async-std` is unmaintained and should not be used in new projects.

Share state across threads via `Arc<Mutex<T>>` or `Arc<atomic>` types.

Acquire a `Mutex` with `lock().unwrap_or_else(|e| e.into_inner())` when the guarded data must stay
readable after a panicked writer, because a poisoned lock otherwise wedges every subsequent caller.

When a critical section ends with a mutation and a persist step, order the work as mutate,
clone the result, persist, then return the clone.

Persisting while a mutable borrow taken from the same guard is still live fails the borrow checker,
and re-borrowing after the lock is dropped is the clean fix.

Do not use `unsafe` for concurrency, because the standard synchronisation primitives are correct and
`unsafe` concurrency is a source of undefined behaviour.

Rules for running async services on a Tokio runtime - the `spawn_blocking` boundary,
reactor-context requirements, per-resource task serialization,
and task shutdown - are defined in the Rust API standard.

**Async Functions in Traits**

`async fn` in traits is stable since Rust 1.75.

Use it directly in trait definitions when the trait does not need dyn-dispatch.

For dyn-dispatchable async traits, use the `async-trait` crate or return `Pin<Box<dyn Future>>`
explicitly, because native `async fn` in traits does not yet support dyn dispatch.

**Embedded Resources**

Embed assets that are part of the binary, such as a fixed schema or template file, with
`include_str!` or `include_bytes!` rather than loading them at runtime, because a compile-time
asset cannot be missing at startup.

**Error Enums and Unsafe Contracts**

Domain errors derive `thiserror::Error` so variants carry their message and source:

```rust
#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Resource with ID {0} not found")]
    NotFound(String),
    #[error("IO failure: {0}")]
    Io(#[from] std::io::Error),
}
```

Every `unsafe` block carries a `// SAFETY:` comment that states the upheld invariant:

```rust
pub struct ByteSlice<'a> {
    ptr: *const u8,
    len: usize,
    _marker: std::marker::PhantomData<&'a [u8]>,
}

impl<'a> ByteSlice<'a> {
    pub fn as_slice(&self) -> &'a [u8] {
        // SAFETY: ptr is guaranteed non-null, properly aligned, and points to
        // len initialized bytes for the lifetime 'a by the constructor invariant.
        unsafe { std::slice::from_raw_parts(self.ptr, self.len) }
    }
}
```

`.unwrap()` and `.expect()` are forbidden outside `#[cfg(test)]` modules.

## Formatting and Linting

**rustfmt**

Enforce `rustfmt` in CI.

Configuration in `rustfmt.toml` at the workspace root.

```toml
edition = "2024"
max_width = 100
imports_granularity = "Crate"
group_imports = "StdExternalCrate"
```

Run `cargo fmt --check --all` in CI, which should produce no output.

**Clippy**

Enforce Clippy in CI with workspace-level configuration in `Cargo.toml`.

```toml
[workspace.lints.clippy]
pedantic = "warn"
nursery = "warn"
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
```

Run `cargo clippy --workspace --all-targets -- -D warnings`, which should produce no output.

For a single crate or a crate outside a workspace, the equivalent configuration lives under
`[lints.clippy]` in that crate's `Cargo.toml`.

A suppressed lint carries a `#[allow(clippy::lint_name)] // REASON:` attribute,
because a suppression without a reason is repeated by accident.

## Testing

**Unit Tests**

Tests live in `#[cfg(test)]` modules in the same file as the implementation.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fetch_byte_returns_correct_value() {
        // arrange
        // act
        // assert
        assert_eq!(result, expected);
    }
}
```

**Property-Based Tests**

Use `proptest` for exhaustive state-space coverage,
because property tests find edge cases that hand-written tests miss.

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn fetch_byte_never_panics(addr in 0u16..=0xFFFF) {
        let result = fetch_byte(addr);
        prop_assert!(result <= 0xFF);
    }
}
```

Add `proptest` to `[dev-dependencies]` in the relevant crate's `Cargo.toml`.

```toml
[dev-dependencies]
proptest = "1"
```

**Documentation Tests**

Public API items include an `# Examples` section.

Doctests run as part of `cargo test`.

```rust
/// Returns the high byte of a 16-bit word.
///
/// # Examples
///
/// ```
/// use myapp_core::high_byte;
/// assert_eq!(high_byte(0xABCD), 0xAB);
/// ```
pub fn high_byte(word: u16) -> u8 {
    (word >> 8) as u8
}
```

**Requirements**

Every public function has at least one unit test.

Tests cover normal cases, boundary values, and error paths.

Integration tests are placed in `tests/` within the crate, separate from unit tests.

Async tests use the runtime's test macro such as `#[tokio::test]`.

Do not use `futures::executor::block_on` to drive async code in tests.

**Interface Changes**

Adding a parameter to a trait method fans out to every implementation and every test stub,
and adding a field to a literal-constructed struct fans out to every constructor site including test
helpers.

Search for all impls, call sites, and literal initializers before declaring the change complete,
because `E0050` and `E0063` errors surface in test targets last.

A dead-code warning on a freshly added helper usually means the call site was never wired,
so finish the wiring rather than deleting the helper.

A `#[cfg(test)]` item still produces a dead-code warning when no test uses it,
so either write the test or remove the item.

Static lists that mirror the public surface,
such as route tables and tool manifests asserted by contract tests,
are updated in the same change that adds the surface, or the contract test fails on the next run.

**Fixture Realism**

When a writer produces generated framing such as YAML front matter or headers,
a reader returns the full document, so tests assert `contains` or parse the structure rather than
comparing for equality.

Directories a fixture needs are created with `create_dir_all`,
because lazily created paths do not exist until the first real write.

Path separators are platform-specific, so a traversal test that uses `..\` only exercises Windows
semantics and silently passes a legal filename on Unix.

Return values marked `#[must_use]` in tests, such as `.into_response()`,
are consumed by an assertion or an explicit `let _ =`,
because an unused `must_use` result is a clippy error.

Place imports that are used only by tests inside the `#[cfg(test)]` module.

An import needed only under `cfg(test)` produces an `unused_imports` warning in a non-test build
when it sits at file scope.

A `#[cfg(test)]` module sees its parent's imports through `use super::*`,
so the parent module does not need to import for the tests.

Test-support code such as fakes and fixtures lives behind `#[cfg(test)]`, for example
`#[cfg(test)] pub mod fake;`, so it never compiles into a production build.

**Running Tests**

```bash
cargo test --workspace              # Run all tests
cargo test --workspace --release    # Run tests in release mode
cargo test --doc                    # Run documentation tests only
```

A `cargo test` invocation accepts a single name filter.

To exercise several filters, run several invocations.

A package name and a `[[bin]]` name can differ.

Check the manifest before `cargo run --bin`, `cargo test --bin`, or building a named target.

## Build

Cargo handles cross-platform compilation without additional configuration.

```bash
cargo build --workspace --release
```

**Platform Notes**

- Windows: use the `stable-x86_64-pc-windows-msvc` toolchain target.
- macOS: universal binary requires building separately for `aarch64-apple-darwin` and
  `x86_64-apple-darwin` and combining with `lipo`.
- Linux: statically linked binary available via `x86_64-unknown-linux-musl` target.

```bash
# Linux static binary
cargo build --release --target x86_64-unknown-linux-musl

# macOS universal binary
cargo build --release --target aarch64-apple-darwin
cargo build --release --target x86_64-apple-darwin
lipo -create -output app \
    target/aarch64-apple-darwin/release/app \
    target/x86_64-apple-darwin/release/app
```

## Dependencies

All dependencies are declared in `Cargo.toml`.

Shared versions are pinned at the workspace level using `[workspace.dependencies]`.

```toml
[workspace.dependencies]
thiserror = "2"
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
clap = { version = "4", features = ["derive"] }
proptest = "1"
```

Each crate references the workspace dependency with `dep.workspace = true`.

```toml
[dependencies]
thiserror.workspace = true
serde.workspace = true

[dev-dependencies]
proptest.workspace = true
```

Review `Cargo.toml` periodically for unused dependencies, for example with `cargo-udeps`.

**Per-Crate Assignment**

| Crate              | Dependencies      |
|--------------------|-------------------|
| `config`           | `serde`, `clap`   |
| `app` (binary)     | `tokio`, `anyhow` |
| All library crates | `thiserror`       |
| All crates (dev)   | `proptest`        |

**Security Auditing**

Run `cargo audit` in CI to check for known vulnerabilities in dependencies.

Run `cargo deny check` to enforce license compliance and ban specific crates.

## Verification

Run the applicable checks after each structural change, not only once at the end.

Fix the first diagnostic before later ones,
because a single missing import or type error often produces several cascading diagnostics
downstream.

After scripted or bulk edits, run the build immediately,
because replacements and range deletions can hit adjacent code with a matching shape.

In a repository with several independent crates and no workspace manifest, run every check once
per crate directory.

| Check                      | Command Or Method                                       | Applies To       |
|----------------------------|---------------------------------------------------------|------------------|
| Code is formatted          | `cargo fmt --check --all`                               | All Rust files   |
| Lint is clean              | `cargo clippy --workspace --all-targets -- -D warnings` | All Rust files   |
| Tests pass                 | `cargo test --workspace`                                | All crates       |
| Doctests pass              | `cargo test --doc`                                      | All public APIs  |
| Build succeeds             | `cargo build --workspace --release`                     | All crates       |
| No vulnerable dependencies | `cargo audit`                                           | All dependencies |
| License compliance         | `cargo deny check`                                      | All dependencies |
| No `unsafe` without SAFETY | Grep for `unsafe` and verify `// SAFETY:`               | All Rust files   |
| No `unwrap` in src         | `grep -r -n "\.unwrap()" src/` must be zero             | All Rust files   |

## Definition of Done

**Correctness**

- Every function compiles without warnings.
- Every fallible function returns `Result<T, E>`.
- No `unwrap` or `expect` was introduced outside `#[cfg(test)]` code.
- No `Result` is silently discarded.
- Async paths contain no blocking calls.
- Every `unsafe` block carries a `// SAFETY:` comment.
- Tests cover normal cases, boundary values, and error paths.

**Structure**

- The workspace layout matches the confirmed project kind.
- No circular dependency was introduced.
- No file exceeds approximately 300 lines without a justification.
- Every crate has a module-level doc comment in `lib.rs` or `main.rs`.
- No item is `pub` where `pub(crate)` or private visibility suffices.
- Imports used only by tests live inside `#[cfg(test)]` modules.

**Quality**

- `cargo fmt --check --all` produces no output.
- `cargo clippy --workspace --all-targets -- -D warnings` produces no output.
- Every suppression carries a `// REASON:` or `#[allow(...)] // REASON:` comment.
- No debugging output or commented-out code remains.
- Comments explain reasons, not actions.

**Hygiene**

- `Cargo.lock` is committed for binary crates.
- `target/` is gitignored.
- `cargo audit` reports no vulnerabilities.
- File renames were done with `git mv` or an equivalent tracked move,
  because a delete-plus-add pair loses history.
- No secret, token, or credential was committed.
- Documentation was updated when the change altered the public API, the build, or a project rule.

## General Principles

**Single Responsibility.** One crate does one thing and its name says which thing.

**Zero-Cost Abstractions.** Prefer compile-time guarantees over runtime checks,
because the type system is free at runtime.

**No Global State.** Every piece of state reaches a type through a constructor or a parameter.

**Explicit Error Handling.** Every error is a `Result`, never a panic in library code.

**Ownership Over Reference Counting.** Prefer owned values and borrows over `Rc` and `Arc`,
because ownership is cheaper and clearer.

**Safety Is Documented.** An `unsafe` block without a `// SAFETY:` comment is a defect,
not a shortcut.

**Standard Library First.** Add a dependency only when the standard library is genuinely
insufficient.

**Zero Warnings.** A clippy warning or a compiler warning is either a defect or a rule the project
does not want, and both cases require an action.

## Fed Patterns

**Subprocess Execution**

`std::process::Command` is a builder: arguments are added per call and execution starts only at
`output()`, `spawn()`, or `status()`.

Build argument lists programmatically and never interpolate values into a shell command string,
because a spawned `Command` does not invoke a shell and quoting through one reintroduces injection.

Check `status.success()` to judge the outcome, because a non-zero exit code arrives as a
successful `Ok(output)` - only a spawn failure produces `Err`.

Capture and inspect both `stdout` and `stderr`, because tools such as `git` write load-bearing
diagnostics to either stream on failure.

Run commands against a working tree with `git -C <dir>` or `current_dir`, and pass tool
credentials through the environment (for example `GIT_SSH_COMMAND`) rather than through arguments.

Reject a caller-supplied value that lands in a positional argument slot when it is empty or
begins with `-`, because the value would be parsed as a flag by the child process.

**Secret Material**

A secret never travels through process arguments, because argument lists are visible in process
listings and crash reports.

Read secrets from environment variables or the OS credential store, and fall back to a
non-echoing prompt (`rpassword`) when interaction is acceptable.

When a deprecated flag still accepts a secret, keep it working but print a warning that names the
safer channel, so scripts migrate without breaking.

Never write secrets, tokens, or key material to logs, diagnostics, or files the user did not
designate for them.

**Version Reporting**

Report the program version from `env!("CARGO_PKG_VERSION")`, so `--version` output, protocol
handshakes, and health responses share the manifest as their single source of truth.

**Edition 2024 Notes**

Let chains collapse nested `if let` ladders into one condition, for example
`if let Some(ref url) = settings.repository && strategy.does_pull()`.

When test code needs `unwrap` or `panic` exemptions, grant them once at the crate root with
`#![cfg_attr(test, allow(clippy::unwrap_used, clippy::expect_used, clippy::panic))]` instead of
scattering per-module attributes.

Tests that read or mutate process environment variables use `temp-env` or an equivalent scoped
setter, because parallel tests share one environment and pollute each other's reads.

When a dependency is archived or abandoned, migrate to the maintained fork or successor as a
deliberate change recorded in the project's decisions document - `serde_yaml` to `serde_yaml_ng`
is the canonical example - instead of letting an unmaintained crate linger silently.

## Sources

The following authoritative references support the rules in this document.

- [The Rust Programming Language](https://doc.rust-lang.org/book/) - the ownership, borrowing,
  and trait model the conventions build on.
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) - the library-team checklist
  for naming, documentation, error types, and interoperability.
- [The Rust Reference](https://doc.rust-lang.org/reference/) - the normative language semantics,
  including editions and keywords.
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) - the `unsafe` contract behind the
  `// SAFETY:` comment rule.
- [The Cargo Book](https://doc.rust-lang.org/cargo/) - manifests, features, workspaces,
  and profiles.
- [The Edition Guide](https://doc.rust-lang.org/edition-guide/) - edition mechanics,
  including the edition-2024 `gen` keyword reservation.
- [Clippy Lints](https://rust-lang.github.io/rust-clippy/master/) - the lint catalogue behind the
  zero-warnings rule.
- [rustfmt](https://github.com/rust-lang/rustfmt) - the formatter and its configuration surface.
- [Error Handling in Rust](https://doc.rust-lang.org/book/ch09-00-error-handling.html) - `Result`,
  `panic!`, and recoverability, where `thiserror` and `anyhow` conventions follow the API
  guidelines.

## Project Conventions

- `excel-api-rust/` is a single crate, not a workspace - `src/` for code,
  `tests/` for integration tests.
- `Cargo.toml` pins `edition` and `rust-version` explicitly; the crate
  `version` field is synchronized with the project version per
  `docs/VERSIONING.md`.
- Dependencies stay minimal and deliberate - the shared contract fixes
  behavior, the crate choices inside the crate are free within this
  standard.
