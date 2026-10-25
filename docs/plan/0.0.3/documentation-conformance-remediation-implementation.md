# Documentation Conformance Remediation - Implementation

## Change Request Reference

`docs/change/0.0.3/documentation-conformance-remediation.md`

## Best Practices

- `docs/STYLE.md` once extracted, and the Documentation Guidelines section of
  `docs/GUIDELINES.md` until then - they carry the same rules.
- `docs/WORKFLOW.md` for the change-request and implementation-plan formats;
  `docs/REFACTORING.md` for the assessment format.

## Documentation Updates

- `docs/GUIDELINES.md` - Sources of Truth entries, Execution Policy section,
  community posture, style-section extraction.
- `docs/STYLE.md` - new owner of the extracted style rules.
- `docs/README.md`, `AGENTS.md`, `excel-api-test/README.md` - new documents.
- `docs/plan/0.0.3/` - three retroactive implementation plans.
- `docs/refactoring/0.0.3/JAVA_ASSESSMENT.md` - new assessment.
- `.gitignore` - `locks/` entry.

## Steps

**Step 1 - Backfill implementation plans**

Create `docs/plan/0.0.3/java-package-homogeneity-implementation.md`,
`java-runtime-startup-fix-implementation.md`, and
`node-toolchain-hygiene-implementation.md`. Each carries the required plan
content plus a retroactive-record note naming the implementing commits
(`dbe83a4` and `046a9e7` for the Java records, `811470b` for the Node record -
confirmed by diff). Only the three named change records and
`docs/refactoring/0.0.3/JAVA_PROPOSAL.md` are read from the restricted
directories.

**Step 2 - Java refactoring assessment**

Create `docs/refactoring/0.0.3/JAVA_ASSESSMENT.md` following the "Evaluating
Completed Work" checklist in `docs/REFACTORING.md`, evaluated against the
landed diff.

**Step 3 - Stray artifact cleanup**

Remove the empty root `locks/` directory and the `.DS_Store` files (root and
`docs/report/`). Add `locks/` to `.gitignore` under the lock-files block.

**Step 4 - Execution policy and posture**

In `docs/GUIDELINES.md` add an "Execution Policy" section after "General
Workflow" recording the human-in-the-loop default, the plan-approval gate,
and the reserved decisions (commits, release baseline, version bump). Record
the community posture: not open to public contribution, `CONTRIBUTING.md` and
`SECURITY.md` intentionally omitted.

**Step 5 - Style extraction**

Create `docs/STYLE.md` holding the Documentation Guidelines block
(`docs/GUIDELINES.md` lines 129-173) under its own H1. Replace the block in
`docs/GUIDELINES.md` with a cross-reference and register `docs/STYLE.md` in
Sources of Truth.

**Step 6 - New documents**

Create `AGENTS.md` (thin router to `docs/GUIDELINES.md`, no restated rules),
`docs/README.md` (navigation index table only), and `excel-api-test/README.md`
(component README matching the other four).

**Step 7 - Sources of Truth update**

Register `docs/STYLE.md`, `docs/README.md`, `docs/decisions/` (N/A until the
first decision), and `AGENTS.md` in the `docs/GUIDELINES.md` Sources of Truth
list.

## Testing Strategy

Not applicable - documentation-only change with no code paths touched. The
`docs/TESTING.md` verification loop does not apply.

## Verification

- Style pass on every new or edited document against the `docs/STYLE.md`
  rules: H2 flat structure, bold step headings, no `---` dividers, ASCII
  characters, kebab-case filenames, aligned table pipes.
- Confirm `docs/GUIDELINES.md` Sources of Truth lists every active document
  and directory role.
- `git status` and `git diff` review of the final tree; `git diff --check`
  for whitespace.
- Findings-closure table mapping each evaluation finding to its resolution.
