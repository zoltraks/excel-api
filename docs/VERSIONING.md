# Versioning Guidelines

This document describes the version numbering scheme and bumping rules for the Excel API project.

## Version Format

The version follows semantic versioning format: `MAJOR.MINOR.PATCH`

- **MAJOR** (first number): Significant changes, breaking compatibility
- **MINOR** (second number): New features, enhancements
- **PATCH** (third number): Bug fixes, minor improvements

## Version Bumping Rules

### Standard Increment

1. **Increment the PATCH number** (last number) for any change:
   - `0.0.1` → `0.0.2`
   - `0.0.8` → `0.0.9`

2. **When PATCH reaches 9**, increment MINOR and reset PATCH to 0:
   - `0.0.9` → `0.1.0`
   - `0.1.9` → `0.2.0`

3. **When MINOR reaches 9**, increment MAJOR and reset both MINOR and PATCH to 0:
   - `0.9.9` → `1.0.0`
   - `1.9.9` → `2.0.0`

### MAJOR Number Exception

The **MAJOR number has no maximum limit** and can be incremented beyond 9:
- `9.9.9` → `10.0.0`
- `10.9.9` → `11.0.0`
- `99.9.9` → `100.0.0`

## Files to Update

Each implementation has its own version storage:

### API Specification (`docs/contract/openapi.yaml`)

- `openapi.yaml` — Update `info.version` field

### Node.js Implementation (`excel-api-node/`)

1. `package.json` — `"version": "X.Y.Z"`

### Java Implementation (`excel-api-java/`)

1. `pom.xml` — `<version>X.Y.Z</version>`

### C# Implementation (`excel-api-csharp/`)

1. `ExcelApi.csproj` — `<Version>X.Y.Z</Version>`

### Go CLI (`excel-api-go/`)

- `internal/config/version.go` — Version constant

## Version Bump Procedure

When bumping the version for any component:

1. Calculate the new version number per the bumping rules above.
2. **If no project is specified**, bump all implementations and the API specification to the same version number.
3. Update the version in all component files listed under **Files to Update**.
4. Rebuild the component so generated files are refreshed.
5. Add a new entry to `CHANGELOG.md` at the repository root (see below).
6. Update the **Current Version** section at the bottom of this file.

## CHANGELOG.md Conventions

The repository has a single `CHANGELOG.md` at the root covering all components.

### Format

```
# Changes

## Version X.Y.Z

One-sentence summary of the release scope and theme.

- **Subject**: Description of the change.
- **Subject**: Description of the change.
```

### Rules

- The file title is `# Changes` (no other heading at the top level).
- Each release is a `## Version X.Y.Z` heading — no date, no component prefix.
- Immediately after the heading: a single plain-text summary sentence describing the overall theme of the release.
- Bullet list follows: each item starts with a **bold subject** (the affected area, class, or feature), a colon, then a concise description.
- Items describe what changed and why it matters — not how it was implemented.
- Most recent version is at the top.
- Do not include sub-headings (e.g. `### Added`, `### Fixed`) inside a version section.
- Write in past tense.

## Examples

| Current Version | Next Version |
|-----------------|--------------|
| `0.0.1` | `0.0.2` |
| `0.0.9` | `0.1.0` |
| `0.1.0` | `0.1.1` |
| `0.9.9` | `1.0.0` |
| `1.0.0` | `1.0.1` |
| `9.9.9` | `10.0.0` |

## Current Version

The current Excel API version is: **0.0.1**
