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
- **Workflow**: `docs/WORKFLOW.md`.
- **Refactoring process**: `docs/REFACTORING.md`.
- **Testing strategy**: `docs/TESTING.md`.
- **Deployment**: `docs/DEPLOYMENT.md`.

**Development standards** (one per implementation language):

- `docs/standard/ts-node-development.md` — TypeScript/Node.js
- `docs/standard/java-spring-maven-development.md` — Java/Spring Boot/Maven
- `docs/standard/csharp-aspnet-development.md` — C#/ASP.NET
- `docs/standard/go-cli-development.md` — Go CLI

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

## Applying the change

These rules apply to every change made in this project. Follow them in order — do not skip steps.

**Understand the change**

- Read the request carefully.
- Identify all components, modules, and documentation files affected.
- All implementations must be consistent with the requested change.

**Update documentation first**

- Before writing any code, update the relevant project documentation.
- Choose the proper document file that is part of the project documentation (`PROJECT.md`, `ARCHITECTURE.md`, `SPECIFICATION.md`), API specification, example files.
- If the change introduces new concepts, endpoints, or behaviors, document them before implementing.

**Create an implementation plan**

- For each affected component, produce a short implementation plan: what will change, which files are touched, what new files are needed.
- Present the plan and ask for review before proceeding.
- Do not start coding until the plan is approved.

**Implement**

- Follow the approved plan component by component.
- For all new functions, create unit tests.
- For all changed functions, update existing tests to match.

**Verify**

After implementation, run the full verification loop:

```
build → lint → test → fix errors and warnings → repeat
```

- Repeat until every component builds cleanly without any errors and warnings.
- The solution must be production ready and match project requirements and documentation.

**Repeat until the work is done**

- If the change spans multiple components, repeat steps 3–5 for each one.
- Do not consider the task complete until all components pass and documentation is consistent with the final implementation.

## Memorization Convention

When the user says "memorize" or "remember", update the most relevant file in `docs/` with the new rule. If no specialized file is appropriate, update this file.

## Documentation Guidelines

**Documentation Style**

- Write short sentences.
- Use explicit line breaks.
- One idea per paragraph. Do not group unrelated thoughts in the same paragraph.
- **Blank Lines**: Never put more than one blank line between any sections or blocks. Avoid using two or more consecutive blank lines.
- **Language Consistency**: Always preserve the language of the document being modified.
- **Lists**: Prefer bullet points (`-`) over numbering. Avoid numbering unless the order is strictly required for technical correctness. Always put exactly one blank line before starting a list.
- **Procedures**: Do not use numbered lists for complex procedures with code blocks. Instead: end the introductory sentence with a dot. Use a bold heading for each step on its own line. Put exactly one empty line before the step description or code. Put exactly one empty line after the step content.
- Use standard ASCII characters.
- Keep section names short. Do not put qualifiers in section names using parentheses.
- **Heading Format**: For H3-level subsections, use bold text on its own line instead of `###` syntax.
- **Flattened Structure**: Use H2 for all major sections under the main H1. Avoid deeply nested hierarchies. Stick to the existing heading levels of the document being modified.
- **Horizontal Dividers**: Do not use `---` anywhere in documents. Separate sections using headings only.
- **Headings**: Avoid using colons in headings.

**Markdown Tables**

- Keep them readable as plain text.
- **Proactive Formatting**: When editing any document in markdown format, check and fix markdown table alignment and documentation style compliance — even for tables not directly edited.
- **Cell descriptions**: Use short, telegraphic noun phrases. Never start with "A", "An", or "The". Avoid full sentences.
- **Minimal width**: Use the minimum column width that satisfies all constraints. Do not pad columns wider than necessary.
- **Pipes**: All vertical pipes `|` must be vertically aligned.
- **Separator row**: Use exactly `W` dashes where `W` is the maximum character width of all items in that column including the header.
- **Padding**: Use exactly one space on the left (`| `) and at least one space on the right (` |`).
- Content must be aligned left. Do not use `:---` or `---:`.
- **Visual Indicators**: Use `✓` for affirmative/available features and `✗` for negative/unavailable features.

**Formatting Rules**

- Put code, commands, file names, and paths in backticks.
- **Code Blocks**: Always use three backticks for code blocks. No indentation: starts at the very beginning of the line. Mandatory spacing: exactly one blank line before and after the block.

**API Design Documentation**

- **Endpoint Structure**: Group endpoints by resource.
- **Table Format**: Use tables to list paths and methods.
- **Parameter Tables**: Use tables with `Name`, `Type`, `Required`, and `Description`.
- **Error Consistency**: Document standard error envelopes using JSON blocks and error code tables. Error description strings must be short.

**CHANGELOG Maintenance**

- Maintain `CHANGELOG.md` in the repository root directory.
- Update it immediately after version changes or significant releases.
- When creating a CHANGELOG entry, use `git log` to review all commits since the last version bump. Examine file changes and consolidate related updates into meaningful categories.
- Each version entry must include a version number as H2 heading, a brief summary sentence, and a bulleted list of changes using hyphens grouped logically and written in past tense.

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

## File Maintenance

- Preserve encoding and line endings in existing files.
- Do not add generated files to the repository unless explicitly required.
- Do not change version numbers in project artifacts unless explicitly instructed.
- **Header Versions**: Do not bump version numbers in document headers unless explicitly instructed by the user.
- **Binary Output Location**: All compiled binaries must be output to a dedicated `bin/` directory within each project directory (e.g., `excel-api-go/bin/`, `excel-api-java/bin/`, etc.). Never build binaries to the repository root, subdirectories, or source directories. The `bin/` directory must be gitignored.

## Memorized General Rules

- **Strict Rule Adherence**: Follow the rules all the time unless specifically told to do otherwise.
- **Archive Access**: Do not read any document from `docs/archive` unless specifically instructed. The archive directory contains historical documents and is not part of the active documentation set.
- **OpenAPI Synchronization**: Only modify `docs/contract/openapi.yaml`. The copies in `excel-api-node/resources/openapi.yaml`, `excel-api-java/src/main/resources/openapi.yaml`, and `excel-api-csharp/src/ExcelApi/Resources/openapi.yaml` must be synced by running `bash shell/sync-openapi.sh`, not manually edited.
- **Copyright Compliance**: `docs/COPYRIGHTS.md` contains mandatory copyright and licensing rules that must be obeyed. All code must be original, AI-generated code must be verified for originality, and dependency licensing must be compatible (MIT, Apache 2.0, BSD, ISC, Boost only; GPL not allowed).
- **No Legacy Checking**: Unless specifically told to do so, do not implement additional support for previous behavior or create legacy checking for deprecated configuration keys or features.
