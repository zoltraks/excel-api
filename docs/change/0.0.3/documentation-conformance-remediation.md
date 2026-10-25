# Documentation Conformance Remediation

## Type

Chore

## Summary

A Compass evaluation of the documentation set found the repository largely
conforming to the ASE structure, with a small set of drift and recording gaps.
This change applies the full reconciliation path - repair the drift, record the
implicit conventions, supplement missing role artifacts, and extract the style
rules into their own owner - without touching code.

## Description

Documentation-only change. Work items:

- Backfill implementation plans for three `0.0.3` change records whose work
  landed without one: `java-package-homogeneity`, `java-runtime-startup-fix`,
  and `node-toolchain-hygiene`. Each plan is a retroactive record naming its
  implementing commit.
- Write `JAVA_ASSESSMENT.md` in `docs/refactoring/0.0.3/` - the Java proposal
  landed without its completed-work assessment.
- Remove stray runtime artifacts: the empty root `locks/` directory and
  `.DS_Store` files; add `locks/` to `.gitignore`.
- Record the execution policy in `docs/GUIDELINES.md`: human-in-the-loop
  default, the plan-approval gate, and reserved decisions (commits, release
  baseline, version bump).
- Record community posture: the project is not open to public contribution,
  so `CONTRIBUTING.md` and `SECURITY.md` are intentionally omitted.
- Record `docs/decisions/` as the decision-records owner, empty until the
  first decision lands.
- Add a thin `AGENTS.md` router at the repository root pointing agents at
  `docs/GUIDELINES.md`.
- Add `docs/README.md` as a rule-free navigation index of the documentation
  set.
- Add `excel-api-test/README.md` matching the other component READMEs.
- Extract the Documentation Guidelines section from `docs/GUIDELINES.md` into
  `docs/STYLE.md` as the sole style owner, leaving a cross-reference, and
  register the new files in Sources of Truth.

## Out of Scope

- Code changes, version bumps, and commits.
- Moving `LICENSE.md`, `docs/contract/`, or any other recorded convention.
- Reading change, plan, refactoring, report, or archive documents beyond the
  three named change records and `JAVA_PROPOSAL.md` required by this change.

## Setup Summary

- **Preparation document**: Compass `PREPARATION.md` version 2.0.9, evaluate
  mode, 2026-10-25.
- **Repository topology**: single multi-project repository; profile Software
  with a multi-implementation axis (three servers, one CLI, one test suite).
- **Documentation scheme**: canonical ASE structure, hand-maintained.
- **Guidelines topology**: consolidated - `docs/GUIDELINES.md` owns the rules
  index; style rules move to `docs/STYLE.md` under this change.
- **Agent entry**: `README.md` routing block today; this change adds
  `AGENTS.md` as the canonical entry file.
- **Resolved file selection**: Required and Recommended files all present.
  Optional selected: `PROJECT`, `ARCHITECTURE`, `SPECIFICATION`, `DEPLOYMENT`,
  `LICENSE.md`, `CHANGELOG.md`, component READMEs, plus `AGENTS.md`,
  `docs/README.md`, and `docs/STYLE.md` added by this change. Optional omitted
  as N/A: `ABOUT`, `PREREQUISITES`, `IGNORE`, `REFERENCES`, `HANDOVER`,
  `MAINTENANCE`, `SKILL`, `CONTRIBUTING`, `SECURITY` (posture recorded).
- **Directory roles**: `change/`, `plan/`, `refactoring/` version-grouped;
  `report/` with `audit/` subgroup; `archive/` version-grouped; `contract/`
  recorded convention for the shared API contract; `standard/` one file per
  stack; `decisions/` recorded owner, N/A until first decision; `issue/`,
  `discard/`, `reference/`, `template/`, `usage/`, `review/`, `skill/` not
  selected.
- **Owner map**: prerequisites `README.md`; testing `docs/TESTING.md`;
  workflow `docs/WORKFLOW.md`; style `docs/STYLE.md` (from `GUIDELINES.md`
  under this change); versioning `docs/VERSIONING.md`; refactoring
  `docs/REFACTORING.md`; deployment `docs/DEPLOYMENT.md`; contract
  `docs/contract/openapi.yaml`; rules index `docs/GUIDELINES.md`; navigation
  index `docs/README.md`.
- **Execution policy**: human-in-the-loop; plan-approval gate before
  implementation; commits, release baseline, and version bumps reserved to
  the user.
- **Adopted extensions**: none.
- **Verification evidence**: style and link pass on touched documents;
  findings-closure report.
- **Remaining gaps**: none expected after this change; posture and N/A roles
  recorded as decisions.
