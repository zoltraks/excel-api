# Refactoring Process

## Creating a Refactoring Proposal

Every non-trivial refactoring starts with a written proposal. The proposal is a markdown document in the `work/` directory (not committed) with the following sections.

**Problem.** Describe the code smell, standard violation, duplication, or architectural issue. Include file paths and line references.

**Goal.** Describe the desired end state. What does the code look like after the refactoring?

**Plan.** List the steps in execution order. Each step must leave the codebase in a buildable and testable state. No step may break existing tests.

**Risk.** What could go wrong? Which areas are most likely to regress? Which tests cover the affected code?

**Acceptance Criteria.** Concrete conditions that must be met for the refactoring to be considered complete.

## Executing a Refactoring

Follow the plan step by step. After each step, run the build-test-fix loop from `docs/WORKFLOW.md`. Do not proceed to the next step until the current step passes all checks.

If a step reveals an issue not covered by the plan, stop and update the proposal before continuing.

## Evaluating Completed Work

After all steps are complete, evaluate the result against this checklist.

- All unit tests pass.
- All integration tests pass (for all three implementations if the change is cross-cutting).
- Linting produces no errors or warnings.
- The change is consistent with the relevant development standard in `docs/standard/`.
- The change does not introduce new dependencies without justification.
- The change does not degrade measurable performance (startup time, request latency, memory usage).
- The change is documented: `CHANGELOG.md` updated, `docs/SPECIFICATION.md` updated if implementation details changed.

## AI-Assisted Refactoring

When using an AI coding agent for refactoring, provide the proposal document as context alongside the standard file set from `docs/WORKFLOW.md`. The agent must follow the plan step by step and run verification after each step. Do not accept bulk changes that skip intermediate verification.
