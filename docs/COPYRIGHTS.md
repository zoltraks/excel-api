# Copyright and License Requirements

## Fundamental Rules

- All code must be **original** and not copied from existing solutions.
- Never copy code from other sources without proper licensing and attribution.
- **NEVER** accept AI-generated code that resembles or duplicates code from other projects - always verify originality.
- When adding external libraries or dependencies, verify license compatibility before use.
- Document the source and license of any third-party code or libraries used.
- Do not include copyrighted material without explicit permission.
- This applies to code, documentation, images, and any other project assets.

## Project License

**IMPORTANT:** If the file `LICENSE.md` exists in the repository root, the project is released under the license specified therein.

**If `LICENSE.md` does NOT exist**, this project is considered a **commercial product** and all rights to it belong to the company that owns it. No part of this project may be copied, modified, or distributed without explicit written permission from the owner.

## Dependency Licensing

- Permitted open-source licenses: MIT, Apache 2.0, BSD 2-Clause, BSD 3-Clause, ISC, Boost.
- GPL-licensed libraries may **NOT** be used in this project without explicit written approval.
- All dependencies are declared in the component manifest files (`package.json` + lockfile, `pom.xml`, `*.csproj`, `go.mod`).

## License Review Convention

No dedicated notices file is maintained at the repository root. License
compliance is enforced at change time:

- When a manifest changes (new dependency, version bump that changes a
  license), the resolved licenses of the added components must be checked
  against the allowlist and the outcome recorded in the change request's
  verification notes under `docs/change/<version>/`.
- Components outside the allowlist require removal/replacement or documented
  approval before release.

Current state (version 0.0.3): all runtime dependencies resolve to MIT,
Apache-2.0, BSD-2-Clause, BSD-3-Clause, or ISC. `logstash-logback-encoder`
is dual-licensed Apache-2.0 OR LGPL-2.1 and is accepted under the Apache-2.0
option (used unmodified as a separate library for optional JSON logging).
`buffers@0.1.1` (transitive of exceljs) declares no license — a known
exception pending remediation. Dev/test-scope components outside the
allowlist (`minimatch` BlueOak-1.0.0, `caniuse-lite` CC-BY-4.0, JUnit
EPL-2.0) are never distributed with the application.
