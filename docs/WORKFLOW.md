# Development Workflow

This document orchestrates the development process for the Excel API project.

It defines the version-based cycle for delivering changes and the per-change cycle used during implementation.

## Change Documentation Requirement

Every change - feature, fix, refactor, or chore - requires two documents before any code is written.

- **Change request**: `docs/change/<version>/<change-name>.md`
- **Implementation plan**: `docs/plan/<version>/<change-name>-implementation.md`

`<version>` is the current project version recorded in `docs/VERSIONING.md`.
Use the current version even when the request names a different version.
A version bump does not move existing change or plan documents and does not create a new version directory by itself.

Create the change request and the implementation plan, then ask for confirmation before writing any code.
Do not include time or duration estimates in either document.
Creating or updating change requests and plans is a documentation-only change and does not require the verification loop.

## Change Request Document

One document per change, named in kebab-case after the change (for example `batch-operations.md`).

Required content:

- **Type**: Feature, Fix, Refactor, or Chore.
- **Summary**: One to three sentences describing what the change is and why it matters.
- **Description**: What should change, not how to implement it. Include behavioral rules, edge cases, and constraints that are part of the requirement.

Optional content: Use Cases, Hints, Out of Scope.

## Implementation Plan Document

Named after the change request with an `-implementation` suffix (for example `batch-operations-implementation.md`).

Required content:

- **Change Request Reference**: Path to the change request in `docs/change/<version>/`.
- **Best Practices**: Reference the engineering standard from `docs/standard/` for each affected stack.
- **Documentation Updates**: List which of `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, and `docs/SPECIFICATION.md` must be updated before code changes.
- **Step by Step Implementation**: One bold-headed step per logical unit of change. Each step names the files it modifies and leaves the tree buildable.
- **Testing Strategy**: Unit and integration test expectations for the change.
- **Verification**: Reference the verification loop and security checks in `docs/TESTING.md`. Do not duplicate the commands here.

## Per-Change Development Cycle

Use this cycle while executing the Implementation stage.

**Analysis**

- Read the change request and the active sources of truth listed in `docs/GUIDELINES.md`.
- Find the affected code and trace its dependencies.

**Planning**

- Create the implementation plan in `docs/plan/<version>/`.
- Wait for user approval.

**Baseline Verification**

- Required before behaviour changes, multi-module work, build or test infrastructure changes, and broad refactoring.
- Run the verification loop in `docs/TESTING.md` to establish a known-good baseline.
- Omit for documentation-only and trivial isolated edits.

**Implementation**

- Update the affected documentation first.
- Implement in small, verifiable increments.
- Follow the plan precisely. If the plan proves wrong, stop, update the plan, and continue.

**Verification Loop**

- Run the verification loop defined in `docs/TESTING.md` until clean: typecheck, lint, unit test, static analysis, production build.
- Fix failures through the feedback path below, then repeat the loop.

**Security Gate**

- Run the security checks configured in `docs/TESTING.md`, including dependency analysis and static security analysis.
- Resolve findings or obtain explicit owner approval with a recorded rationale before completion.

**Cleanup**

- Remove temporary diagnostics and dead code introduced by the change.
- Simplify and rename within the scope of the change.
- This is routine micro-refactoring and does not require a formal proposal.
- Run the verification loop again after cleanup.

**Review**

- Compare the result with the change request, acceptance criteria, plan, and standards.
- Check the actual diff for unintended changes.
- Present the implementation summary and diff to the user as the review gate.

**Review Changes**

- Apply requested changes, then run the verification loop again before the next review.

**Bug Fixing and Diagnostics**

- A feedback path usable from any stage, not a fixed phase.
- Reproduce the failure, add temporary diagnostics, fix the cause, and return to the verification loop.
- Remove temporary diagnostics during Cleanup.

## Version-Based Implementation Cycle

The cycle runs in stages. Each stage produces a specific document or code change.

**Concept**

Optional. Early free-form ideation, distilled into one or more change requests before planning.

**Change Request**

Specify what should change and why. Create the document in `docs/change/<version>/`.

**Implementation Plan**

Describe how the change will be implemented. Create the document in `docs/plan/<version>/`.

**Implementation**

Update the affected documentation first, then implement the code using the per-change cycle above.

**Refactoring Proposal**

Conditional. Use only for substantial behaviour-preserving restructuring, following `docs/REFACTORING.md`. Routine cleanup during implementation does not require a formal proposal. Proposals and assessments live in `docs/refactoring/<version>/`.

**Version Bump**

Performed only when the user requests it, after the work is completed and designated for production.
A bump request means bump the version and update `CHANGELOG.md`.
Follow `docs/VERSIONING.md`.

## Adding a New Endpoint

**Update the contract**

Edit `docs/contract/openapi.yaml` with the new endpoint, request/response schemas, and error codes.

**Synchronize**

Run `shell/sync-openapi.sh` to propagate the contract to all implementations.

**Update documentation**

Add the endpoint to `docs/ARCHITECTURE.md` (endpoint table) and `docs/PROJECT.md` (if it affects requirements).

**Implement**

Add the endpoint in each implementation following its development standard.

**Add integration test**

Write a test in `excel-api-test/integration/` that exercises the new endpoint.

**Run the full test suite**

Verify all three implementations pass.

## Modifying an Existing Endpoint

Follow the same sequence as adding a new endpoint.
Ensure backward compatibility or document the breaking change in `CHANGELOG.md` at the next version bump.

## Restricted Directories

- Do not read any document from `docs/change/` unless the user explicitly requests implementation of a specific change request, or a version bump or changelog update is requested.
- Do not read any document from `docs/plan/` unless specifically instructed by the user, or a version bump or changelog update is requested.
- Do not read any document from `docs/refactoring/`, `docs/report/`, or `docs/archive/` unless specifically instructed by the user.
- Reports in `docs/report/` are outputs, not rules. They are not part of the active documentation set.

## Archiving

When asked to archive documents for a specific version, move the entire version directory while preserving structure and contents.

- `docs/change/<version>/` moves to `docs/archive/change/<version>/`
- `docs/plan/<version>/` moves to `docs/archive/plan/<version>/`
- `docs/refactoring/<version>/` moves to `docs/archive/refactoring/<version>/`
- Individual reports move from `docs/report/` to `docs/archive/report/`

Archived documents are historical and must not be treated as authoritative for current work.

## Temporary Files

Use the `work` directory in the repository root for temporary files and delete it when the task completes.
Follow the temporary-file rules in `docs/GUIDELINES.md`.

## Working with AI Coding Agents

When delegating implementation to an AI coding agent, provide the following context:

- `docs/PROJECT.md` - project requirements and constraints
- `docs/ARCHITECTURE.md` - shared architecture and data model
- `docs/SPECIFICATION.md` - section for the target implementation
- The relevant development standard from `docs/standard/`
- The `openapi.yaml` contract (from the implementation's `resources/` directory)
- The specific source files being modified

Verify agent output against the verification loop in `docs/TESTING.md` before committing.
