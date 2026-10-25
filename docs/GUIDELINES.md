# Excel API Development Guidelines

## Hard Rules

**Commit Messages**

- No prefix. Never `docs:`, `feat:`, `fix:`, `chore:`, `refactor:` or anything like it. Not ever. This applies globally to the entire repository.
- Always check `git status` to accurately describe what is being committed.
- Short and natural. Maximum 3 sentences.
- Single line. No word wrap. No line breaks.
- If using a single sentence, do not end with a trailing dot.
- If using multiple sentences, ensure each sentence is finished with a dot.

Examples:

- BAD: `docs: update architecture section`
- GOOD: `Add batch operations endpoint to API contract`

**Temporary Files**

- Always use the `work` directory for temporary files, test data, or local-only configurations.
- The `work` directory exists only at the repository root level. Never create `work/` subdirectories inside component directories.
- Never place temporary files in the repository root or source directories.
- The `work` directory is git-ignored and safe for local scratchpads.

**Git Commits**

- Do not commit unless specifically told to make commits automatically.

## Sources of Truth

- **Primary entry point (AI)**: `README.md`.
- **Guidelines**: This file (`docs/GUIDELINES.md`) is the central source of truth for AI-assisted development rules.
- **Project description and requirements**: `docs/PROJECT.md`.
- **Architecture and API contract**: `docs/ARCHITECTURE.md`.
- **Implementation details**: `docs/SPECIFICATION.md`.
- **OpenAPI specification**: `docs/contract/openapi.yaml`.
- **Copyright and licensing**: `docs/COPYRIGHTS.md`.
- **Documentation style**: `docs/STYLE.md`.
- **Documentation index**: `docs/README.md` - navigation index of the documentation set.
- **Agent entry**: `AGENTS.md` - thin router to this file.
- **Decision records**: `docs/decisions/` - empty until the first decision lands (N/A).
- **Workflow**: `docs/WORKFLOW.md`. It owns the change cycle covering `docs/change/<version>/`, `docs/plan/<version>/`, `docs/refactoring/<version>/`, `docs/report/`, and `docs/archive/`.
- **Refactoring process**: `docs/REFACTORING.md`.
- **Testing strategy**: `docs/TESTING.md`.
- **Deployment**: `docs/DEPLOYMENT.md`.
- **Versioning**: `docs/VERSIONING.md`.

**Development standards** (one per implementation language):

- `docs/standard/typescript-fastify-development.md` — TypeScript/Node.js
- `docs/standard/java-spring-development.md` — Java/Spring Boot/Maven
- `docs/standard/csharp-aspnet-development.md` — C#/ASP.NET
- `docs/standard/go-cli-development.md` — Go CLI
- `docs/standard/docker-general-development.md` — Docker
- `docs/standard/openapi-general-development.md` — OpenAPI contract
- `docs/standard/bash-inline-development.md` — Bash scripts
- `docs/standard/rust-general-development.md` — Rust general
- `docs/standard/rust-api-development.md` — Rust API server

## Documentation Purpose

The three core documentation files have distinct purposes for this multi-language project.

**PROJECT.md** is the project specification and requirements document. It defines the system overview, vision, goals, data model, components, API contract, and operations. This is the definitive source of truth for what the system must do and how it behaves at the specification level.

**ARCHITECTURE.md** describes the shared architecture and cross-implementation patterns. It defines the component diagram, request processing flow, authorization flow, queue and batching architecture, lockfile protocol, cache architecture, and other patterns that all implementations must follow. This document ensures consistency across the three interchangeable server implementations.

**SPECIFICATION.md** contains implementation-specific details for each component. It documents the technology stack, source layout, Excel library choices, known limitations, and queue implementation details for Node, Java, C#, Go, and the test suite. This file captures the differences and trade-offs between implementations.

The separation exists because this is a multi-language project with independent implementations sharing a common contract. A single monolithic document (as used in single-technology projects) would not adequately capture the implementation-specific variations while maintaining clarity on shared patterns.

## General Workflow

- Always read `README.md` and `docs/GUIDELINES.md` before making changes.
- Before starting any work, identify all guideline documents and read every relevant file. Never assume a subset is sufficient.
- **PROJECT.md is the definitive source of truth** for project scope, requirements, and goals. Always consult it before coding.
- **ARCHITECTURE.md is the definitive source of truth** for shared architecture, API contract, data model, and cross-implementation patterns.
- **SPECIFICATION.md is the definitive source of truth** for implementation-specific details, known limitations, and technology choices per component.
- For any implementation task, consult the corresponding standard in `docs/standard/` before writing code.
- Ask for clarification when requirements are missing or ambiguous.
- **Documentation Awareness**: Maintain full awareness of all guideline files and their specialized purposes. If any file is added, removed, or its purpose changes, update this file accordingly.

## Execution Policy

The project runs in human-in-the-loop mode.
The implementation plan is confirmed by the user before code is written.

Reserved decisions stay with the user in every mode:

- Commits - never made automatically.
- Release baseline - which tree state ships.
- Version bump - only on explicit request or inside the autonomous SDLC routine.

The autonomous SDLC routine in `docs/WORKFLOW.md` is the one sanctioned exception:
naming the routine delegates the routine's own gates, including the closing version bump.

## Community Posture

The project is not open to public contribution.
`CONTRIBUTING.md` and `SECURITY.md` are intentionally omitted - their absence is a decision, not a gap.

## Applying the change

These rules apply to every change made in this project. Follow them in order — do not skip steps.

**Understand the change**

- Read the request carefully.
- Identify all components, modules, and documentation files affected.
- All implementations must be consistent with the requested change.
- A change request covers every applicable implementation - Node, Java, and C# servers. A new feature lands in all supported implementations, not a subset.
- Version numbers stay synchronized across all components and the API specification.

**Write the change request**

- Every change requires a change request document before any other work starts.
- Create it in `docs/change/<version>/` where `<version>` is the current project version from `docs/VERSIONING.md`, or a future version the request names explicitly.
- Name it in kebab-case after the change (e.g., `range-endpoint-fix.md`).
- Describe what should change and why, not how to implement it. Follow the change request outline in `docs/WORKFLOW.md`.

**Write the implementation plan**

- Create the plan in `docs/plan/<version>/`, named after the change request with an `-implementation` suffix.
- Follow the implementation plan outline in `docs/WORKFLOW.md`.
- Reference the change request, the relevant standards in `docs/standard/`, and the documentation files to update first.
- Present the plan and ask for review before proceeding. Do not start coding until the plan is confirmed.

**Update documentation first**

- Before writing any code, update the relevant project documentation.
- Choose the proper document file that is part of the project documentation (`PROJECT.md`, `ARCHITECTURE.md`, `SPECIFICATION.md`), API specification, example files.
- If the change introduces new concepts, endpoints, or behaviors, document them before implementing.

**Implement**

- Follow the approved plan component by component.
- For all new functions, create unit tests.
- For all changed functions, update existing tests to match.

**Verify**

- Run the full verification loop defined in `docs/TESTING.md` for every affected component: typecheck, lint, unit test, static analysis, production build.
- Run the security checks configured in `docs/TESTING.md` as the security gate.
- Repeat until every component passes with zero errors and zero warnings.
- The solution must be production ready and match project requirements and documentation.
- Any source, configuration, or test change after a clean run requires another run.
- A change set is proposed for commit only when the verification loop is clean on its final diff — a clean run earlier in the work does not count.

**Repeat until the work is done**

- If the change spans multiple components, repeat the documentation, implementation, and verification steps for each one.
- Do not consider the task complete until all components pass and documentation is consistent with the final implementation.

## Memorization Convention

When the user says "memorize" or "remember", update the most relevant file in `docs/` with the new rule. If no specialized file is appropriate, update this file.

Documentation style rules live in `docs/STYLE.md`.


## Naming Conventions

- **Types / Classes**: `PascalCase`.
- **Variables / Functions**: `camelCase` (TypeScript, C#, Java), `snake_case` (Go).
- **API Endpoints**: `kebab-case`.
- **Config / Data Files**: `snake_case`.
- **Official Component Names**: Always use component names from the Components Overview section in PROJECT.md.
- **Version numbers**: Use just the number (e.g., `0.1.0`). Do not prefix with `v`.

## Build and Release Process

**Quality Workflow**

Every code change must follow: code → test → fix → lint → fix before proceeding to the next change. Group changes so existing code is altered in as few places as possible.

**Specification-First Changes**

When asked to make a code change, always update `docs/ARCHITECTURE.md` or `docs/SPECIFICATION.md` first, then implement the code changes according to the updated specification.

**OpenAPI Synchronization**

After editing `docs/contract/openapi.yaml`, run `shell/sync-openapi.sh` to propagate the updated contract to all implementation directories. Verify the diff in each copy before committing.

**AI-Provenance Convention**

Commit messages never carry AI attribution trailers such as `Generated-with`
or `Co-Authored-By`. AI-generated code receives the same review scrutiny as
human-authored code — the review evidence (test run, lint output, manual
verification notes) is retained in the change request's verification notes
under `docs/change/<version>/`. See `docs/COPYRIGHTS.md` for the originality
requirements this supports.

## Testing

- **Must read TESTING.md before performing any testing**. This document contains critical requirements for test environment setup.
- Use environment variables for test configuration. Never hardcode credentials or server addresses.
- Add or update tests when practical.
- Run relevant build/lint/test steps for the component being changed.
- Prefer small, verifiable steps.

## Development Principles

- Preserve existing style and conventions.
- Prefer minimal, safe changes.
- Keep components decoupled. Each implementation must be independently buildable and deployable.
- Stack-idiomatic layout: each implementation follows its ecosystem's source-layout and naming conventions (Java singular packages, C# plural role folders with `Options`/`Contracts`/`Security`). Parity across implementations lives in behavior and contract vocabulary (config keys, endpoint groups, error codes, log fields), not in file or folder names.

## File Maintenance

- Preserve encoding and line endings in existing files.
- Do not add generated files to the repository unless explicitly required.
- Do not change version numbers in project artifacts unless explicitly instructed.
- **Header Versions**: Do not bump version numbers in document headers unless explicitly instructed by the user.
- **Binary Output Location**: All compiled binaries must be output to a dedicated `bin/` directory within each project directory (e.g., `excel-api-go/bin/`, `excel-api-java/bin/`, etc.). Never build binaries to the repository root, subdirectories, or source directories. The `bin/` directory must be gitignored.

## Memorized General Rules

- **Strict Rule Adherence**: Follow the rules all the time unless specifically told to do otherwise.
- **Archive Access**: Do not read any document from `docs/archive` unless specifically instructed. The archive directory contains historical documents and is not part of the active documentation set.
- **Change Requests**: Change request documents are stored in `docs/change/<version>/`. Do not read them automatically. Read them only when the user requests implementation of a specific change request, or a version bump or changelog update is requested (changelog analysis exception).
- **Implementation Plans**: Implementation plans are stored in `docs/plan/<version>/`. Do not read them automatically. Read them only when the user explicitly requests it, or a version bump or changelog update is requested (changelog analysis exception).
- **Refactoring Documents**: Do not read any document from `docs/refactoring/` unless specifically instructed by the user.
- **New Session Rule**: If the model changes or a new session starts, re-read `README.md`, this file, and the active Sources of Truth before doing any work. Do not assume prior context.
- **Audit Reports**: Audit reports are stored in `docs/report/audit/<version>/` where `<version>` is the audited project version. Do not read audit reports automatically. They are produced artifacts, not active documentation. Read them only when the user explicitly requests an audit-report review, comparison, or other direct use.
- **OpenAPI Synchronization**: Only modify `docs/contract/openapi.yaml`. The copies in `excel-api-node/resources/openapi.yaml`, `excel-api-java/src/main/resources/openapi.yaml`, and `excel-api-csharp/src/ExcelApi/Resources/openapi.yaml` must be synced by running `bash shell/sync-openapi.sh`, not manually edited.
- **Copyright Compliance**: `docs/COPYRIGHTS.md` contains mandatory copyright and licensing rules that must be obeyed. All code must be original, AI-generated code must be verified for originality, and dependency licensing must be compatible (MIT, Apache 2.0, BSD, ISC, Boost only; GPL not allowed).
- **No Legacy Checking**: Unless specifically told to do so, do not implement additional support for previous behavior or create legacy checking for deprecated configuration keys or features.
