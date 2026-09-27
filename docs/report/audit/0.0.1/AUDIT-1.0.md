# Document Information

**Version**: 1.0

**Date**: 2026-06-08

**Status**: Final

**Detail level**: Detailed

---

# Technology Stack

| Layer            | Technology                                                                                              |
|------------------|---------------------------------------------------------------------------------------------------------|
| Languages        | TypeScript 5.5, Java 21, C# (.NET 8), Go 1.22                                                           |
| Frameworks       | Fastify 4.28 (Node), Spring Boot 3.3 (Java), ASP.NET 8 minimal API (C#), standard library (Go)          |
| Runtime/Platform | Node.js 22, JVM 21, .NET 8, Go 1.22+, Docker + Docker Compose                                           |
| Build tooling    | tsc/npm (Node), Maven (Java), .NET CLI (C#), go build (Go)                                              |
| Test tooling     | Vitest (Node), JUnit/Spring Test (Java), MSTest (C#), go testing (Go), Jest (integration tests)         |
| Package manager  | npm (Node), Maven Central (Java), NuGet (C#), Go modules                                                |
| Key libraries    | ExcelJS 4.4, Apache POI 5.2.5, ClosedXML 0.102.3, Zod, jsonwebtoken/jjwt, bcrypt, SnakeYAML, YamlDotNet |
| Data stores      | Local file system (`*.xlsx`, `*.lock`), no external database                                            |
| Target platforms | Containerized Docker servers, CLI client as a single binary file                                        |

Evidence: `excel-api-node/package.json` (lines 1-40), `excel-api-java/pom.xml` (lines 1-96), `excel-api-csharp/src/ExcelApi/ExcelApi.csproj` (lines 1-23), `excel-api-go/go.mod` (lines 1-3), `excel-api-go/go.sum` (empty file - no external dependencies).

---

# Executive Summary

| Field          | Value                                                                      |
|----------------|----------------------------------------------------------------------------|
| System type    | Codebase under development                                                 |
| Scope          | Three server implementations (Node, Java, C#), CLI client (Go), test suite |
| Source basis   | Source code inspection                                                     |
| Maturity level | Early development                                                          |

**Summary description**

Excel API exposes Excel sheet data through an HTTP interface in JSON format with write queuing and file locking for concurrent access.

The system comprises three interchangeable server implementations sharing an OpenAPI 3.1 contract, a Go CLI client, and a black-box integration test suite.

The `Early development` maturity level is justified by the absence of a CI/CD pipeline, the incomplete C# implementation (placeholder authentication, no real queue or locks), and the lack of operational procedures.

The single most serious risk is the lack of CI/CD automation and the public, unauthenticated data access in the C# implementation.

**Production Readiness Threshold**

To move the maturity level from `Early development` to `Production-ready`, the following risks must be closed: RSK-001 by introducing a CI/CD pipeline with quality gates, RSK-002 by implementing real authentication and authorization in the C# implementation, RSK-003 and RSK-004 by restricting CORS and enabling TLS, RSK-005 by implementing the write queue and file locking in C#, and RSK-006 by fixing password verification in the Java implementation.

Until these conditions are met, there is a real risk of regressions, unauthorized access, and data integrity loss.

---

# Health Dashboard

## Risk Map

| Impact \ Likelihood | LOW     | MEDIUM                                      | HIGH    |
|---------------------|---------|---------------------------------------------|---------|
| CRITICAL            |         | RSK-002                                     |         |
| HIGH                | RSK-006 | RSK-003, RSK-004, RSK-005                   | RSK-001 |
| MEDIUM              | RSK-013 | RSK-007, RSK-008, RSK-009, RSK-010, RSK-011 |         |
| LOW                 |         |                                             | RSK-012 |

## Scorecard Summary

| Dimension               | Score | Notes                                                                                               |
|-------------------------|-------|-----------------------------------------------------------------------------------------------------|
| Testability             | 4/10  | Unit tests present, integration tests mostly skeletal, no coverage thresholds or CI                 |
| Design Soundness        | 6/10  | Modular architecture and OpenAPI contract, but logic triplication and divergent maturity            |
| Code Quality            | 5/10  | Strict TS and nullable in C#, but no input validation, committed binary artifact, test placeholders |
| Stack Alignment         | 7/10  | Current frameworks, idiomatic code, libraries used correctly                                        |
| Dependency Health       | 5/10  | Current versions, lockfile in Node, but no vulnerability scanning, SBOM, or lockfiles in C#/Java    |
| Maintainability         | 6/10  | Readable structure and extensive documentation, but triple logic replication                        |
| Deployability           | 5/10  | Docker multi-stage and non-root, but no CI or HEALTHCHECK in Dockerfiles                            |
| Scalability             | 4/10  | Local-FS-based architecture limits horizontal scaling                                               |
| Security                | 3/10  | Broad CORS, TLS disabled, C# without auth enforcement, plaintext password comparison in Java        |
| Compliance              | N/A   | The system does not process regulated data, no compliance scope defined                             |
| Observability           | 5/10  | JSON logs, `/health`, `/metrics`, but minimal metrics, no tracing or alerts                         |
| Operational Safety      | 3/10  | No runbooks, backup, or rollback procedures, C# without locking or queue                            |
| AI Provenance           | 6/10  | No unambiguous AI markers, but risk patterns present, no AI usage policy                            |
| Originality & Licensing | 7/10  | MIT license present, compatible dependencies, but no license headers or SBOM                        |

---

# High-Level Observations

| Observation                                                                                                      |
|------------------------------------------------------------------------------------------------------------------|
| The lack of a CI/CD pipeline prevents automatic validation of changes and leads to quality degradation over time |
| The C# implementation does not enforce authentication, exposing data publicly                                    |
| A broad CORS configuration in all servers opens cross-origin attack vectors                                      |
| TLS is disabled by default and servers listen on plaintext HTTP                                                  |
| The C# implementation has no real write queue or file locking, which threatens data integrity                    |

**No CI/CD pipeline** `PARTIAL` `CRITICAL`

No `.github/workflows/` directory, `.gitlab-ci.yml` file, `Jenkinsfile`, or other pipeline configuration was found in the repository.

Unit and integration tests exist, but there is no evidence that they run automatically on every change.

Consequently, there is no quality gate blocking changes that introduce regressions.

Details: FND-INF-001.

**The C# implementation does not enforce authentication** `FAIL` `CRITICAL`

`excel-api-csharp/src/ExcelApi/Program.cs` (lines 96-103) registers data endpoints without calling `UseAuthentication`/`UseAuthorization`, and `excel-api-csharp/src/ExcelApi/Endpoints/AuthEndpoints.cs` (lines 42-66) returns `dummy-token` for the hardcoded credentials `test-client`/`test-secret`.

As a result, data read and write endpoints are accessible without a valid token.

Details: FND-SEC-003.

**Broad CORS in all servers** `PARTIAL` `HIGH`

`excel-api-csharp/src/ExcelApi/Program.cs` (lines 28-36 and 52-57) configures `AllowAnyOrigin`, `AllowAnyMethod`, and `AllowAnyHeader`, while `excel-api-java/src/main/java/pl/alyx/api/excel/config/CorsFilterConfiguration.java` combines `addAllowedOrigin("*")` with `setAllowCredentials(true)`.

The Node implementation uses `origin: true` (`excel-api-node/src/server.ts`, lines 161-165), which reflects any origin.

Details: FND-SEC-001.

**TLS disabled by default** `PARTIAL` `HIGH`

The `config.example.yaml` files in all servers set `tls.enabled: false`, and `excel-api-csharp/src/ExcelApi/Program.cs` (line 127) calls `app.Run("http://0.0.0.0:8443")`.

All traffic, including tokens and data, is transmitted in plaintext.

Details: FND-SEC-002.

**No queue or file locking in C#** `PARTIAL` `HIGH`

`excel-api-csharp/src/ExcelApi/Services/ExcelService.cs` (lines 245-263) opens and writes the file without locking, and `excel-api-csharp/src/ExcelApi/Endpoints/WorkbookEndpoints.cs` (lines 54-67) returns hardcoded `locked: false` and `queue_depth: 0`.

Concurrent writes can lead to file corruption or lost changes.

Details: FND-INF-002.

---

# Auditing Methodology

**Methodology overview**

The audit was conducted in accordance with the `process/workflow.md` procedure of the LENS skill.

Evidence-based reasoning was applied across 18 assessment categories grouped into six pillars.

- **Architecture & Design** - Design principles, maintainability, change management, documentation, non-functional requirements
- **Code Quality** - Testing, code quality, stack best practices
- **Security & Compliance** - Security, compliance, and data protection
- **Infrastructure & CI/CD** - Dependencies, deployment, rollback, observability, error handling, operational readiness
- **AI Provenance & Code Origin** - AI-generated code detection, Vibe Coding risks, Agent Driven Engineering maturity, SDLC discipline
- **Copyrights & Originality** - Code originality, license compliance, attribution, dependency license compatibility

**Audit evidence statement**

The audit covered the source code of four implementations (Node, Java, C#, Go) and the integration test suite, totaling approximately 120 source and test files along with configuration files and documentation.

The `.gitignore` file is present and was honored when filtering build artifacts.

Git commit history was not analyzed. No running environment was observed, all conclusions are based on static analysis.

**Severity definitions**

| Severity | Impact                                    | Likelihood                      | Blocks Production Readiness |
|----------|-------------------------------------------|---------------------------------|-----------------------------|
| CRITICAL | Data loss, breach, or full compromise     | Expected without intervention   | Yes                         |
| HIGH     | Loss of a major feature or data integrity | Likely in normal operation      | Yes                         |
| MEDIUM   | Feature degradation or limited failure    | Requires specific conditions    | No (but requires tracking)  |
| LOW      | Limited or cosmetic effect                | Requires an unusual combination | No                          |

---

# Scoring Rubrics

**Scoring scale**

The default whole-number scale from `1` to `10` was applied.

| Band      | Score Range | Definition                                                   |
|-----------|-------------|--------------------------------------------------------------|
| Excellent | 9-10        | Capability is comprehensive and verified by strong evidence  |
| Good      | 7-8         | Capability is solid overall, minor or noticeable gaps exist  |
| Average   | 4-6         | Capability is present but uneven, limited, or inconsistent   |
| Poor      | 1-3         | Capability is minimal, fragmentary, or absent where required |

The value `0` is reserved and is not used as a score. When a dimension does not apply, it is marked as `N/A`.

---

# System Context

| Aspect                 | Detail                                                                                                        |
|------------------------|---------------------------------------------------------------------------------------------------------------|
| Functional description | HTTP service exposing Excel sheet data as JSON with cell-level and record-level access                        |
| Architecture overview  | Three interchangeable servers + CLI client, shared OpenAPI 3.1 contract, queue and lock layer over a local FS |
| Key components         | `excel-api-node`, `excel-api-java`, `excel-api-csharp`, `excel-api-go`, `excel-api-test`                      |
| External dependencies  | ExcelJS, Apache POI, ClosedXML, Fastify, Spring Boot, ASP.NET, no external database                           |
| Assumptions            | Excel files registered in configuration, file-based model without real-time collaboration                     |

The system is described in `docs/PROJECT.md` and `docs/ARCHITECTURE.md`. The OpenAPI contract in `docs/contract/openapi.yaml` is the declared single source of truth, synchronized to the implementations by the `shell/sync-openapi.sh` script.

---

# Architectural Assessment

The architecture implements the multiple interchangeable implementations pattern behind a single OpenAPI 3.1 contract, which is a coherent and readable premise (`docs/ARCHITECTURE.md`, lines 30-47).

Each server shares the same request processing flow (authentication, route matching, validation, read/write paths) and a common `flock`-based file locking protocol, which enables interoperability between implementations.

The main architectural weakness is the triple replication of business logic. The three servers implement the same operations independently, with no shared abstraction layer or shared package, so every change must be replicated three times (`excel-api-node/src/excel/operations.ts`, `excel-api-java/src/main/java/pl/alyx/api/excel/service/ExcelService.java`, `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`).

The second weakness is the divergent implementation maturity. Node and Java enforce the full authentication pipeline (`excel-api-node/src/server.ts`, lines 171-175, `excel-api-java/.../WebSecurityConfig.java`, lines 31-40), while C# remains a skeleton without real authentication, queue, and locks. This undermines the declared interchangeability of implementations (decision A-01).

The local file-system-based model is simple and adequate for the declared goals (no cloud backends, `docs/ARCHITECTURE.md` lines 40-42), but it limits horizontal scaling and creates a single point of failure without a shared file system.

---

# Strengths & What's Working

- The OpenAPI 3.1 contract as a single source of truth with consistency verification by `shell/sync-openapi.sh` (SHA256 comparison before copying to implementations).
- The Node implementation uses a strict TypeScript configuration (`strict`, `noUnusedLocals`, `exactOptionalPropertyTypes`) in `excel-api-node/tsconfig.json`, limiting classes of type errors.
- Node and Java enforce the full authentication pipeline (JWT, static tokens, ACL scope checks) on all data routes.
- Consistent structured JSON logging across all servers, with an identical field format (`excel-api-java/.../logging/JsonLayout.java`, `excel-api-csharp/.../Logging/JsonConsoleFormatter.cs`, `excel-api-node/src/logger/index.ts`).
- `/health` and `/metrics` endpoints (Prometheus/OpenMetrics format) present in all three servers.
- All Dockerfiles use multi-stage builds, Alpine images, and a non-root user (e.g., `excel-api-csharp/Dockerfile`, `excel-api-java/Dockerfile`, `excel-api-node/Dockerfile`).
- The Go client relies solely on the standard library (empty `go.sum`), uses secure TLS defaults, a 30 s timeout, and context-wrapped errors.
- Permission check on the `access.yaml` file with a warning when permissions are not `0600` (`excel-api-node/src/config/loader.ts`, `excel-api-csharp/src/ExcelApi/Config/ConfigLoader.cs`).
- A black-box integration test suite run via `docker-compose.test.yaml` with a `healthcheck` gate before test execution.
- The Node implementation correctly uses `bcrypt.compare` for password verification, and example files contain only placeholders, no real secrets.

---

# Detailed Technical Findings

## Summary Table

| Finding ID  | Pillar                      | Severity | Title                                                           | Status  | Remediation Status |
|-------------|-----------------------------|----------|-----------------------------------------------------------------|---------|--------------------|
| FND-ARC-001 | Architecture & Design       | MEDIUM   | Triple logic replication without a shared abstraction           | PARTIAL | Open               |
| FND-ARC-002 | Architecture & Design       | MEDIUM   | Scaling limited by the local file system model                  | PARTIAL | Open               |
| FND-ARC-003 | Architecture & Design       | HIGH     | Divergent implementation maturity undermines interchangeability | PARTIAL | Open               |
| FND-ARC-004 | Architecture & Design       | LOW      | Documentation and version inconsistencies                       | PARTIAL | Open               |
| FND-CQ-001  | Code Quality                | MEDIUM   | No input validation at API boundaries                           | PARTIAL | Open               |
| FND-CQ-002  | Code Quality                | LOW      | Compiled binary artifact committed to the repository            | FAIL    | Open               |
| FND-CQ-003  | Code Quality                | LOW      | Skeletal tests and unenforced quality rules                     | PARTIAL | Open               |
| FND-SEC-001 | Security & Compliance       | HIGH     | Broad CORS configuration in all servers                         | PARTIAL | Open               |
| FND-SEC-002 | Security & Compliance       | HIGH     | TLS disabled by default, plaintext HTTP transmission            | PARTIAL | Open               |
| FND-SEC-003 | Security & Compliance       | CRITICAL | No authentication enforcement in the C# implementation          | FAIL    | Open               |
| FND-SEC-004 | Security & Compliance       | HIGH     | Plaintext password comparison in the Java implementation        | FAIL    | Open               |
| FND-SEC-005 | Security & Compliance       | MEDIUM   | No rate limiting and no security headers                        | FAIL    | Open               |
| FND-SEC-006 | Security & Compliance       | MEDIUM   | Static tokens and secrets stored and compared in plaintext      | PARTIAL | Open               |
| FND-INF-001 | Infrastructure & CI/CD      | CRITICAL | No CI/CD pipeline                                               | FAIL    | Open               |
| FND-INF-002 | Infrastructure & CI/CD      | HIGH     | No write queue or file locking in C#                            | FAIL    | Open               |
| FND-INF-003 | Infrastructure & CI/CD      | MEDIUM   | Missing vulnerability scanning, SBOM, and some lockfiles        | PARTIAL | Open               |
| FND-INF-004 | Infrastructure & CI/CD      | MEDIUM   | No HEALTHCHECK in Dockerfiles and no operational procedures     | PARTIAL | Open               |
| FND-INF-005 | Infrastructure & CI/CD      | MEDIUM   | Limited observability - no tracing or alerts                    | PARTIAL | Open               |
| FND-AIP-001 | AI Provenance & Code Origin | MEDIUM   | Generated-code risk patterns and no AI policy                   | PARTIAL | Open               |
| FND-CPR-001 | Copyrights & Originality    | LOW      | No license headers or dependency license verification           | PARTIAL | Open               |

## Detailed Findings

### FND-ARC-001: Triple logic replication without a shared abstraction

* **Pillar:** Architecture & Design
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-node/src/excel/operations.ts`, `excel-api-java/src/main/java/pl/alyx/api/excel/service/ExcelService.java`, `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`
* **Description:** The three servers implement the same sheet-operation logic independently, without a shared library or abstraction layer. This is a deliberate trade-off for interchangeability (decision A-01), but it introduces triple maintenance cost.
* **Impact:** Every functional change or bug fix must be manually replicated three times, increasing the risk of behavioral divergence between implementations.
* **Remediation Recommendation:** Consider shared contract tests enforcing identical behavior, where possible extract common rules into an executable specification. Maintain the OpenAPI contract as the single source of truth.
* **Verification Method:** Running the same integration test suite against each implementation (`IMAGE=... docker compose -f docker-compose.test.yaml up`) and confirming identical results.

### FND-ARC-002: Scaling limited by the local file system model

* **Pillar:** Architecture & Design
* **Severity:** Medium
* **Target Files/Modules:** `docs/ARCHITECTURE.md` (lines 40-42), lock/queue layer in all servers
* **Description:** The data model relies on a local or network file system, without cloud backends. This is adequate for the declared goals, but limits horizontal scaling and creates a single point of failure.
* **Impact:** Running multiple instances requires a shared file system with correct locking, without it horizontal scaling is impossible without conflict risk.
* **Remediation Recommendation:** Document the scaling limits, if a higher scale is required, consider shared storage with correct lock semantics or a database backend. Leave the decision to the product owner.
* **Verification Method:** Load test of multiple instances on a shared volume and observation of lock behavior and data consistency.

### FND-ARC-003: Divergent implementation maturity undermines interchangeability

* **Pillar:** Architecture & Design
* **Severity:** High
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Program.cs`, `excel-api-csharp/src/ExcelApi/Endpoints/*.cs`, `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`
* **Description:** The Node and Java implementations enforce authentication, queue, and locks, while C# remains a skeleton (placeholder authentication, no queue or locks). The declared implementation interchangeability is therefore not met for C#.
* **Impact:** Selecting the C# implementation in production results in a materially different (and weaker) security and integrity profile than Node/Java, despite the shared contract.
* **Remediation Recommendation:** Align the C# implementation's maturity to the Node/Java level or unambiguously mark it as not production-ready in documentation and release artifacts.
* **Verification Method:** Running the integration test suite (including auth, lock, and concurrency scenarios) against the C# implementation and confirming parity with Node/Java.

### FND-ARC-004: Documentation and version inconsistencies

* **Pillar:** Architecture & Design
* **Severity:** Low
* **Target Files/Modules:** `docs/PROJECT.md` (Vitest mentions), `excel-api-test/package.json` (Jest), `excel-api-csharp/src/ExcelApi/Endpoints/HealthEndpoints.cs`
* **Description:** The `docs/PROJECT.md` documentation describes the test suite as Vitest, while the implementation uses Jest (`excel-api-test/package.json`, `jest.config.ts`). The C# `/health` endpoint returns version `0.0.1`, although the project is at version `0.0.2`.
* **Impact:** Inconsistencies are misleading during deployment and diagnostics and hinder unambiguous reasoning about the system's state.
* **Remediation Recommendation:** Unify the test framework naming in the documentation and synchronize the version field in the `/health` endpoint with the artifact version.
* **Verification Method:** Review of the documentation and `/health` responses after correction, checking consistency with `CHANGELOG.md`.

### FND-CQ-001: No input validation at API boundaries

* **Pillar:** Code Quality
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-node/src/routes/*.ts`, `excel-api-java/.../controller/*.java`, `excel-api-csharp/src/ExcelApi/Dto/*.cs`
* **Description:** Route parameters and request bodies are not validated at the API boundary. Node does not apply Zod schemas to parameters and bodies, Java does not use `@Valid` in controllers, and C# DTOs have no validation attributes. The Zod library is declared but unused for route validation.
* **Impact:** Malformed input can lead to runtime errors or inconsistent responses, type safety is lost at the request boundary.
* **Remediation Recommendation:** Introduce schema validation (Zod in Node, `@Valid` + constrained DTOs in Java, validation attributes in C#) for path, query, and request body parameters.
* **Verification Method:** Negative tests with invalid cell references, indexes, and value types, expected `400` responses with a structured error.

### FND-CQ-002: Compiled binary artifact committed to the repository

* **Pillar:** Code Quality
* **Severity:** Low
* **Target Files/Modules:** `excel-api-go/excel-api-go`, `excel-api-go/.gitignore`
* **Description:** The compiled ELF executable `excel-api-go/excel-api-go` is tracked in the repository (confirmed by `git ls-files`). The `.gitignore` file ignores the `bin/` directory but not binaries in the module root.
* **Impact:** Binary artifacts increase repository size, cause merge conflicts, and obscure real code changes.
* **Remediation Recommendation:** Remove the executable from tracking and add a pattern to `.gitignore`. Binary builds should happen in a pipeline or locally.
* **Verification Method:** `git ls-files excel-api-go/` shows no binary artifact, the build reproduces the binary from a clean tree.

### FND-CQ-003: Skeletal tests and unenforced quality rules

* **Pillar:** Code Quality
* **Severity:** Low
* **Target Files/Modules:** `excel-api-test/integration/*.test.ts`, `excel-api-csharp/src/ExcelApi.Test/UnitTest1.cs`, `excel-api-node/.eslintrc.json`, `excel-api-java/checkstyle.xml`, `excel-api-csharp/src/ExcelApi/ExcelApi.csproj`
* **Description:** Some integration tests are placeholders (e.g., `concurrency.test.ts`, `locking.test.ts`, `sheets.test.ts` contain `expect(true).toBe(true)`). C# contains an empty `UnitTest1.cs` class. ESLint in Node disables `no-unused-vars`, checkstyle in Java is not bound to the build phase, and C# suppresses the `AD0001` warning (`NoWarn`).
* **Impact:** Real coverage of critical paths (locking, concurrency, record operations) is lower than the test file count suggests, quality rules are not enforced.
* **Remediation Recommendation:** Complete the skeletal integration tests, remove placeholders, enable checkstyle/ESLint enforcement in the build, and document or remove the `AD0001` suppression.
* **Verification Method:** Coverage report with thresholds, the build fails on quality rule violations.

### FND-SEC-001: Broad CORS configuration in all servers

* **Pillar:** Security & Compliance
* **Severity:** High
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Program.cs` (lines 28-36, 52-57), `excel-api-java/.../config/CorsFilterConfiguration.java`, `excel-api-node/src/server.ts` (lines 161-165)
* **Description:** C# configures `AllowAnyOrigin`/`AllowAnyMethod`/`AllowAnyHeader` (twice). Java combines `addAllowedOrigin("*")` with `setAllowCredentials(true)`, a particularly risky combination. Node uses `origin: true`, reflecting any origin.
* **Impact:** A broad CORS allows cross-origin requests from any site, increasing the attack surface for CSRF and unauthorized browser access.
* **Trade-off Description:** The configuration eases development and testing but is inappropriate for a production environment. See the Trade-off Analysis section.
* **Remediation Recommendation:** Restrict CORS to an explicit list of allowed origins, methods, and headers, in Java avoid combining wildcard origin with `allowCredentials(true)`.
* **Verification Method:** A request from a disallowed origin receives no CORS headers, an integration test verifying the policy.

### FND-SEC-002: TLS disabled by default, plaintext HTTP transmission

* **Pillar:** Security & Compliance
* **Severity:** High
* **Target Files/Modules:** `*/config/config.example.yaml` (`tls.enabled: false`), `excel-api-csharp/src/ExcelApi/Program.cs` (line 127)
* **Description:** TLS is disabled by default in all example configurations, and the C# server listens on `http://0.0.0.0:8443`. In Node the `tls.enabled` flag is read but not used to start HTTPS.
* **Impact:** Authentication tokens and data are transmitted in plaintext, exposing them to eavesdropping and man-in-the-middle attacks.
* **Remediation Recommendation:** Enable TLS at the application layer or enforce HTTPS via reverse proxy/TLS termination, document the mandatory certificate configuration for production.
* **Verification Method:** An HTTP connection attempt in a production environment is rejected or redirected, connection encryption confirmed.

### FND-SEC-003: No authentication enforcement in the C# implementation

* **Pillar:** Security & Compliance
* **Severity:** Critical
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Program.cs` (lines 96-103), `excel-api-csharp/src/ExcelApi/Endpoints/AuthEndpoints.cs` (lines 42-66), `excel-api-csharp/src/ExcelApi/Endpoints/WorkbookEndpoints.cs`
* **Description:** The program does not register authentication/authorization middleware, and the `/auth/token` endpoint returns `dummy-token` for the hardcoded credentials `test-client`/`test-secret`. Data endpoints do not require a valid token. The declared `JwtBearer` and `BCrypt.Net-Next` packages are unused.
* **Impact:** Any client with network access can read and modify sheet data without authentication, which is a complete access-control bypass.
* **Remediation Recommendation:** Implement real JWT authentication (signature and expiry validation) and scope-based authorization, add `UseAuthentication`/`UseAuthorization`, and remove the placeholder credentials.
* **Verification Method:** Requests without a valid token receive `401`, requests with insufficient scope receive `403`, integration auth tests pass for C#.

### FND-SEC-004: Plaintext password comparison in the Java implementation

* **Pillar:** Security & Compliance
* **Severity:** High
* **Target Files/Modules:** `excel-api-java/src/main/java/pl/alyx/api/excel/controller/AuthController.java` (lines 160-166)
* **Description:** The `validateUser` method compares the submitted password directly to the `passwordHash` field (`u.getPasswordHash().equals(password)`), without using bcrypt, despite the declared `spring-security-crypto` dependency. Example files store passwords as bcrypt hashes (`$2b$...`), so a correct password will never match, and any match would require storing the password in plaintext.
* **Impact:** The `password` grant mechanism is either non-functional or - if passwords are stored in plaintext - dangerous. The lack of bcrypt verification undermines authentication integrity.
* **Remediation Recommendation:** Apply `PasswordEncoder`/bcrypt for password verification against the stored hash and use a constant-time comparison.
* **Verification Method:** Unit and integration test of the `password` grant with correct and incorrect passwords against a bcrypt hash.

### FND-SEC-005: No rate limiting and no security headers

* **Pillar:** Security & Compliance
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-node/src/server.ts`, `excel-api-java/.../config/*`, `excel-api-csharp/src/ExcelApi/Program.cs`
* **Description:** None of the servers implements request rate limiting or security headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`, HSTS).
* **Impact:** The authentication endpoint is vulnerable to brute-force and credential-stuffing attacks, and the API to resource exhaustion (DoS).
* **Remediation Recommendation:** Introduce rate limiting (e.g., on `/auth/token`) and security headers, in Node consider `@fastify/rate-limit` and `@fastify/helmet`.
* **Verification Method:** A limit-exceeded test returns `429`, expected security headers present in responses.

### FND-SEC-006: Static tokens and secrets stored and compared in plaintext

* **Pillar:** Security & Compliance
* **Severity:** Medium
* **Target Files/Modules:** `*/config/access.example.yaml`, `excel-api-node/src/auth/jwt.ts`, `excel-api-java/.../security/StaticTokenAuthenticationFilter.java`
* **Description:** Static tokens and OAuth2 client secrets are stored in plaintext in configuration and compared by string equality, without hashing or rotation. Example files contain only placeholders (not real secrets).
* **Impact:** Disclosure of a configuration file results in immediate token compromise, the lack of rotation and revocation hinders incident response.
* **Remediation Recommendation:** Hash static tokens and secrets, use constant-time comparison, and introduce a rotation and revocation mechanism.
* **Verification Method:** Code inspection confirming no plaintext comparison, a rotation test revoking the previous token.

### FND-INF-001: No CI/CD pipeline

* **Pillar:** Infrastructure & CI/CD
* **Severity:** Critical
* **Target Files/Modules:** repository root (no `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`)
* **Description:** No CI/CD configuration was found. Tests and linters exist but are not run automatically on changes.
* **Impact:** The lack of a quality gate allows regressions to be introduced, test and code quality degrades over time without automated verification.
* **Remediation Recommendation:** Introduce a pipeline (e.g., GitHub Actions) running builds, lint, unit and integration tests for all components, and coverage gates.
* **Verification Method:** A pull request triggers the pipeline, merging is blocked on failed tests or threshold violations.

### FND-INF-002: No write queue or file locking in C#

* **Pillar:** Infrastructure & CI/CD
* **Severity:** High
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs` (lines 245-263), `excel-api-csharp/src/ExcelApi/Endpoints/WorkbookEndpoints.cs` (lines 54-67)
* **Description:** The C# implementation writes the file directly (open, write, release) without a lock or queue, and the lock status endpoint returns hardcoded `locked: false`, `queue_depth: 0` values. The architecture declares a shared lock protocol and queuing that C# does not implement.
* **Impact:** Concurrent writes can corrupt the file or overwrite changes, the lack of lock interoperability with Node/Java undermines the shared protocol.
* **Remediation Recommendation:** Implement a write queue and file locking compliant with the protocol described in `docs/ARCHITECTURE.md`, including a real lock status.
* **Verification Method:** A concurrent-write test to the same workbook causes no data loss, lock status reflects the actual state.

### FND-INF-003: Missing vulnerability scanning, SBOM, and some lockfiles

* **Pillar:** Infrastructure & CI/CD
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-java/pom.xml`, `excel-api-csharp/src/ExcelApi/ExcelApi.csproj`, `excel-api-node/package-lock.json`
* **Description:** No dependency vulnerability scanning or SBOM generation in any component. Node has `package-lock.json`, but C# has no `packages.lock.json`, and Java does not pin transitive dependency versions. The Go client has no external dependencies.
* **Impact:** Vulnerabilities in dependencies may go undetected, builds are not fully reproducible for C#/Java.
* **Remediation Recommendation:** Add vulnerability scanning (e.g., `npm audit`, `dotnet list package --vulnerable`, OWASP Dependency-Check), generate an SBOM, and enable lockfiles for C#/Java.
* **Verification Method:** The pipeline reports vulnerabilities and an SBOM artifact, lockfiles present for all package managers.

### FND-INF-004: No HEALTHCHECK in Dockerfiles and no operational procedures

* **Pillar:** Infrastructure & CI/CD
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-node/Dockerfile`, `excel-api-java/Dockerfile`, `excel-api-csharp/Dockerfile`, `docs/DEPLOYMENT.md`
* **Description:** The Dockerfiles do not define a `HEALTHCHECK` instruction (although `docker-compose.yaml` defines a service-level healthcheck). There are no documented runbooks, backup, or rollback procedures.
* **Impact:** Orchestrators running the images alone have no container-health signal, the lack of operational procedures hinders incident response and recovery.
* **Remediation Recommendation:** Add `HEALTHCHECK` to the images, document runbooks, backup procedures, and a rollback strategy.
* **Verification Method:** `docker inspect` shows the health status, review of operational documentation.

### FND-INF-005: Limited observability - no tracing or alerts

* **Pillar:** Infrastructure & CI/CD
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Endpoints/HealthEndpoints.cs`, `excel-api-node/src/metrics/collector.ts`, `excel-api-java/.../controller/MetricsController.java`
* **Description:** JSON logs and `/health` and `/metrics` endpoints are present, but C# metrics are limited to uptime and implementation info. There is no request correlation (trace/request ID), distributed tracing, or alerting.
* **Impact:** Diagnosing production issues is harder, there is no proactive anomaly detection.
* **Remediation Recommendation:** Extend metrics (request counts, errors, latencies), introduce correlation identifiers, and consider tracing (e.g., OpenTelemetry) and alerting rules.
* **Verification Method:** Request/error/latency metrics present, logs correlatable by request ID.

### FND-AIP-001: Generated-code risk patterns and no AI policy

* **Pillar:** AI Provenance & Code Origin
* **Severity:** Medium
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Endpoints/AuthEndpoints.cs`, `excel-api-csharp/src/ExcelApi/Program.cs`, `excel-api-test/integration/*.test.ts`, `docs/PROJECT.md`
* **Description:** There are no unambiguous markers of AI-generated code, but patterns often associated with it are present: the placeholder `dummy-token`, duplicated CORS configuration, skeletal `expect(true).toBe(true)` tests, and documentation inconsistencies. The repository does not define an AI usage policy in the SDLC.
* **Impact:** Without a policy and originality verification, the risk of inconsistencies and unverified fragments in the code grows.
* **Remediation Recommendation:** Establish an AI usage policy (review, originality verification, acceptance criteria) and strengthen code review for placeholder fragments.
* **Verification Method:** Documented policy present, review confirming removal of placeholder fragments.

### FND-CPR-001: No license headers or dependency license verification

* **Pillar:** Copyrights & Originality
* **Severity:** Low
* **Target Files/Modules:** `LICENSE.md`, `docs/COPYRIGHTS.md`, dependency manifests
* **Description:** The project is MIT-licensed (`LICENSE.md`, Filip Golewski, 2026), and `docs/COPYRIGHTS.md` defines the copyright policy. However, there are no license headers in source files and no SBOM. `docs/COPYRIGHTS.md` refers only to `package.json` as a manifest, omitting `pom.xml`, `*.csproj`, and `go.mod`. The main dependencies (Apache POI - Apache-2.0, ExcelJS - MIT, ClosedXML - MIT) comply with the declared license policy.
* **Impact:** The lack of SBOM and headers hinders license compliance audits, the incomplete manifest description may lead to dependencies being missed during verification.
* **Remediation Recommendation:** Add license headers or a `NOTICE` file, generate an SBOM, and update `docs/COPYRIGHTS.md` to cover all manifests (`pom.xml`, `*.csproj`, `go.mod`).
* **Verification Method:** SBOM and headers present, dependency license compatibility verified in the pipeline.

---

# Unified Risk Register

| Risk ID | Risk                                                          | Source Finding | Impact                                         | Likelihood | Severity | Mitigation                                                 |
|---------|---------------------------------------------------------------|----------------|------------------------------------------------|------------|----------|------------------------------------------------------------|
| RSK-001 | No CI/CD allows regressions to be introduced undetected       | FND-INF-001    | Quality degradation and regressions            | HIGH       | CRITICAL | Introduce a pipeline with quality gates                    |
| RSK-002 | Unauthenticated data access in the C# implementation          | FND-SEC-003    | Unauthorized read and modification of data     | MEDIUM     | CRITICAL | Implement real authentication and authorization            |
| RSK-003 | Broad CORS enables cross-origin requests                      | FND-SEC-001    | CSRF attacks, unauthorized browser access      | MEDIUM     | HIGH     | Restrict CORS to an origin list, separate from credentials |
| RSK-004 | Plaintext HTTP transmission without TLS                       | FND-SEC-002    | Token and data eavesdropping, MITM             | MEDIUM     | HIGH     | Enable TLS or TLS termination at a proxy                   |
| RSK-005 | No locking or queue in C# - data corruption under concurrency | FND-INF-002    | Data integrity loss                            | MEDIUM     | HIGH     | Implement the queue and file locking                       |
| RSK-006 | Non-functional or unsafe password verification in Java        | FND-SEC-004    | Authentication failure or weakening            | LOW        | HIGH     | Use bcrypt for password verification                       |
| RSK-007 | No rate limiting - brute-force and DoS attacks                | FND-SEC-005    | Resource exhaustion, credential compromise     | MEDIUM     | MEDIUM   | Introduce rate limiting and security headers               |
| RSK-008 | Divergent implementation maturity breaks interchangeability   | FND-ARC-003    | Weaker security profile when C# is selected    | MEDIUM     | MEDIUM   | Align maturity or mark C# as not ready                     |
| RSK-009 | Scaling limited by the local file system                      | FND-ARC-002    | No horizontal scaling, single point of failure | MEDIUM     | MEDIUM   | Document limits, consider shared storage                   |
| RSK-010 | No input validation at API boundaries                         | FND-CQ-001     | Runtime errors, inconsistent responses         | MEDIUM     | MEDIUM   | Introduce schema validation                                |
| RSK-011 | No vulnerability scanning and SBOM                            | FND-INF-003    | Undetected dependency vulnerabilities          | MEDIUM     | MEDIUM   | Add scanning, SBOM, and lockfiles                          |
| RSK-012 | Committed binary artifact in the repository                   | FND-CQ-002     | Merge conflicts, repository bloat              | HIGH       | LOW      | Remove the binary and add it to `.gitignore`               |
| RSK-013 | Static tokens and secrets stored in plaintext                 | FND-SEC-006    | Token compromise on configuration disclosure   | LOW        | LOW      | Hash tokens, introduce rotation                            |

---

# Trade-off Analysis

| Trade-off                                    | Context                                  | Option A: gain / cost                                                        | Option B: gain / cost                                          | Evidence                                       | Implication                                                                        |
|----------------------------------------------|------------------------------------------|------------------------------------------------------------------------------|----------------------------------------------------------------|------------------------------------------------|------------------------------------------------------------------------------------|
| Multiple implementations vs maintenance cost | Interchangeability proof (decision A-01) | Interchangeability and technology diversity / triple maintenance cost        | Single implementation / no interchangeability proof            | Three servers with independent operation logic | Interchangeability raises cost and divergence risk, contract tests needed          |
| Local FS vs scalability                      | No cloud backends (project goal)         | Simplicity and no external dependencies / no horizontal scaling              | Shared storage or database / additional operational complexity | `docs/ARCHITECTURE.md` lines 40-42             | The simple model fits the goals, a higher scale requires redesign                  |
| Delivery speed vs completeness (C#)          | Early stage of the C# implementation     | Fast skeleton and contract / no real auth, queue, or locks                   | Full implementation / longer delivery time                     | Placeholder auth and no locks in C#            | The skeleton speeds up the prototype but is not production-ready                   |
| Go standard library only                     | CLI client, small binary                 | No dependencies, security, small size / no ready-made features (e.g., retry) | External libraries / larger dependency surface                 | Empty `go.sum`, no retry logic in the client   | Simplicity and security at the cost of no built-in retry                           |
| SelfContained + ReadyToRun (C#)              | Container deployment                     | Fast startup, no runtime dependency / larger image, harder runtime patching  | Runtime dependency / smaller image, easier patching            | `ExcelApi.csproj` lines 9-10                   | Choice optimized for startup and self-sufficiency at the cost of size and patching |

---

# Actionable Remediation Roadmap

| Rec ID  | Priority | Finding     | Recommendation                                                            | Impact | Effort | Complexity | Verification                                                                        |
|---------|----------|-------------|---------------------------------------------------------------------------|--------|--------|------------|-------------------------------------------------------------------------------------|
| REC-001 | P1       | FND-INF-001 | Introduce a CI/CD pipeline with quality and coverage gates                | High   | Medium | Medium     | Pull request triggers build, lint, and tests, blocked on errors                     |
| REC-002 | P1       | FND-SEC-003 | Implement real authentication and authorization in C#                     | High   | Medium | Medium     | Requests without a token receive `401`, insufficient scope gets `403`               |
| REC-003 | P2       | FND-SEC-001 | Restrict CORS to an explicit origin list, separate from credentials       | High   | Low    | Low        | Request from a disallowed origin receives no CORS headers                           |
| REC-004 | P2       | FND-SEC-002 | Enable TLS or enforce HTTPS at the proxy layer                            | High   | Medium | Medium     | HTTP connection rejected or redirected, traffic encrypted                           |
| REC-005 | P2       | FND-INF-002 | Implement the write queue and file locking in C#                          | High   | High   | High       | Concurrent-write test without data loss                                             |
| REC-006 | P2       | FND-SEC-004 | Fix password verification in Java using bcrypt                            | High   | Low    | Low        | Test of the `password` grant against a bcrypt hash                                  |
| REC-007 | P3       | FND-SEC-005 | Introduce rate limiting and security headers                              | Medium | Medium | Low        | Limit exceeded returns `429`, headers present                                       |
| REC-008 | P3       | FND-CQ-001  | Introduce input validation (Zod / `@Valid` / attributes)                  | Medium | Medium | Medium     | Negative tests return `400` with a structured error                                 |
| REC-009 | P3       | FND-INF-003 | Add vulnerability scanning, SBOM, and lockfiles for C#/Java               | Medium | Medium | Medium     | Pipeline reports vulnerabilities, SBOM artifact present                             |
| REC-010 | P3       | FND-SEC-006 | Hash static tokens/secrets and introduce rotation                         | Medium | Medium | Medium     | No plaintext comparison, rotation revokes the previous token                        |
| REC-011 | P3       | FND-CQ-003  | Complete integration tests and establish coverage thresholds              | Medium | Medium | Medium     | Coverage report with thresholds, no placeholder tests                               |
| REC-012 | P3       | FND-ARC-003 | Align C# maturity or mark it as not production-ready                      | High   | High   | High       | Integration test parity between implementations                                     |
| REC-013 | P3       | FND-INF-004 | Add HEALTHCHECK to images plus runbooks and rollback/backup procedures    | Medium | Medium | Medium     | `docker inspect` shows health, operational documentation                            |
| REC-014 | P3       | FND-INF-005 | Extend metrics, add request correlation and alerts                        | Medium | Medium | Medium     | Request/error/latency metrics, log correlation                                      |
| REC-015 | P4       | FND-ARC-001 | Introduce shared contract tests limiting triplication                     | Medium | High   | High       | Shared test suite passes for all implementations                                    |
| REC-016 | P4       | FND-ARC-002 | Develop a scaling plan (shared storage/backend) in case scale is required | Medium | High   | High       | Multi-instance load test without conflicts                                          |
| REC-017 | P4       | FND-CQ-002  | Remove the committed binary artifact and add it to `.gitignore`           | Low    | Low    | Low        | `git ls-files` without the binary, build reproduces the artifact                    |
| REC-018 | P4       | FND-AIP-001 | Establish an AI usage policy in the SDLC                                  | Low    | Low    | Low        | Documented policy and acceptance criteria                                           |
| REC-019 | P4       | FND-CPR-001 | Add license headers, SBOM, and complete `docs/COPYRIGHTS.md`              | Low    | Medium | Low        | SBOM and headers present, full manifest list                                        |
| REC-020 | P4       | FND-ARC-004 | Fix documentation inconsistencies (Jest/Vitest) and the version field     | Low    | Low    | Low        | Documentation consistent with implementation, `/health` returns the correct version |

---

# Scope Exclusions

| Scope                                                  | Justification                                                      |
|--------------------------------------------------------|--------------------------------------------------------------------|
| Working runtime environment (servers, live containers) | NOT INSPECTED - the audit was based solely on static code analysis |
| Network topologies and firewall rules                  | NOT INSPECTED - outside the provided material                      |
| External identity provider implementations             | EXCLUDED BY SCOPE - the system uses its own authentication         |
| Physical deployment environments                       | NOT INSPECTED - no access                                          |
| Backups and disaster recovery procedures               | NOT INSPECTED - no documented procedures in the repository         |
| Penetration tests and external audits                  | EXCLUDED BY SCOPE - not part of this audit                         |
| Git commit history                                     | NOT INSPECTED - analysis limited to the current tree state         |

The audit was based on inspection of source code, configuration, and documentation in the repository's current state, honoring `.gitignore` exclusions. Conclusions about runtime behavior are extrapolations from static analysis and require confirmation in a running environment.
