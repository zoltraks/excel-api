# Excel API Software Audit Report

## Document Information

|                    |                                                                    |
|--------------------|--------------------------------------------------------------------|
| Report Revision    | 1.1                                                                |
| Report Date        | 2026-09-27                                                         |
| Detail Level       | Detailed                                                           |
| Evaluation Scale   | 1-10                                                               |
| Language           | English                                                            |
| Audit Purpose      | Engineering improvement                                            |
| Target Environment | Containerized deployment via Docker and Docker Compose             |
| Verification Scope | source-only                                                        |
| Subject Revision   | `df055f6`                                                          |
| Dirty-Tree State   | Modified - version-synchronization edits plus untracked `AUDYT.md` |
| Skill Version      | 1.5                                                                |
| Time taken         | 41:00                                                              |

## Audit Type Coverage & Assurance Matrix

|  | Report type                                              | Status         | Rationale                                                                                            |
|--|----------------------------------------------------------|----------------|------------------------------------------------------------------------------------------------------|
|  | Software Architecture Review                             | Covered        | Component diagram, layering, and contract posture inspected across all modules                       |
|  | Code Quality Audit                                       | Covered        | Source, tests, and error handling inspected for all five components                                  |
|  | Security Vulnerability Assessment                        | Covered        | Authentication, authorization, transport, [CORS](#glossary), and secret handling reviewed statically |
|  | Open Source License Compliance Review                    | Covered        | Manifest-derived inventory classified against the declared license policy                            |
|  | Penetration Test                                         | Not done       | Source-only audit, no execution - see Scope Exclusions                                               |
|  | Performance Audit                                        | Partially      | [NFR](#glossary) design reviewed, no load measurement possible without execution                     |
|  | Cloud Infrastructure Audit                               | Partially      | Dockerfiles and Compose inspected, no live environment state                                         |
|  | AI Governance Audit                                      | Not Applicable | The subject does not train, serve, or depend on an AI system                                         |
|  | Technical Due Diligence                                  | Partially      | Engineering dimensions covered, interview-based pillars out of scope                                 |
|  | [SBOM](#glossary) / Software Composition Analysis        | Covered        | Manifest-derived component inventory produced in the [SBOM](#glossary) section                       |
|  | Compliance Certification (SOC 2, [ISO](#glossary) 27001) | Not done       | Standards applied as rubrics only, not a certification engagement                                    |

## Glossary

| Term                                   | Definition                                                                                                            |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| ACL                                    | Access Control List - scope-to-method permission rules loaded from `access.yaml`                                      |
| API                                    | Application Programming Interface - the HTTP contract between client and server                                       |
| ASCII                                  | American Standard Code for Information Interchange - plain-text character set used in this report                     |
| ASVS                                   | Application Security Verification Standard - OWASP control catalogue                                                  |
| CI/CD                                  | Continuous Integration / Continuous Delivery - automated build, test, and release pipeline                            |
| CISQ                                   | Consortium for Information and Software Quality - structural quality and debt categorization                          |
| CORS                                   | Cross-Origin Resource Sharing - browser policy governing cross-origin requests                                        |
| CVSS                                   | Common Vulnerability Scoring System - vulnerability severity scoring                                                  |
| CWE                                    | Common Weakness Enumeration - classification for software weaknesses                                                  |
| DORA                                   | DevOps Research and Assessment - delivery-performance metrics                                                         |
| ELF                                    | Executable and Linkable Format - native binary format of the committed Go artifact                                    |
| [EVD](#evd-evidence-id)                | Evidence ID - ledger row identifier used in this report                                                               |
| [FND](#fnd-finding-id)                 | Finding ID - technical finding identifier used in this report                                                         |
| HMAC                                   | Hash-based Message Authentication Code - signing scheme behind HS256 JWT tokens                                       |
| HTTP(S)                                | HyperText Transfer Protocol, optionally secured by TLS - the API transport                                            |
| IP                                     | Intellectual Property - ownership and licensing of code and dependencies                                              |
| ISO                                    | International Organization for Standardization - publisher of ISO/IEC 25010                                           |
| JSON                                   | JavaScript Object Notation - API response serialization format                                                        |
| JWT                                    | JSON Web Token - signed bearer token issued by `/auth/token`                                                          |
| N/A                                    | Not applicable - marks a dimension or rule that does not apply to this subject                                        |
| NFR                                    | Non-Functional Requirement - quality attribute such as latency or availability                                        |
| NIST                                   | National Institute of Standards and Technology - publisher of SP 800-30 and the RMF                                   |
| OAuth2                                 | Authorization framework - password and client-credentials grants on `/auth/token`                                     |
| OWASP                                  | Open Worldwide Application Security Project - publisher of Top 10 and ASVS                                            |
| P1-P4                                  | Remediation priority tiers - P1 immediate, P2 short-term, P3 medium-term, P4 long-term                                |
| [PAR](#par-parity-check-id)            | Parity check ID - mandatory core checklist row in the Validation Record                                               |
| [REC](#rec-recommendation-id)          | Recommendation ID - remediation roadmap entry identifier                                                              |
| REPL                                   | Read-Eval-Print Loop - interactive mode of the Go CLI client                                                          |
| [RPO](#rpo-recovery-point-objective)   | Recovery Point Objective - tolerable data loss measured as time                                                       |
| [RSK](#rsk-risk-id)                    | Risk ID - unified risk register entry identifier                                                                      |
| [RTO](#rto-recovery-time-objective)    | Recovery Time Objective - tolerable restoration time after failure                                                    |
| SBOM                                   | Software Bill of Materials - inventory of software components                                                         |
| SDK                                    | Software Development Kit - .NET toolchain used to build the C# server                                                 |
| [SLO](#slo-service-level-objective)    | Service Level Objective - measurable service-quality target                                                           |
| SPDX                                   | Software Package Data Exchange - standard SBOM and license-expression format                                          |
| SQALE                                  | Software Quality Assessment based on Lifecycle Expectations - technical-debt cost model                               |
| STRIDE                                 | Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege - threat taxonomy |
| [TDR](#tdr-technical-debt-register-id) | Technical Debt Register ID - debt register entry identifier                                                           |
| TLS                                    | Transport Layer Security - transport encryption for HTTPS                                                             |
| URL                                    | Uniform Resource Locator - address of endpoints and resources                                                         |
| YAML                                   | YAML Ain't Markup Language - format of `config.yaml`, `access.yaml`, and the contract                                 |

### EVD (Evidence ID)

An identifier of the form EVD-NNN naming a row in the Verification And Evidence Ledger.

Every finding cites the ledger rows it was derived from, which lets a re-audit re-run the same
inspection path.

### FND (Finding ID)

An identifier of the form FND-PILLAR-NNN naming an assessed state or defect.

The pillar segment groups findings under Architecture, Code Quality, Security, Infrastructure,
AI Provenance, and Copyrights categories.

### PAR (Parity Check ID)

An identifier of the form PAR-N naming a mandatory core checklist requirement.

The Validation Record renders one row per PAR item so a future report can diff the capability
set mechanically.

### REC (Recommendation ID)

An identifier of the form REC-NNN naming an Actionable Remediation Roadmap entry.

Every recommendation resolves at least one finding and carries a priority tier.

### RPO (Recovery Point Objective)

A target for tolerable data loss measured as time, for example "lose at most five minutes of
writes".

No RPO is declared for this subject, so the audit cannot judge whether the file-system store and
its absence of backup tooling meet the organization's loss tolerance.

### RSK (Risk ID)

An identifier of the form RSK-NNN naming a Unified Risk Register entry.

Every risk references the finding that produced it and carries impact and likelihood ratings
rated from evidence.

### RTO (Recovery Time Objective)

A target for tolerable restoration time after failure, for example "service restored within one
hour".

No RTO is declared for this subject, and the repository contains no recovery runbook.

### SLO (Service Level Objective)

A measurable target for service quality, for example "p95 read latency under 300ms" or "99.9%
availability".

No SLOs are declared for this subject, so NFR judgments in this report are qualitative.

### TDR (Technical Debt Register ID)

An identifier of the form TDR-NNN naming an entry in the Technical Debt Register.

Debt describes accumulated cost already present in the codebase, distinct from risks that
describe what could go wrong.

## Executive Summary

Score bands: 1-3 Poor, 4-6 Average, 7-8 Good, 9-10 Excellent.

| Field          | Value                                                                                                                                 |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------|
| System type    | Codebase under development                                                                                                            |
| Scope          | Three interchangeable [API](#glossary) servers, one Go CLI, integration test suite, shared OpenAPI contract, Docker deployment assets |
| Source basis   | Inspected code                                                                                                                        |
| Maturity level | Early development                                                                                                                     |
| Overall score  | 3.9/10 (Poor)                                                                                                                         |

Lowest-scoring dimension: Security at 2/10, capped by unresolved CRITICAL findings in the C#
server.

Excel API is a contract-first, multi-language project exposing Excel workbooks over [HTTP](#glossary) through
three interchangeable server implementations plus a Go CLI client.

The architecture is coherent on paper and the shared contract, configuration, and lockfile
protocols are documented in detail.

The implementation is materially behind that contract: the C# server lacks real authentication,
the Java server lacks scope authorization and password verification, no server implements the
declared batch endpoints, and several documented behaviors such as range reads and record
insertion are defective in all three servers.

These conditions justify the Early development maturity rating rather than pre-production.

This report covers the engineering audit types.

No penetration test or compliance certification was performed.

Contributor concentration is High: all 19 inspected commits carry a single author identity.

**Production Readiness Threshold**

Production-ready status for the documented Docker deployment requires at minimum: real
authentication and scope enforcement in all three servers (RSK-001, RSK-003), [TLS](#glossary) or an
authenticated terminating proxy (RSK-002), working write paths that do not overwrite or corrupt
data (RSK-004, RSK-005, RSK-006), and a container deployment that starts from the shipped
compose configuration (RSK-007).

Readiness cost: `INSUFFICIENT INFORMATION` - the roadmap below carries qualitative effort
ratings only, and no rate or capacity data was provided to convert them into cost.

## System Context

| Aspect                 | Detail                                                                                    |
|------------------------|-------------------------------------------------------------------------------------------|
| Functional description | REST API exposing Excel workbook data, cell and record level reads and writes             |
| Architecture overview  | Contract-first, three interchangeable servers, one shared CLI client, file-system storage |
| Key components         | excel-api-node, excel-api-java, excel-api-csharp, excel-api-go, excel-api-test            |
| External dependencies  | ExcelJS, Apache POI, ClosedXML, Fastify, Spring Boot, ASP.NET Core, jjwt, bcrypt          |
| Assumptions            | NOT SPECIFIED                                                                             |

### Technology Stack

| Layer            | Technology                                                                                                   |
|------------------|--------------------------------------------------------------------------------------------------------------|
| Languages        | TypeScript 5.5, Java 21, C# on .NET 8, Go 1.22                                                               |
| Frameworks       | Fastify 4.28, Spring Boot 3.3.0, ASP.NET Core minimal [APIs](#glossary), Go flag/stdlib                      |
| Runtime/Platform | Node.js 22, JVM 21, .NET 8 runtime-deps, Go 1.22, Alpine Linux containers                                    |
| Build tooling    | tsc/npm, Maven, dotnet publish, go build, multi-stage Dockerfiles                                            |
| Test tooling     | Vitest, JUnit 5, MSTest, go test, Jest integration suite                                                     |
| Package manager  | npm with lockfile, Maven Central, NuGet, Go modules                                                          |
| Key libraries    | ExcelJS 4.4, poi-ooxml 5.2.5, ClosedXML 0.102.3, zod, jsonwebtoken, jjwt 0.12.5, BCrypt.Net-Next, YamlDotNet |
| Data stores      | Local file system for `*.xlsx` workbooks and `*.lock` advisory lockfiles                                     |
| Target platforms | Docker containers on port 8443 under base path `/api/v1`, CLI binary for end users                           |

### Server Implementations

The three servers are designed to be interchangeable behind the same contract.

`excel-api-node` is a Fastify application with a layered layout: routes, auth middleware, an
ExcelJS service layer, a lockfile module, an mtime cache, and a write-queue module.

`excel-api-java` is a Spring Boot application with controllers, an Apache POI service, servlet
filters for [JWT](#glossary) and static tokens, and YAML-backed configuration.

`excel-api-csharp` is an ASP.NET Core minimal-API application with endpoint groups and a
ClosedXML service layer.

The implementations are at very different depths: Node is the most complete, Java is partial,
and C# is largely a stub for authentication, locking, and write serialization.

### Go CLI Client

`excel-api-go` is a standard-library-only command-line client with a [REPL](#glossary) mode, shell
completion generation, and formatting helpers.

It consumes the same endpoints the servers expose.

### Test Suite and Tooling

`excel-api-test` is a black-box Jest suite intended to run against any of the three servers via
`docker-compose.test.yaml`.

`shell/sync-openapi.sh` propagates the canonical contract into each implementation's resources.

### Operational Objectives

| Metric                               | Target        | Measured | Window        | Source        | Owner         |
|--------------------------------------|---------------|----------|---------------|---------------|---------------|
| Availability SLO                     | NOT SPECIFIED | UNKNOWN  | NOT SPECIFIED | none declared | NOT SPECIFIED |
| Latency SLO                          | NOT SPECIFIED | UNKNOWN  | NOT SPECIFIED | none declared | NOT SPECIFIED |
| Error budget                         | NOT SPECIFIED | UNKNOWN  | NOT SPECIFIED | none declared | NOT SPECIFIED |
| [RPO](#rpo-recovery-point-objective) | NOT SPECIFIED | UNKNOWN  | NOT SPECIFIED | none declared | NOT SPECIFIED |
| [RTO](#rto-recovery-time-objective)  | NOT SPECIFIED | UNKNOWN  | NOT SPECIFIED | none declared | NOT SPECIFIED |

## Software Bill of Materials

The table below is a manifest-derived component inventory at revision `df055f6`.

It is not a shipped-artifact [SBOM](#glossary) and makes no [SPDX](#glossary) or CycloneDX conformance claim.

|  | Component                                     | Version | Ecosystem                                                          | Relationship | License | License Risk | Advisory Checked | Source File                                             |
|--|-----------------------------------------------|---------|--------------------------------------------------------------------|--------------|---------|--------------|------------------|---------------------------------------------------------|
|  | fastify                                       | ^4.28.0 | pkg:npm/fastify                                                    | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | @fastify/cors                                 | ^9.0.0  | pkg:npm/@fastify/cors                                              | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | exceljs                                       | ^4.4.0  | pkg:npm/exceljs                                                    | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | jsonwebtoken                                  | ^9.0.0  | pkg:npm/jsonwebtoken                                               | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | bcrypt                                        | ^5.1.0  | pkg:npm/bcrypt                                                     | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | yaml                                          | ^2.4.0  | pkg:npm/yaml                                                       | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | zod                                           | ^3.23.0 | pkg:npm/zod                                                        | direct       | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | typescript                                    | ^5.5.0  | pkg:npm/typescript                                                 | development  | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | vitest                                        | ^2.0.0  | pkg:npm/vitest                                                     | development  | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | eslint                                        | ^8.56.0 | pkg:npm/eslint                                                     | development  | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | prettier                                      | ^3.3.0  | pkg:npm/prettier                                                   | development  | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | tsx                                           | ^4.0.0  | pkg:npm/tsx                                                        | development  | Unknown | Unknown      | N                | excel-api-node/package.json                             |
|  | spring-boot-starter-web                       | 3.3.0   | pkg:maven/org.springframework.boot/spring-boot-starter-web         | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | spring-boot-starter-security                  | 3.3.0   | pkg:maven/org.springframework.boot/spring-boot-starter-security    | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | spring-security-crypto                        | 3.3.0   | pkg:maven/org.springframework.security/spring-security-crypto      | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | poi-ooxml                                     | 5.2.5   | pkg:maven/org.apache.poi/poi-ooxml                                 | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | snakeyaml                                     | managed | pkg:maven/org.yaml/snakeyaml                                       | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | jackson-dataformat-yaml                       | managed | pkg:maven/com.fasterxml.jackson.dataformat/jackson-dataformat-yaml | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | jjwt-api/impl/jackson                         | 0.12.5  | pkg:maven/io.jsonwebtoken/jjwt                                     | direct       | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | logstash-logback-encoder                      | 7.4     | pkg:maven/net.logstash.logback/logstash-logback-encoder            | direct       | Unknown | Review       | N                | excel-api-java/pom.xml                                  |
|  | spring-boot-starter-test                      | 3.3.0   | pkg:maven/org.springframework.boot/spring-boot-starter-test        | test         | Unknown | Unknown      | N                | excel-api-java/pom.xml                                  |
|  | ClosedXML                                     | 0.102.3 | pkg:nuget/ClosedXML                                                | direct       | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi/ExcelApi.csproj           |
|  | YamlDotNet                                    | 16.0.0  | pkg:nuget/YamlDotNet                                               | direct       | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi/ExcelApi.csproj           |
|  | BCrypt.Net-Next                               | 4.0.3   | pkg:nuget/BCrypt.Net-Next                                          | direct       | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi/ExcelApi.csproj           |
|  | Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.0   | pkg:nuget/Microsoft.AspNetCore.Authentication.JwtBearer            | direct       | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi/ExcelApi.csproj           |
|  | Microsoft.Extensions.Logging.Console          | 8.0.0   | pkg:nuget/Microsoft.Extensions.Logging.Console                     | direct       | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi/ExcelApi.csproj           |
|  | MSTest.TestFramework/TestAdapter              | 3.0.4   | pkg:nuget/MSTest                                                   | test         | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi.Test/ExcelApi.Test.csproj |
|  | coverlet.collector                            | 6.0.0   | pkg:nuget/coverlet.collector                                       | test         | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi.Test/ExcelApi.Test.csproj |
|  | Microsoft.NET.Test.Sdk                        | 17.6.0  | pkg:nuget/Microsoft.NET.Test.Sdk                                   | test         | Unknown | Unknown      | N                | excel-api-csharp/src/ExcelApi.Test/ExcelApi.Test.csproj |
|  | jest                                          | ^29.0.0 | pkg:npm/jest                                                       | development  | Unknown | Unknown      | N                | excel-api-test/package.json                             |
|  | ts-jest                                       | ^29.0.0 | pkg:npm/ts-jest                                                    | development  | Unknown | Unknown      | N                | excel-api-test/package.json                             |
|  | ts-node                                       | ^10.9.2 | pkg:npm/ts-node                                                    | development  | Unknown | Unknown      | N                | excel-api-test/package.json                             |

No Go module dependencies: `excel-api-go/go.mod` declares no external requirements and `go.sum`
is empty, which is consistent for a standard-library-only client.

Totals: 31 direct or test components across four manifests, transitive dependencies not
enumerated here.

`excel-api-node/package-lock.json` and `excel-api-test/package-lock.json` exist and pin
transitive versions, while Java and C# transitive resolution is delegated to Maven and NuGet
metadata.

No committed advisory scan, license report, or vulnerability feed output was found, so
`Advisory Checked` is `N` for every component.

## License & IP Compliance Review

|  | License class   | Components | Notes                                                      |
|--|-----------------|------------|------------------------------------------------------------|
|  | Permissive      | 0          | Declared licenses not recorded in the inspected manifests  |
|  | Weak-copyleft   | 0          | None identified from inspected declarations                |
|  | Strong-copyleft | 0          | None identified from inspected declarations                |
|  | Proprietary     | 0          | None identified                                            |
|  | Unknown         | 31         | All components lack license declarations in manifest files |

The project ships a root `LICENSE.md` containing the MIT license with a named copyright holder,
and `excel-api-node/package.json` and `excel-api-test/package.json` carry `"license": "MIT"`.

`docs/COPYRIGHTS.md` restricts dependency licenses to MIT, Apache 2.0, BSD, ISC, and Boost and
prohibits GPL.

That policy is not enforced by any checked-in tool or report, so compliance is declared but
unverified.

`net.logstash.logback:logstash-logback-encoder` is marked `Review` because the artifact is
commonly distributed under a dual Apache-2.0 / LGPL-2.1 license, which the manifest does not
record and which would need explicit acceptance under the declared policy.

No `THIRD-PARTY-NOTICES` file or per-component license inventory exists, and the committed Go
binary has no recorded build provenance.

A generated [SBOM](#glossary) plus a license scan of the resolved dependency trees would close the Unknown
share.

## Health Dashboard

**Risk Map**

| Impact   | LOW | MEDIUM                             | HIGH                      |
|----------|-----|------------------------------------|---------------------------|
| CRITICAL |     |                                    | RSK-001                   |
| HIGH     |     | RSK-002, RSK-004, RSK-006          | RSK-003, RSK-005, RSK-007 |
| MEDIUM   |     | RSK-009, RSK-010, RSK-011, RSK-012 | RSK-008                   |
| LOW      |     |                                    |                           |

**Scorecard Summary**

Score bands: 1-3 Poor, 4-6 Average, 7-8 Good, 9-10 Excellent.

| Dimension               | Score            | Notes                                                      |
|-------------------------|------------------|------------------------------------------------------------|
| Testability             | 4/10             | Unit tests exist everywhere, integration suite mostly stub |
| Design Soundness        | 5/10             | Clean contract-first layering, notable spec-code drift     |
| Code Quality            | 3/10             | Confirmed functional defects in shared operation paths     |
| Stack Alignment         | 7/10             | Idiomatic stack choices per language                       |
| Dependency Health       | 5/10             | Manifests and npm lockfiles present, no advisory checking  |
| Maintainability         | 4/10             | Triplicated logic, dead code, documentation drift          |
| Deployability           | 3/10             | Multi-stage images exist, compose environment is broken    |
| Scalability             | 3/10             | Local file system, in-process queue and cache only         |
| Security                | 2/10             | Capped by CRITICAL authentication and authorization gaps   |
| Compliance              | 5/10             | License policy documented, enforcement absent              |
| Observability           | 3/10             | Structured logging exists, metrics thin and malformed      |
| Operational Safety      | 4/10             | Graceful shutdown paths, broken write serialization        |
| Delivery & Continuity   | 3/10             | Single-author history, no tags, no pipeline                |
| AI Provenance           | 3/10             | Policy text exists, no verification artifacts              |
| Originality & Licensing | 5/10             | MIT licensed, third-party notices absent                   |
| Skill Definition        | [N/A](#glossary) | No `SKILL.md` in subject                                   |
| API Compatibility       | [N/A](#glossary) | Service, not a reusable library                            |

**Team & Continuity**

All 19 commits are attributed to a single author across a four-week window (2026-04-20 to
2026-05-15), with no tags, no merged pull-request evidence, and no reviewer diversity recorded in
Git history (EVD-002, EVD-003).

## Delivery Practice & Team Continuity

|  | [DORA](#glossary) metric        | Result        | Basis                                         |
|--|---------------------------------|---------------|-----------------------------------------------|
|  | Change lead time                | NOT SPECIFIED | No tags or releases exist to anchor the proxy |
|  | Deployment frequency            | NOT SPECIFIED | No tags or releases exist to anchor the proxy |
|  | Failed deployment recovery time | NOT SPECIFIED | Requires incident and deployment data         |
|  | Change fail rate                | NOT SPECIFIED | Requires incident and rollback data           |
|  | Deployment rework rate          | NOT SPECIFIED | Requires production incident data             |

Contributor concentration: the top author carries 100% of the 19 inspected commits and the
active-contributor count is 1, giving a `High` concentration rating over the observed window of
2026-04-20 to 2026-05-15 (EVD-002, EVD-003).

Reviewer diversity is `NOT SPECIFIED`, pull-request reviews do not live in Git history.

No `OWNERS`, `CODEOWNERS`, or maintenance statement was found in the repository, and no
continuity-relevant findings exist beyond the delivery-pipeline gap raised as FND-INF-001 and
the corresponding risk RSK-010.

## High-Level Observations

| Observation                                                                                                                                                  |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| The C# server ships a token endpoint with hardcoded credentials and dummy tokens while leaving every data endpoint unauthenticated                           |
| All three servers diverge from the canonical contract on paths, response schemas, and whole endpoint groups such as batch operations                         |
| The Docker Compose configuration passes environment variable names no implementation reads, so the documented deployment path cannot start cleanly           |
| The shared write path is unsafe: insertions overwrite existing rows, locking is absent or broken, and the Node lockfile crashes in its shipped module format |
| Documentation describes architectures, layouts, and test frameworks that no longer match the source tree                                                     |

**Unauthenticated C# surface.**

`AuthEndpoints.cs` accepts only the literal client pair `test-client`/`test-secret`, returns the
string `dummy-token`, and answers every password grant unconditionally, while `Program.cs`
registers no authentication middleware at all for the data endpoints.

This is FND-SEC-001 and drives RSK-001.

**Contract and implementation have drifted apart.**

The canonical contract declares `/range/` while all servers serve `/ranges/`, declares batch
operation endpoints that no server registers, and requires `ref`, `column`, and `row` on
`CellData` objects that no server emits.

These are FND-ARC-001, FND-ARC-002, and FND-ARC-003, and they undermine the interchangeability
the architecture is built on.

**Documented deployment does not start.**

Both Compose files export `CONFIG_PATH` and `ACCESS_PATH`, while every loader resolves `CONFIG`
and `ACCESS`, so containers look for `config/config.yaml` that is never mounted at the expected
location.

This is FND-INF-002 and drives RSK-007.

**Writes can corrupt or lose data.**

Record insertion with `after_row` writes into an existing row without shifting, Java and C#
never take a lock, and the Node lockfile calls `require('os')` inside an ES module so write
requests fail at runtime.

These are FND-CQY-001, FND-CQY-003, and FND-SEC-008.

**Guidelines describe a different project.**

`docs/ARCHITECTURE.md` and `docs/SPECIFICATION.md` describe directory layouts that do not exist,
`docs/TESTING.md` names Vitest and xUnit while the suites run Vitest, JUnit, MSTest, and Jest,
and `docs/WORKFLOW.md` references `IMPL=` where Compose expects `IMAGE=`.

This is FND-ARC-007.

## Auditing Methodology

**Audit evidence statement**

This audit inspected 105 implementation source files, 36 unit-test files, and 11
integration-suite TypeScript files, plus 5 Dockerfiles, 2 Compose files, 30 tracked
documentation files, and the canonical OpenAPI contract.

`.gitignore` exclusions were applied.

Git commit history was reviewed for all 19 commits at revision `df055f6`.

No documented CI output, coverage report, or scan artifact was supplied or committed.

No builds, tests, linters, or tools were executed against the subject, all findings are based on
static inspection of the repository contents.

**Methodology overview**

The audit uses evidence-based reasoning across 18 core assessment categories grouped into six
pillars, plus conditional assessments applied when the subject warrants them.

- **Architecture & Design** - Design principles, maintainability, change management,
  documentation, non-functional requirements
- **Code Quality** - Testing, code quality, stack best practices
- **Security & Compliance** - Security, compliance and data protection
- **Infrastructure & [CI/CD](#glossary)** - Dependencies, deployment, rollback, observability, error
  handling, operational readiness
- **AI Provenance & Code Origin** - Explicit attribution, generated-artifact validation, and
  SDLC evidence, without authorship inference from style
- **Copyrights & Originality** - Code originality, license compliance, attribution, dependency
  license compatibility
- **API Compatibility & Versioning Discipline** - Not applied, the subject is a service rather
  than a reusable library

**Reference standards**

- **[ISO/IEC](#glossary) 25010:2023** - nine-characteristic product quality coverage via the scorecard
  crosswalk, not an [ISO](#glossary) scoring formula
- **OWASP API Security Top 10 (2023)** - security category coverage for the HTTP API surface
- **OWASP ASVS 5.0.0** - selected version-qualified controls for authentication and transport
- **[CWE](#glossary)** - weakness classification on security findings
- **NIST SP 800-30** - risk assessment process behind the risk register
- **[STRIDE](#glossary)** - threat enumeration in the Threat Model
- **[CISQ](#glossary) / [SQALE](#glossary)** - structural quality categories in the Technical Debt Register
- **[ISO](#glossary) 19011** and **NIST RMF** - follow-up structure in the Re-audit And Follow-up Plan
- **Spring Security Reference**, **ASP.NET Core minimal [API](#glossary) guidance**, **Fastify
  documentation**, and **Go project layout conventions** - stack-specific conformance baselines

**Verification And Evidence Ledger**

| Evidence ID | Project          | Check / Source                                                                                                                     | Execution | Result                                                                                                | Type        | Artifact                   |
|-------------|------------------|------------------------------------------------------------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------------------------------|-------------|----------------------------|
| EVD-001     | excel-api        | Tracked file inventory via `git ls-files` and directory walk                                                                       | Inspected | 236 tracked files, 5 components                                                                       | Observation | repository tree            |
| EVD-002     | excel-api        | `git log` full history                                                                                                             | Inspected | 19 commits, 2026-04-20 to 2026-05-15                                                                  | Observation | git history                |
| EVD-003     | excel-api        | `git shortlog` author summary                                                                                                      | Inspected | 100% single-author commits, no tags                                                                   | Observation | git history                |
| EVD-004     | excel-api        | `docs/contract/openapi.yaml` canonical contract                                                                                    | Inspected | 830-line OpenAPI 3.1 document, version 0.0.2                                                          | Observation | docs/contract/openapi.yaml |
| EVD-005     | excel-api        | Implementation OpenAPI copies vs canonical hash                                                                                    | Inspected | All three copies byte-identical post-sync                                                             | Observation | sync-openapi.sh output     |
| EVD-006     | excel-api-node   | `package.json`, `package-lock.json`, `tsconfig.json`                                                                               | Inspected | Version 0.0.2, ESM module, NodeNext, strict                                                           | Observation | package manifests          |
| EVD-007     | excel-api-node   | `src/server.ts`, `src/config/loader.ts`                                                                                            | Inspected | Config env vars WORK/CONFIG/ACCESS, no [TLS](#glossary) wiring, permissive [CORS](#glossary)          | Observation | server bootstrap           |
| EVD-008     | excel-api-node   | `src/auth/middleware.ts`, `src/auth/jwt.ts`, `src/auth/acl.ts`                                                                     | Inspected | Bearer/Token auth, scope checks, plaintext client_secret compare                                      | Observation | auth modules               |
| EVD-009     | excel-api-node   | `src/lock/lockfile.ts`                                                                                                             | Inspected | `require('os')` in ESM package, non-atomic acquire, `timestamp` key                                   | Observation | lock module                |
| EVD-010     | excel-api-node   | `src/queue/writeQueue.ts`, `src/routes/*.ts`                                                                                       | Inspected | Queue unused, no batch routes, queue_depth hardcoded 0                                                | Observation | queue and routes           |
| EVD-011     | excel-api-node   | `src/excel/operations.ts`                                                                                                          | Inspected | Range end ignored, after_row overwrite, hardcoded header row 1                                        | Observation | operations module          |
| EVD-012     | excel-api-node   | `src/metrics/collector.ts`, `src/routes/metrics.ts`                                                                                | Inspected | TYPE lines embed label sets, custom histogram shape                                                   | Observation | metrics module             |
| EVD-013     | excel-api-java   | `pom.xml`, `application.properties`, `application.yaml`                                                                            | Inspected | Version 0.0.2, context path `/api/v1`, graceful shutdown                                              | Observation | Maven and Spring config    |
| EVD-014     | excel-api-java   | `security/*.java`, `config/WebSecurityConfig.java`, `config/CorsFilterConfiguration.java`                                          | Inspected | Authenticated-only chain, no scope checks, `*` origin with credentials                                | Observation | security wiring            |
| EVD-015     | excel-api-java   | `controller/AuthController.java`                                                                                                   | Inspected | Password grant compares `password_hash` to plaintext via `equals`                                     | Observation | auth controller            |
| EVD-016     | excel-api-java   | `service/ExcelService.java`, controllers, `controller/advice/GlobalExceptionHandler.java`                                          | Inspected | No lockfile use, empty 404/422 bodies, bare column list, range start-only parse                       | Observation | service and controllers    |
| EVD-017     | excel-api-java   | `controller/LockStatusController.java`                                                                                             | Inspected | `TODO` stub returning `locked=false`, `queue_depth=0`                                                 | Observation | lock-status endpoint       |
| EVD-018     | excel-api-csharp | `src/ExcelApi/Program.cs`, `Endpoints/*.cs`                                                                                        | Inspected | No auth middleware, hardcoded client pair, dummy tokens, hardcoded port 8443                          | Observation | C# bootstrap and endpoints |
| EVD-019     | excel-api-csharp | `src/ExcelApi/Services/ExcelService.cs`                                                                                            | Inspected | No locking, after_row overwrite, unreachable branch in GetCellType, `timespan` type                   | Observation | C# service layer           |
| EVD-020     | excel-api-csharp | `src/ExcelApi/Config/*.cs`                                                                                                         | Inspected | `AccessPath` argument parsed but never loaded                                                         | Observation | config loader              |
| EVD-021     | excel-api-go     | `cmd/excel-api-go/main.go`, `internal/client/client.go`, `internal/config/version.go`                                              | Inspected | `config.Version` used for `--version`, form body built without URL-encoding, no timeout on token call | Observation | CLI source                 |
| EVD-022     | excel-api-go     | `file` inspection of tracked `excel-api-go/excel-api-go`                                                                           | Inspected | 7.5 MB x86-64 [ELF](#glossary), dynamically linked, not stripped                                      | Observation | committed binary           |
| EVD-023     | excel-api-test   | `integration/*.test.ts`, `helpers.ts`, `config/*.yaml`                                                                             | Inspected | 8 spec files, 5 of them placeholder `expect(true)` bodies                                             | Observation | test suite                 |
| EVD-024     | excel-api        | `docker-compose.yaml`, `docker-compose.test.yaml`                                                                                  | Inspected | Exports `CONFIG_PATH`/`ACCESS_PATH` unmatched by any loader                                           | Observation | compose files              |
| EVD-025     | excel-api        | All five `Dockerfile` files                                                                                                        | Inspected | Multi-stage builds, non-root users, no `HEALTHCHECK` instructions                                     | Observation | Dockerfiles                |
| EVD-026     | excel-api        | CI and pipeline configuration search                                                                                               | Inspected | No `.github`, `.gitlab-ci.yml`, or pipeline file present                                              | Observation | repository root            |
| EVD-027     | excel-api        | `docs/GUIDELINES.md`, `docs/VERSIONING.md`, `docs/TESTING.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, `docs/SPECIFICATION.md` | Inspected | Layout, framework, and env-var names diverge from sources                                             | Observation | documentation set          |
| EVD-028     | excel-api        | `docs/COPYRIGHTS.md`, `LICENSE.md`                                                                                                 | Inspected | MIT license file, declared dependency license policy                                                  | Observation | licensing documents        |
| EVD-029     | excel-api        | Unit test files across all components                                                                                              | Inspected | Vitest 11, JUnit 11, MSTest 8 incl. empty `UnitTest1`, go test 6                                      | Observation | test trees                 |
| EVD-030     | excel-api        | Version declarations across all projects                                                                                           | Inspected | 0.0.2 consistent after synchronization edits                                                          | Observation | manifests and literals     |

Documented but unrun commands: `npm run build`, `npm test`, `mvn package`, `dotnet test`,
`go build`, `go test`, `docker compose up`, `jest` in the test suite - all `NOT RUN` because the
audit is source-only.

Declared tool and dependency versions are taken from the manifests listed in the [SBOM](#glossary).

The evidence base is limited to the checked-out tree at `df055f6` plus the working-tree
modifications listed in Document Information.

**Severity definitions**

| Severity | Meaning                  | Readiness Treatment       |
|----------|--------------------------|---------------------------|
| CRITICAL | Critical contextual risk | Gate resolution           |
| HIGH     | Major contextual risk    | Gate resolution           |
| MEDIUM   | Material contained risk  | Track and plan            |
| LOW      | Limited contextual risk  | Proportionate improvement |

Severity derives from the impact/likelihood matrix, not [CVSS](#glossary).

## Scoring Rubrics

| Band      | Score Range | Definition                                                   |
|-----------|-------------|--------------------------------------------------------------|
| Excellent | 9-10        | Capability is comprehensive and verified by strong evidence  |
| Good      | 7-8         | Capability is solid overall, minor or noticeable gaps exist  |
| Average   | 4-6         | Capability is present but uneven, limited, or inconsistent   |
| Poor      | 1-3         | Capability is minimal, fragmentary, or absent where required |

Unresolved `CRITICAL` findings cap the affected dimension at 3/10 and unresolved `HIGH` findings
cap it at 5/10, per the readiness-and-scoring rules.

**[ISO/IEC](#glossary) 25010:2023 crosswalk**

This is a coverage mapping, not a conformance claim.

| Scorecard dimension     | [ISO/IEC](#glossary) 25010 characteristic | Coverage                        |
|-------------------------|-------------------------------------------|---------------------------------|
| Testability             | Maintainability - Testability             | Partially covered               |
| Design Soundness        | Functional Suitability, Maintainability   | Covered                         |
| Code Quality            | Reliability, Maintainability              | Covered                         |
| Stack Alignment         | Portability - Adaptability                | Covered                         |
| Dependency Health       | Portability, Security                     | Partially covered               |
| Maintainability         | Maintainability                           | Covered                         |
| Deployability           | Portability - Installability              | Covered                         |
| Scalability             | Performance Efficiency, Reliability       | Partially covered, no load data |
| Security                | Security                                  | Covered                         |
| Compliance              | Security - non-repudiation, licensing     | Partially covered               |
| Observability           | Reliability, Maintainability              | Covered                         |
| Operational Safety      | Reliability - Fault tolerance             | Covered                         |
| Delivery & Continuity   | Maintainability - Modifiability           | Proxy coverage only             |
| AI Provenance           | Not an [ISO](#glossary) characteristic    | Coverage gap recorded           |
| Originality & Licensing | Not an [ISO](#glossary) characteristic    | Coverage gap recorded           |

Usability has no direct scorecard dimension and is weakly covered because the subject is a
backend [API](#glossary), recorded as a coverage gap.

The overall score is an unweighted arithmetic mean of the 15 scored dimensions listed in the
Scorecard Summary, 59/15 = 3.9, and `N/A` dimensions are excluded from the denominator.

## Architectural Assessment

### What Works

The contract-first structure is real: a single canonical `docs/contract/openapi.yaml` drives all
three servers and a sync script enforces byte-identical copies (EVD-004, EVD-005).

The Node server shows the intended layered shape with routes, auth middleware, a registry, a
service module, and dedicated lock and cache modules (EVD-007).

The Java server follows a conventional Spring layout with controllers, services, DTOs, an
exception advice, and servlet filters (EVD-013, EVD-016).

Configuration is YAML-driven with environment interpolation, profile support in Node, and a
consistent `--work`/`--config`/`--access`/`--life` convention across servers (EVD-007,
EVD-020).

Structured JSON logging follows a documented `level/date/time/message` shape in Node, Java
(`JsonLayout`), and C# (`JsonConsoleFormatter`) (EVD-027).

### What Needs Attention

Interchangeability is claimed but not held: endpoint paths, response shapes, and authorization
semantics differ across the three servers (FND-ARC-001, FND-ARC-002, FND-SEC-003).

The shared lockfile protocol is documented precisely in `docs/ARCHITECTURE.md` yet only Node
attempts it, and that attempt is non-atomic and crashes in the shipped module format (FND-CQY-001,
FND-SEC-008).

The write-queue and batching architecture is documented and partially scaffolded in Node but is
never wired into request handling, and both declared batch endpoints are missing everywhere
(FND-ARC-001, FND-CQY-008).

### Design Principles

| Principle             | Status  | Evidence                                                                                                                                                      |
|-----------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Single Responsibility | PARTIAL | `server.ts` carries a RotatingFileLogger class and hook logic inside the bootstrap file, against its stated bootstrap-only role (FND-ARC-006)                 |
| Open/Closed           | PARTIAL | Route registration is additive per module, but behavior branches hardcode per-implementation assumptions such as header row 1 (FND-ARC-004)                   |
| Liskov Substitution   | FAIL    | The three servers are meant to be interchangeable yet differ in auth behavior, error envelopes, and endpoint coverage (FND-ARC-002, FND-SEC-001, FND-SEC-003) |
| Interface Segregation | PASS    | Endpoint groups and service modules expose narrow, per-resource surfaces (EVD-007, EVD-016)                                                                   |
| Dependency Inversion  | PARTIAL | Java uses constructor injection throughout, while Node and C# rely on module-level singletons wired in the entry point (EVD-007, EVD-018)                     |
| DRY                   | FAIL    | The same parsing, locking, record, and error-mapping logic is triplicated with divergent behavior rather than shared or generated (EVD-011, EVD-016, EVD-019) |

### Data Flow Diagram

The system crosses two trust boundaries: the [HTTP](#glossary) ingress boundary between clients and the [API](#glossary)
server, and the file-system boundary between the server process and the workbook directory.

Level-0:

```
                    HTTP(S) 8443
    ╭──────────╮   /api/v1/*     ╭────────────╮   read/write   ╭───────────────╮
    │ Client / │───────────────>│ Excel API  │───────────────>│ workbooks dir │
    │ Go CLI   │<───────────────│ server     │<───────────────│ (*.xlsx)      │
    ╰──────────╯                ╰────────────╯                ╰───────────────╯
                                      │
                                      │ reads
                                      v
                                ╭───────────────╮
                                │ config.yaml   │
                                │ access.yaml   │
                                ╰───────────────╯
```

Level-1 (Node reference flow, other servers are structurally similar):

```
request -> CORS -> auth middleware (Bearer/Token) -> scope check (ACL)
        -> route handler -> registry lookup -> Excel library read/write
        -> lockfile acquire/release + cache invalidate on writes
        -> metrics counter/histogram -> structured log line
```

Trust boundaries: network ingress (credentials and tokens in, workbook data out), and the
workbook/lock directory (shared mutable state with other processes).

### Design Patterns

Recurring structure is present and consistent within each server: route/controller modules,
service layer, configuration loaders, singleton registries in Node, and servlet filters in
Java.

No repository, unit-of-work, or adapter abstraction wraps the Excel libraries, so each service
embeds library-specific behavior directly.

### Industry Baseline Comparison

Compared with typical production [API](#glossary) baselines, the project matches on layering and container
packaging but misses on enforced auth parity across implementations, input validation at the
boundary, automated quality gates, and generated [API](#glossary) surfaces (the contract is checked into each
server and hand-edited rather than generated or codegen-validated).

## Trade-off Analysis

| Trade-off                       | Context                                            | Option A: gain / cost                                                              | Option B: gain / cost                                     | Evidence                                                                     | Implication                                                                     |
|---------------------------------|----------------------------------------------------|------------------------------------------------------------------------------------|-----------------------------------------------------------|------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| Three interchangeable servers   | Multi-language deployment flexibility (PROJECT.md) | A: deploy anywhere, no runtime lock-in / triplicated logic, parity burden          | B: one reference implementation / single-stack constraint | Three partial implementations diverge on auth, schema, locking (FND-ARC-002) | Parity requires generated stubs or a conformance suite, which are not present   |
| Local file-system storage       | Simple self-hosted deployment (PROJECT.md)         | A: zero-dependency deployment, human-readable files / no concurrency, no scale-out | B: database-backed store / operational complexity         | lockfile protocol, in-memory cache (EVD-009, EVD-016)                        | Single-node constraint is acceptable but locking must actually work             |
| Advisory lockfiles              | Cross-process write safety without a database      | A: no external dependency / races, stale-lock heuristics                           | B: OS flock or DB transaction / portability, infra        | `lockfile.ts` check-then-create, Java/C# absence (EVD-009, EVD-016, EVD-018) | The cheap option was chosen but implemented incompletely                        |
| mtime-based cache               | Read latency on repeated cell/record access        | A: fewer file reads / staleness between polls                                      | B: no cache / correctness                                 | `mtimeCache.ts` polling model (EVD-010)                                      | Reasonable for single-node, but callers invalidate manually after writes anyway |
| Static-token auth mode          | Operations and service accounts (contract)         | A: no token issuance needed / secret storage and rotation burden                   | B: JWT-only / more moving parts                           | `tokens.static` in `access.yaml` (EVD-008)                                   | Static tokens need hashing and rotation docs, currently plaintext               |
| Hand-maintained contract copies | Single canonical contract                          | A: servers serve a self-describing spec / drift risk                               | B: code-generated spec / build complexity                 | `sync-openapi.sh` plus per-server literal overrides (EVD-005)                | Sync script plus hardcoded version overrides partially defeats the goal         |

## Threat Model

[STRIDE](#glossary) applied to the evidenced boundaries.

| Boundary        | Threat (STRIDE)        | Threat Description                                                                                        | Mitigating Control                                                 | Finding                  |
|-----------------|------------------------|-----------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|--------------------------|
| Network ingress | Spoofing               | Forged or accepted-anything credentials issue dummy tokens in C# - Java password grant compares plaintext | Node bcrypt + [JWT](#glossary) verify - none in C#, broken in Java | FND-SEC-001, FND-SEC-002 |
| Network ingress | Elevation of Privilege | Any valid token reaches write and admin endpoints in Java                                                 | Node ACL scope checks - none in Java/C#                            | FND-SEC-003              |
| Network ingress | Denial of Service      | No rate limiting or body-size policy on `/auth/token`                                                     | None (gap)                                                         | FND-SEC-007              |
| Network ingress | Information Disclosure | Tokens and credentials traverse plaintext [HTTP](#glossary)                                               | [TLS](#glossary) field parsed but never applied                    | FND-SEC-004              |
| Network ingress | Information Disclosure | Permissive CORS reflects or allows any origin                                                             | None (gap)                                                         | FND-SEC-006              |
| Write path      | Tampering              | Concurrent writers corrupt workbooks without locking                                                      | Node lockfile only, non-atomic and crashing                        | FND-SEC-008              |
| Write path      | Tampering              | `after_row` insertion overwrites existing rows                                                            | None (gap)                                                         | FND-CQY-003              |
| Write path      | Tampering              | Unvalidated request bodies flow into cell values                                                          | Zod validates config only, not payloads                            | FND-CQY-004              |
| Secret store    | Information Disclosure | `access.yaml` holds plaintext secrets and static tokens                                                   | 0600 permission warning only                                       | FND-SEC-005              |
| Logging path    | Repudiation            | No request authentication identity in access logs                                                         | Request log records method/path/status only                        | FND-SEC-009              |

## API Contract Conformance

| Dimension                  | Status  | Evidence                                                                                                             |
|----------------------------|---------|----------------------------------------------------------------------------------------------------------------------|
| Specification present      | PASS    | `docs/contract/openapi.yaml`, OpenAPI 3.1, synced copies (EVD-004)                                                   |
| Schema validation enforced | FAIL    | Config validated via Zod, request payloads unvalidated (FND-CQY-004)                                                 |
| Adopted error contract     | FAIL    | Empty 404/422 bodies in Java and C#, Fastify default 500 envelope, OAuth-style codes on token endpoint (FND-ARC-002) |
| Versioning strategy        | PARTIAL | `info.version` synced at 0.0.2, but served spec version is overridden by hardcoded literals (FND-INF-006)            |
| Spec-to-code agreement     | FAIL    | `/range` vs `/ranges`, missing `operations` endpoints, `CellData.ref` absent (FND-ARC-001, FND-ARC-003)              |

**Gap descriptions**

**Path and endpoint coverage.**

The contract declares `GET /workbooks/{fileId}/sheets/{sheetName}/range/{rangeRef}` while all
three servers and the Go client implement `/ranges/{rangeRef}` (openapi.yaml line 360 vs
`cells.ts` line 118, `CellController.java` line 69, `CellEndpoints.cs`).

The contract declares `POST .../operations` and `POST .../cells/operations` (lines 383-431) and
no server registers them.

All servers expose an undocumented `/openapi.json` (Node `openapi.ts` line 21, Java
`OpenApiController.java` line 32).

**Schema divergence.**

`RangeData` requires `{range, rows:[{row, cells}]}` (openapi.yaml lines 729-746) while Node and
Java return bare `CellData[][]` and C# returns a serialized 2-D array.

`CellData` requires `ref` (line 702) and optionally `column`/`row`, none emitted by any
implementation's DTO.

`ColumnList` requires a `{source, columns}` envelope (lines 604-614) - Node conforms, Java returns
a bare list, C# returns a bare list.

C# emits a `timespan` cell type outside the contract enum (line 713) via `GetCellType`
(EVD-019).

**Error envelope.**

The contract's `ErrorResponse` is `{error, message, details?}` (lines 820-830).

Java `notFound()`/`unprocessableEntity()` produce empty bodies, C# `Results.StatusCode(422)` and
`Results.StatusCode(401)` produce empty bodies, and the token endpoints emit RFC-6749-style
`error`/`error_description` fields rather than the contract envelope.

**OWASP API Security Top 10 (2023) mapping.**

The contract gaps map to API1 (Broken Object Level Authorization, partially - per-object [ACL](#glossary) is
scope-level only), API2 (Broken Authentication - FND-SEC-001, FND-SEC-002), API5 (Broken
Function Level Authorization - FND-SEC-003), and API8 (Security Misconfiguration - FND-SEC-004,
FND-SEC-006, FND-SEC-009).

## Standards Conformance

**Standards inventory**

| Document                                | Path                                             | Stack Coverage              |
|-----------------------------------------|--------------------------------------------------|-----------------------------|
| TypeScript/Node.js development standard | `docs/standard/ts-node-development.md`           | TypeScript, Fastify         |
| Java/Spring/Maven development standard  | `docs/standard/java-spring-maven-development.md` | Java 21, Spring Boot, Maven |
| C#/ASP.NET development standard         | `docs/standard/csharp-aspnet-development.md`     | .NET 8, ASP.NET Core        |
| Go CLI development standard             | `docs/standard/go-cli-development.md`            | Go 1.22, CLI conventions    |

**Code conformance**

| Area                  | Standard Rule                                          | Status  | Evidence                                                                                                            |
|-----------------------|--------------------------------------------------------|---------|---------------------------------------------------------------------------------------------------------------------|
| Language version      | Modern toolchain per standard                          | PASS    | TS 5.5, Java 21, .NET 8, Go 1.22 (EVD-006, EVD-013)                                                                 |
| Project structure     | Documented per-project layout                          | PARTIAL | Actual trees diverge from `SPECIFICATION.md` layouts (FND-ARC-007)                                                  |
| Naming conventions    | camelCase/snake_case per language                      | PASS    | Naming is consistent within each codebase (EVD-011, EVD-016)                                                        |
| Error handling        | Structured error envelope, typed errors                | PARTIAL | Node has `AppError` hierarchy unused in routes, Java/C# emit empty error bodies (FND-ARC-002, FND-CQY-004)          |
| Testing               | Unit tests for new/changed functions                   | PARTIAL | Unit suites exist, integration suite mostly placeholder (FND-CQY-005)                                               |
| Formatting and lint   | ESLint/Prettier, editorconfig discipline               | PARTIAL | Configs exist for Node only, no enforcement pipeline (FND-INF-001)                                                  |
| Dependency management | Manifests plus lockfiles                               | PARTIAL | npm lockfiles present, no NuGet/Maven lockfile equivalent (EVD-006, EVD-013)                                        |
| Security              | bcrypt hashing, scoped tokens, [TLS](#glossary) option | FAIL    | Plaintext secret compares, absent authorization in two servers (FND-SEC-001, FND-SEC-002, FND-SEC-003, FND-SEC-005) |

**Standards quality**

| Area            | Standards Position                               | External Best Practice                    | Alignment                                            |
|-----------------|--------------------------------------------------|-------------------------------------------|------------------------------------------------------|
| Type safety     | `strict: true` TS config required                | TypeScript handbook strictness guidance   | Aligned                                              |
| REST design     | Resource-grouped endpoints, error envelope table | Common REST/OpenAPI conventions           | Aligned                                              |
| Dependency rule | Permissive licenses only, GPL banned             | SPDX-compliant permissive allowlist       | Aligned                                              |
| Versioning      | SemVer-like MAJOR.MINOR.PATCH with 9-rollover    | SemVer 2.0.0                              | Partially - the 9-rollover rule diverges from SemVer |
| Java structure  | Controller/service/config package split          | Spring Boot layered-architecture guidance | Aligned                                              |
| Node structure  | Single-file modules per concern                  | Common Fastify/Node module guidance       | Aligned                                              |

The versioning standard's "rollover at 9" rule is the notable divergence from SemVer, which has
no digit cap.

It is documented and consistently applied, so the impact is limited to semantic surprise.

## Strengths & What's Working

- **Contract-first design with enforced propagation.**

`docs/contract/openapi.yaml` is canonical and `shell/sync-openapi.sh` makes the three embedded
copies byte-identical, verified by hash comparison (EVD-004, EVD-005).

- **Strict TypeScript configuration.**

`excel-api-node/tsconfig.json` enables `strict`, `exactOptionalPropertyTypes`,
`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`
(EVD-006).

- **bcrypt for user passwords in Node.**

`jwt.ts` verifies password-grant credentials with `bcrypt.compare` rather than plaintext
comparison (EVD-008).

- **access.yaml permission check.**

All three config loaders warn when the access file lacks `0600` permissions (EVD-007, EVD-014,
EVD-020).

- **Multi-stage, non-root container builds.**

All server Dockerfiles run as a dedicated non-root user and the Go image is a `FROM scratch`
build (EVD-025).

- **Structured JSON logging with rotation.**

All three servers emit the documented `level/date/time/message` log shape, and Node and C#
include a rotating file logger (EVD-007, EVD-018, EVD-027).

- **Zero-dependency Go client.**

`go.mod` declares no external modules, minimizing the CLI's supply-chain surface (EVD-021).

## Detailed Technical Findings

| Finding ID  | Pillar                              | Severity | Title                                                                  | Status    | Remediation Status    |
|-------------|-------------------------------------|----------|------------------------------------------------------------------------|-----------|-----------------------|
| FND-ARC-001 | Architecture & Design               | High     | Declared batch operation endpoints missing in all servers              | Confirmed | Open                  |
| FND-ARC-002 | Architecture & Design               | High     | Response schemas diverge from contract and across servers              | Confirmed | Open                  |
| FND-ARC-003 | Architecture & Design               | Medium   | Range path `/range` vs `/ranges` and undocumented openapi.json         | Confirmed | Open                  |
| FND-ARC-004 | Architecture & Design               | Medium   | Per-sheet header configuration parsed but never applied                | Confirmed | Open                  |
| FND-ARC-005 | Architecture & Design               | Low      | Local file-system design caps horizontal scale                         | Confirmed | Open                  |
| FND-ARC-006 | Architecture & Design               | Low      | RotatingFileLogger embedded in Node bootstrap file                     | Confirmed | Open                  |
| FND-ARC-007 | Architecture & Design               | Medium   | Documentation drifts from source layout and tooling                    | Confirmed | Open                  |
| FND-CQY-001 | Code Quality                        | High     | `require('os')` inside ESM lockfile module fails at runtime            | Confirmed | Open                  |
| FND-CQY-002 | Code Quality                        | High     | Range reads ignore the requested end in Node and Java                  | Confirmed | Open                  |
| FND-CQY-003 | Code Quality                        | High     | `after_row` insertion overwrites rows in all three servers             | Confirmed | Open                  |
| FND-CQY-004 | Code Quality                        | Medium   | No request-body validation at the [API](#glossary) boundary            | Confirmed | Open                  |
| FND-CQY-005 | Code Quality                        | Medium   | Integration suite largely placeholder, empty MSTest template           | Confirmed | Open                  |
| FND-CQY-006 | Code Quality                        | Medium   | C# ignores loaded config values and contains dead branch               | Confirmed | Open                  |
| FND-CQY-007 | Code Quality                        | Low      | Go client lacks [URL](#glossary) encoding, escaping, and token timeout | Confirmed | Open                  |
| FND-CQY-008 | Code Quality                        | Medium   | WriteQueue dead code, queue_depth hardcoded to 0                       | Confirmed | Open                  |
| FND-SEC-001 | Security & Compliance               | Critical | C# server has no authentication and returns dummy tokens               | Confirmed | Open                  |
| FND-SEC-002 | Security & Compliance               | High     | Java password grant compares hash field to plaintext                   | Confirmed | Open                  |
| FND-SEC-003 | Security & Compliance               | High     | No scope or [ACL](#glossary) authorization enforcement in Java         | Confirmed | Open                  |
| FND-SEC-004 | Security & Compliance               | High     | [TLS](#glossary) declared in configuration but never enabled           | Confirmed | Open                  |
| FND-SEC-005 | Security & Compliance               | Medium   | Plaintext secrets and non-constant-time comparisons                    | Confirmed | Open                  |
| FND-SEC-006 | Security & Compliance               | Medium   | Permissive or broken [CORS](#glossary) configuration across servers    | Confirmed | Open                  |
| FND-SEC-007 | Security & Compliance               | Medium   | No rate limiting on token or data endpoints                            | Confirmed | Open                  |
| FND-SEC-008 | Security & Compliance               | Medium   | Write serialization absent or racy across servers                      | Confirmed | Open                  |
| FND-SEC-009 | Security & Compliance               | Low      | No [HTTP](#glossary) security headers emitted                          | Confirmed | Open                  |
| FND-INF-001 | Infrastructure & [CI/CD](#glossary) | High     | No [CI/CD](#glossary) configuration exists                             | Confirmed | Open                  |
| FND-INF-002 | Infrastructure & [CI/CD](#glossary) | High     | Compose environment variables do not match loader names                | Confirmed | Open                  |
| FND-INF-003 | Infrastructure & [CI/CD](#glossary) | Medium   | Compiled Linux binary committed at project root                        | Confirmed | Open                  |
| FND-INF-004 | Infrastructure & [CI/CD](#glossary) | Medium   | Metrics output thin and not valid Prometheus exposition                | Confirmed | Open                  |
| FND-INF-005 | Infrastructure & [CI/CD](#glossary) | Low      | No HEALTHCHECK in images, no digest pinning                            | Confirmed | Open                  |
| FND-INF-006 | Infrastructure & [CI/CD](#glossary) | Low      | Served spec version overridden by hardcoded literals                   | Confirmed | Resolved during audit |
| FND-AIP-001 | AI Provenance & Code Origin         | Low      | No AI-provenance verification artifacts                                | Confirmed | Open                  |
| FND-CPR-001 | Copyrights & Originality            | Medium   | Declared license policy unenforced, component licenses unknown         | Confirmed | Open                  |
| FND-CPR-002 | Copyrights & Originality            | Low      | No third-party notices, binary provenance unverifiable                 | Confirmed | Open                  |

### FND-ARC-001: Declared batch operation endpoints missing in all servers

* **Pillar:** Architecture & Design
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `docs/contract/openapi.yaml` lines 383-431, `excel-api-node/src/routes/`, `excel-api-java/src/main/java/pl/alyx/api/excel/controller/`, `excel-api-csharp/src/ExcelApi/Endpoints/`
* **Requirement Basis:** Contract operations `batchRecordOperations` and `batchCellOperations`, and the documented write-queue architecture in `docs/ARCHITECTURE.md`
* **Evidence:** EVD-004, EVD-010, EVD-016, EVD-018 - inspected route registrations - no server registers `/operations` or `/cells/operations` (Inspected)
* **Confidence:** HIGH - route tables are exhaustive and the paths are absent in all three implementations
* **Verification State:** Observed statically - endpoint absence confirmed by route listing
* **Counter-check:** Searched every route registration file for `operations`/`batch` handlers - only the unused Node `WriteQueue` class exists, so no hidden registration was found
* **Security Classification:** [N/A](#glossary) - functionality gap, not a weakness class
* **Description:** The canonical contract declares two batch endpoints, `POST /workbooks/{fileId}/sheets/{sheetName}/operations` and `POST /workbooks/{fileId}/sheets/{sheetName}/cells/operations`, with `BatchRecordRequest`, `BatchCellRequest`, and `BatchResult` schemas. None of the three servers registers either path. The only batching artifact is the Node `WriteQueue` class, which is never initialized or invoked. Clients written against the contract receive 404 on these endpoints.
* **Impact:** Batch clients fail outright - the declared atomic-batch semantics cannot be used - the contract overstates capability.
* **Remediation Recommendation:** Either implement both endpoints per contract in all three servers using the documented queue and lock protocol, or remove the endpoints and schemas from `openapi.yaml` and re-sync copies with `shell/sync-openapi.sh`.
* **Verification Method:** `POST /workbooks/{id}/sheets/{s}/operations` returns 200 with a `BatchResult` body, and a contract-to-route check lists no unimplemented paths.
* **Exploitability Narrative:** [N/A](#glossary) - missing endpoints are not an attack surface.

### FND-ARC-002: Response schemas diverge from contract and across servers

* **Pillar:** Architecture & Design
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/excel/operations.ts` lines 62-110, 407-483, `excel-api-java/src/main/java/pl/alyx/api/excel/dto/CellData.java`, `excel-api-java/.../service/ExcelService.java` lines 92-138, 305-335, `excel-api-csharp/src/ExcelApi/Endpoints/*.cs`, `docs/contract/openapi.yaml` schemas
* **Requirement Basis:** `CellData`, `RangeData`, `ColumnList`, `ErrorResponse` schemas in the canonical contract
* **Evidence:** EVD-004, EVD-011, EVD-016, EVD-018 - inspected DTOs and handlers (Inspected)
* **Confidence:** HIGH - schema fields and response construction are compared directly
* **Verification State:** Observed statically - response shapes confirmed against schema definitions
* **Counter-check:** Checked each server's serializer/DTO for the missing `ref`, `range`, `rows`, `source`, and `columns` fields - none emit them
* **Security Classification:** [N/A](#glossary)
* **Description:** `RangeData` requires `{range, rows:[{row, cells}]}` but all servers return bare 2-D arrays. `CellData` requires `ref` (plus optional `column`/`row`), which no DTO emits. `ColumnList` requires a `{source, columns}` envelope - only Node returns it. Error responses in Java and C# are empty bodies or RFC-6749-style fields instead of the `{error, message}` envelope. C# emits `timespan` as a cell `type`, which is outside the contract enum.
* **Impact:** Clients cannot rely on a common response shape, defeating the interchangeable-server design and breaking contract-generated clients.
* **Remediation Recommendation:** Align every response DTO with the contract schemas, emit `ref`/`column`/`row` on cell payloads, wrap range results in `RangeData`, return `ColumnList` envelopes in Java and C#, and route all errors through the shared envelope.
* **Verification Method:** Contract-conformance checks validating each endpoint response against the OpenAPI schema.
* **Exploitability Narrative:** [N/A](#glossary) - correctness and contract drift, not a network-reachable weakness.

### FND-ARC-003: Range path `/range` vs `/ranges` and undocumented openapi.json

* **Pillar:** Architecture & Design
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `docs/contract/openapi.yaml` line 360, `excel-api-node/src/routes/cells.ts` line 118, `excel-api-java/.../controller/CellController.java` line 69, `excel-api-csharp/src/ExcelApi/Endpoints/CellEndpoints.cs`, `excel-api-go/internal/client/client.go` line 171
* **Requirement Basis:** Canonical contract path definitions
* **Evidence:** EVD-004, EVD-011, EVD-016, EVD-018, EVD-021 - inspected path strings (Inspected)
* **Confidence:** HIGH - literal path comparison across contract and code
* **Verification State:** Observed statically
* **Counter-check:** Checked for alias routes serving the singular path - none exist in any server
* **Security Classification:** [N/A](#glossary)
* **Description:** The contract uses `/range/{rangeRef}` while every implementation serves `/ranges/{rangeRef}` - the Go client also targets `/ranges/`. Additionally every server exposes `GET /openapi.json`, which the contract does not declare.
* **Impact:** Contract-conformant clients hit 404 on the declared path - the undocumented [JSON](#glossary) endpoint adds an uncontracted surface.
* **Remediation Recommendation:** Pick one canonical path in the contract, update the three servers and the Go client to match, re-sync the contract copies, and either declare `/openapi.json` in the contract or remove it.
* **Verification Method:** `GET` on the declared path returns 200 in each server - contract paths enumerate identically to the served route table.
* **Exploitability Narrative:** [N/A](#glossary) - routing inconsistency.

### FND-ARC-004: Per-sheet header configuration parsed but never applied

* **Pillar:** Architecture & Design
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/config/loader.ts` lines 30-48, `excel-api-java/.../config/WorkbookConfig.java` lines 52-77, `excel-api-java/.../controller/RecordController.java` line 30, `excel-api-node/src/routes/records.ts` line 42, `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs`
* **Requirement Basis:** `registry.workbooks[].sheets` modes `single`, `multi`, `legend`, `none` in the configuration schema and documented header modes
* **Evidence:** EVD-007, EVD-011, EVD-016, EVD-019 - inspected loaders and record paths (Inspected)
* **Confidence:** HIGH - the parsed `sheets` map is never read by any operation
* **Verification State:** Observed statically
* **Counter-check:** Grepped all three services for reads of the parsed per-sheet config - only Java exposes a `headerRowCount` query parameter, with an off-by-one convention relative to Node and C# (`getRow(headerRowCount)` is 0-based in POI while ExcelJS/ClosedXML `Row(1)`/`getRow(1)` are 1-based)
* **Security Classification:** [N/A](#glossary)
* **Description:** All three loaders accept a per-sheet header configuration block (mode, identifier_row, type_row, description_row, legend_sheet), but every record path hardcodes header row 1: Node calls `readRecords(..., 1, ...)`, C# calls `ReadRecords(..., 1, ...)`, and Java uses a client-supplied `headerRowCount` defaulting to 1 with 0-based indexing. `getSheetMetadata` also hardcodes `mode: "raw"` in all three.
* **Impact:** Multi-row and legend-sheet header modes declared by the config schema silently produce wrong data or `SHEET_NOT_CONFIGURED`-shaped behavior - Java's indexing reads a different header row than the other servers for the same input.
* **Remediation Recommendation:** Apply the configured sheet mode and row indexes in each service's header extraction, or remove the unused schema surface until implemented - fix the Java indexing convention to match the 1-based contract semantics.
* **Verification Method:** Configure a `multi`-mode sheet and verify `columns`/`records` responses use identifier_row and type_row consistently across all three servers.
* **Exploitability Narrative:** [N/A](#glossary) - functional divergence.

### FND-ARC-005: Local file-system design caps horizontal scale

* **Pillar:** Architecture & Design
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** `docs/ARCHITECTURE.md`, `excel-api-node/src/cache/mtimeCache.ts`, `excel-api-node/src/lock/lockfile.ts`
* **Requirement Basis:** Explicitly documented design - scalability non-goal per project documentation
* **Evidence:** EVD-009, EVD-010, EVD-027 - inspected storage and cache modules (Inspected)
* **Confidence:** HIGH - storage and synchronization primitives are process- and filesystem-bound
* **Verification State:** Observed statically - documented as a design constraint
* **Counter-check:** Reviewed for any distributed coordination mechanism - none exists, consistent with the stated design
* **Security Classification:** [N/A](#glossary)
* **Description:** Workbooks live on a local directory, the cache is per-process mtime polling, and coordination uses advisory lockfiles. This is a documented, deliberate simplicity choice, but it hard-limits the system to a single writer process per directory and makes multi-replica deployment unsafe.
* **Impact:** Horizontal scaling is impossible without data corruption risk - capacity is bounded by single-node file I/O.
* **Remediation Recommendation:** Keep the constraint but document it in DEPLOYMENT.md as a hard limit, or define a shared-storage/managed-lock evolution path.
* **Verification Method:** Architecture review confirming documented deployment topology matches the single-node constraint.
* **Exploitability Narrative:** [N/A](#glossary) - design property, not a weakness.

### FND-ARC-006: RotatingFileLogger embedded in Node bootstrap file

* **Pillar:** Architecture & Design
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** `excel-api-node/src/server.ts` lines 67-128
* **Requirement Basis:** `docs/SPECIFICATION.md` describes `server.ts` as bootstrap-only
* **Evidence:** EVD-007 - inspected bootstrap module (Inspected)
* **Confidence:** HIGH - the class occupies roughly a third of the file
* **Verification State:** Observed statically
* **Counter-check:** `src/logger/index.ts` exists as the logger module, so the inline class duplicates module responsibilities
* **Security Classification:** [N/A](#glossary)
* **Description:** A ~60-line `RotatingFileLogger` class plus the `onResponse` hook and content-type parser live inside `server.ts`, which the specification designates as the bootstrap entry point.
* **Impact:** Bootstrap file conflates startup wiring with a reusable logging concern, raising maintenance cost and diverging from the documented structure.
* **Remediation Recommendation:** Move `RotatingFileLogger` into `src/logger/` and keep `server.ts` to wiring only.
* **Verification Method:** `server.ts` contains only imports, initialization, and listen logic after refactor.
* **Exploitability Narrative:** [N/A](#glossary) - maintainability.

### FND-ARC-007: Documentation drifts from source layout and tooling

* **Pillar:** Architecture & Design
* **Severity:** Medium
* **Type:** Observation
* **Target Files/Modules:** `docs/ARCHITECTURE.md`, `docs/SPECIFICATION.md`, `docs/TESTING.md`, `docs/WORKFLOW.md`
* **Requirement Basis:** GUIDELINES.md designates these documents as sources of truth
* **Evidence:** EVD-024, EVD-027, EVD-029 - inspected docs vs inspected source (Inspected)
* **Confidence:** HIGH - mismatches are literal and repeatable
* **Verification State:** Observed statically
* **Counter-check:** Verified each drift item against actual files - mismatches are real, not stale reads
* **Security Classification:** [N/A](#glossary)
* **Description:** `ARCHITECTURE.md` and `SPECIFICATION.md` describe directory layouts that do not exist (for example a `queue/` module under Java and different route file names under Node). `TESTING.md` names Vitest, JUnit, and xUnit while the actual frameworks are Vitest, JUnit, MSTest, and Jest, and lists a `large.xlsx` fixture that is absent. `WORKFLOW.md` uses `IMPL=` while the Compose files read `IMAGE=`. The documented lockfile content field `locked_at` is implemented as `timestamp` in Node.
* **Impact:** New contributors and automation guided by these docs produce wrong assumptions about structure, test invocations, and interop fields.
* **Remediation Recommendation:** Reconcile the four documents against the current tree in one pass and add a checklist note tying doc layouts to the sync discipline already used for the contract.
* **Verification Method:** Every path and command named in the documents resolves in the tree.
* **Exploitability Narrative:** [N/A](#glossary) - documentation drift.

### FND-CQY-001: `require('os')` inside ESM lockfile module fails at runtime

* **Pillar:** Code Quality
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/lock/lockfile.ts` line 53, `excel-api-node/package.json` line 5, `excel-api-node/tsconfig.json`
* **Requirement Basis:** Lockfile protocol required by `docs/ARCHITECTURE.md` for every write operation
* **Evidence:** EVD-009 - inspected module source and `"type": "module"` manifest (Inspected)
* **Confidence:** MEDIUM-HIGH - `require` is not defined in Node ES modules - the line sits inside `acquire()` and is reached on every lock attempt - a Vitest module shim could mask it in unit tests, so production impact is rated without execution
* **Verification State:** Statically confirmed defect mechanism - runtime behavior NOT RUN
* **Counter-check:** `tsconfig` compiles to NodeNext ESM and `@types/node` declares `require`, so the code type-checks while failing only at runtime - callers in `cells.ts`/`records.ts` wrap `acquire` in try/catch that converts the `ReferenceError` into [HTTP](#glossary) 409 `FILE_LOCKED`
* **Security Classification:** CWE-827 (Improper Control of Document Type Definition is not applicable - closest classification is CWE-758 Reliance on Undefined, Unspecified, or Implementation-Defined Behavior)
* **Description:** `acquire()` calls `require('os').hostname()` inside a package declared `"type": "module"` targeting NodeNext ESM. In the shipped `dist/` output `require` is undefined, so every lock acquisition throws before the lockfile is written. Route handlers catch that throw and report it as `FILE_LOCKED`, so all write endpoints report contention instead of the real fault.
* **Impact:** Every cell and record write in the Node server fails with [HTTP](#glossary) 409 and a misleading lock message - the lockfile protocol never runs.
* **Remediation Recommendation:** Replace `require('os')` with `import * as os from 'os'` and use `os.hostname()` - add a module-level unit assertion that `acquire` writes the documented lockfile shape.
* **Verification Method:** `PUT` a cell in a scratch workbook via a locally started Node server and confirm a `.lock` file is created and removed.
* **Exploitability Narrative:** [N/A](#glossary) - availability defect, not a remotely triggerable privilege path - abuse relevance is limited to forced error states.

### FND-CQY-002: Range reads ignore the requested end in Node and Java

* **Pillar:** Code Quality
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/excel/operations.ts` lines 76-109, `excel-api-java/.../service/ExcelService.java` lines 105-136
* **Requirement Basis:** `rangeRef` parameter pattern `^[A-Z]{1,3}[0-9]+:[A-Z]{1,3}[0-9]+$` and `getRange` contract semantics
* **Evidence:** EVD-011, EVD-016 - inspected range implementations (Inspected)
* **Confidence:** HIGH for Node (the end bound is never read) - MEDIUM-HIGH for Java (`new CellReference("A1:C3")` rejects the colon per Apache POI API contract, which would surface as a 400/500 rather than range data)
* **Verification State:** Observed statically - not executed
* **Counter-check:** C# uses `worksheet.Range(rangeRef)`, which parses the full range correctly, confirming the divergence is implementation-local
* **Security Classification:** [N/A](#glossary)
* **Description:** Node resolves only the range's start cell and iterates to `sheet.rowCount`/`sheet.columnCount`, returning the sheet remainder rather than the requested range. Java passes the `A1:B2`-style string to `CellReference`, which models a single cell and does not accept a colon range. The endpoint therefore returns wrong data in Node and an error in Java for every conformant request.
* **Impact:** Range reads - a core [API](#glossary) capability - are wrong in two of three servers.
* **Remediation Recommendation:** Parse `rangeRef` into start/end coordinates in Node and use POI `AreaReference` or explicit coordinate parsing in Java - bound iteration to the declared end.
* **Verification Method:** `GET .../ranges/A1:B2` returns exactly the 2x2 `RangeData` block in all three servers.
* **Exploitability Narrative:** [N/A](#glossary) - correctness defect - no trust-boundary manipulation path identified.

### FND-CQY-003: `after_row` insertion overwrites rows in all three servers

* **Pillar:** Code Quality
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/excel/operations.ts` lines 323-340, `excel-api-java/.../service/ExcelService.java` lines 429-461, `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs` AddRecord
* **Requirement Basis:** `AddRecordRequest.after_row` semantics in the contract and record-append behavior in `docs/SPECIFICATION.md`
* **Evidence:** EVD-011, EVD-016, EVD-019 - inspected insert paths (Inspected)
* **Confidence:** HIGH - none of the three implementations shifts existing rows before writing the new row
* **Verification State:** Observed statically - not executed
* **Counter-check:** Java's `deleteRecord` does call `shiftRows`, showing the shift primitive is known but unused on insert
* **Security Classification:** CWE-349 (Acceptance of Extraneous Untrusted Data With Trusted Data is adjacent - the operative classification is data-integrity corruption rather than a security weakness - [N/A](#glossary) for [CWE](#glossary))
* **Description:** When `after_row` is supplied, Node writes into `getRow(afterRow + 1)` without `spliceRows`, Java calls `createRow(afterRow + 1)` without `shiftRows`, and C# writes `worksheet.Row(afterRow + 1)` without `InsertRows`. In all three, the new record overwrites the existing row's cells instead of inserting before them.
* **Impact:** A documented insert operation destroys existing workbook data - silent data corruption on the write path.
* **Remediation Recommendation:** Insert a row (`spliceRows`/`shiftRows`/`InsertRows`) before populating when `after_row` targets an occupied row, and add an integration test asserting existing rows are preserved.
* **Verification Method:** Insert a record with `after_row` mid-sheet and verify the displaced row's content shifted down intact.
* **Exploitability Narrative:** [N/A](#glossary) - data-integrity defect reachable by authorized writers, but no unauthorized path.

### FND-CQY-004: No request-body validation at the API boundary

* **Pillar:** Code Quality
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/routes/cells.ts` line 99, `records.ts` lines 142, 199 - `excel-api-java/.../controller/RecordController.java` lines 101-104, `CellController.java` line 64 - `excel-api-csharp/src/ExcelApi/Dto/*.cs`
* **Requirement Basis:** Contract `CellWriteRequest`, `AddRecordRequest`, `UpdateRecordRequest` schemas and the documented `INVALID_REQUEST` error
* **Evidence:** EVD-010, EVD-016, EVD-018 - inspected handlers (Inspected)
* **Confidence:** HIGH - no schema validation, type check, or null guard exists on any request body
* **Verification State:** Observed statically
* **Counter-check:** Zod is used for config validation only - Fastify JSON parsing supplies `request.body` untyped - Java casts `request.get("data")` unchecked - malformed input produces 500s rather than 400 INVALID_REQUEST
* **Security Classification:** CWE-20 (Improper Input Validation)
* **Description:** Handlers dereference `request.body.value`/`request.body.data` directly. A missing or wrongly-shaped body throws `TypeError` (Node), `ClassCastException` (Java), or a binding error (C#), all surfacing as 500-family responses outside the contract's error envelope.
* **Impact:** Malformed requests yield internal errors instead of contract errors, leaking implementation detail and breaking client error handling.
* **Remediation Recommendation:** Validate bodies against the contract schemas (Zod schemas or Fastify JSON schema in Node, `jakarta.validation` or explicit checks in Java, model validation in C#) and map failures to 400 `INVALID_REQUEST`.
* **Verification Method:** POST/PUT with missing or mistyped `data`/`value` returns 400 INVALID_REQUEST in all three servers.
* **Exploitability Narrative:** [N/A](#glossary) - MEDIUM severity, narrative not required - the path is authenticated and yields only error-state information.

### FND-CQY-005: Integration suite largely placeholder, empty MSTest template

* **Pillar:** Code Quality
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-test/integration/concurrency.test.ts`, `locking.test.ts`, `operations.test.ts`, `rows.test.ts`, `sheets.test.ts` - `excel-api-csharp/src/ExcelApi.Test/UnitTest1.cs` - `excel-api-node/src/server.test.ts`
* **Requirement Basis:** `docs/TESTING.md` scenarios T-01 through T-08 covering auth, CRUD, locking, concurrency, and batch operations
* **Evidence:** EVD-023, EVD-029 - inspected test bodies (Inspected)
* **Confidence:** HIGH - five of eight integration spec files contain only `expect(true).toBe(true)` placeholders - `UnitTest1` is the MSTest scaffold - `server.test.ts` re-implements `parseDuration` inline rather than importing `util/duration.ts`
* **Verification State:** Observed statically - tests NOT RUN
* **Counter-check:** `auth.test.ts`, `workbooks.test.ts`, and `openapi-endpoint.test.ts` do contain real assertions, so the suite is not entirely empty
* **Security Classification:** [N/A](#glossary)
* **Description:** The black-box suite declares coverage for record operations, locking, concurrency, and batch operations, but those describe blocks hold literal-true assertions only. The committed coverage therefore cannot detect the write-path and contract defects found elsewhere in this report.
* **Impact:** Regressions in locking, writes, batch behavior, and record operations ship undetected - the suite gives false confidence.
* **Remediation Recommendation:** Implement the placeholder specs against the fixture workbooks, remove `UnitTest1.cs`, and make `server.test.ts` import the real `parseDuration`.
* **Verification Method:** `jest --runInBand` in the compose harness exercises real assertions for T-02 through T-08.
* **Exploitability Narrative:** [N/A](#glossary) - test-debt observation.

### FND-CQY-006: C# ignores loaded config values and contains dead branch

* **Pillar:** Code Quality
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Program.cs` lines 41-43, 94-107, 131 - `src/ExcelApi/Services/ExcelService.cs` GetCellType - `src/ExcelApi/Config/ConfigLoader.cs`
* **Requirement Basis:** Config schema `server.port`, `logging.file`, and `access.yaml` consumption per SPECIFICATION
* **Evidence:** EVD-018, EVD-019, EVD-020 - inspected bootstrap and service (Inspected)
* **Confidence:** HIGH - `app.Run("http://0.0.0.0:8443")` ignores `serverConfig.Port`, `LOGGING_FILE_*` env vars bypass the config schema, `AccessPath` is parsed but never loaded, and `GetCellType` contains an unreachable duplicated `return` inside the `XLDataType.Number` case
* **Verification State:** Observed statically - not executed
* **Counter-check:** `LoadServerConfig` is invoked and `BasePath` is used for routing, so only a subset of config is ignored
* **Security Classification:** [N/A](#glossary)
* **Description:** Several declared configuration surfaces are dead in C#: the port and host are hardcoded, file logging uses ad-hoc environment variables instead of `logging.file.*`, the `--access`/`ACCESS` path is never resolved, and a duplicated return in `GetCellType` is unreachable code.
* **Impact:** Operators cannot rebind the port or enable file logging through documented config, and the dead branch signals absent static-analysis enforcement.
* **Remediation Recommendation:** Bind `app.Run` to `serverConfig` host/port, load `access.yaml` via the existing loader, route file logging through `logging.file`, and remove the unreachable return.
* **Verification Method:** Start the C# server with a non-default `server.port` and confirm the listening socket changes - build with warnings-as-errors.
* **Exploitability Narrative:** [N/A](#glossary) - configuration integrity, not a weakness.

### FND-CQY-007: Go client lacks URL encoding, escaping, and token timeout

* **Pillar:** Code Quality
* **Severity:** Low
* **Type:** Concern
* **Target Files/Modules:** `excel-api-go/cmd/excel-api-go/main.go`, `excel-api-go/internal/client/client.go` lines 34-60, 131-217
* **Requirement Basis:** Robust CLI per `docs/standard/go-cli-development.md`
* **Evidence:** EVD-021 - inspected client construction (Inspected)
* **Confidence:** HIGH - `ObtainToken` interpolates credentials into a form body without `url.Values` encoding, the token call uses `http.DefaultClient` with no timeout, and path segments for sheet names and refs are not escaped
* **Verification State:** Observed statically - not executed
* **Counter-check:** The 30-second-timeout client exists but is used only for data calls, not the token request
* **Security Classification:** [N/A](#glossary)
* **Description:** A `client_secret` containing `&`, `=`, or `%` corrupts the token form - a hung token endpoint blocks indefinitely - sheet names containing `/`, `?`, or `#` produce wrong [URLs](#glossary).
* **Impact:** Credential and name edge cases fail with opaque errors - the CLI can hang without a timeout.
* **Remediation Recommendation:** Build the token body with `net/url.Values`, use the configured client for `ObtainToken`, and escape path segments with `url.PathEscape`.
* **Verification Method:** Obtain a token with a secret containing `&` and read a cell on a sheet whose name contains a space or slash.
* **Exploitability Narrative:** [N/A](#glossary) - client robustness.

### FND-CQY-008: WriteQueue dead code, queue_depth hardcoded to 0

* **Pillar:** Code Quality
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/queue/writeQueue.ts`, `excel-api-node/src/routes/lockStatus.ts` line 34, `excel-api-java/.../controller/LockStatusController.java` lines 33-37, `excel-api-csharp/src/ExcelApi/Endpoints/WorkbookEndpoints.cs` lock-status
* **Requirement Basis:** Queue and batching architecture plus `queue_depth` in `LockStatus` schema
* **Evidence:** EVD-010, EVD-017, EVD-018 - inspected queue module and lock-status endpoints (Inspected)
* **Confidence:** HIGH - `initWriteQueue`/`getWriteQueue` are referenced only by their own unit test, the debounce timer callback is a no-op, and all three lock-status handlers return literal `queue_depth: 0`
* **Verification State:** Observed statically - not executed
* **Counter-check:** The queue's promise-chaining does serialize operations enqueued during a running batch, but the debounce/batch-size logic is inert and the type is unused by any route
* **Security Classification:** [N/A](#glossary)
* **Description:** The write-queue architecture documented in `ARCHITECTURE.md` is scaffolded but disconnected: nothing enqueues, the debounce timer only deletes itself, batch-size early execution is commented to rely on the chain, and `queue_depth` is fabricated as zero. `LockStatusController.java` carries an explicit `TODO: Implement actual lock status checking`.
* **Impact:** Queue semantics, debounce batching, and the 503 `SERVICE_BUSY` capacity contract are absent - lock-status responses are uninformative.
* **Remediation Recommendation:** Either wire `WriteQueue` into the write routes with real depth accounting or remove the module and the `queue_depth` field from the contract until implemented.
* **Verification Method:** `GET /workbooks/{id}/lock-status` reports non-zero depth while a batch is pending.
* **Exploitability Narrative:** [N/A](#glossary) - missing capacity control is adjacent to a resource-exhaustion concern covered under FND-SEC-007.

### FND-SEC-001: C# server has no authentication and returns dummy tokens

* **Pillar:** Security & Compliance
* **Severity:** Critical
* **Type:** Concern
* **Target Files/Modules:** `excel-api-csharp/src/ExcelApi/Endpoints/AuthEndpoints.cs` lines 42-66, `excel-api-csharp/src/ExcelApi/Program.cs` lines 98-107
* **Requirement Basis:** Contract security schemes `bearerJwt` and `staticToken`, `docs/ARCHITECTURE.md` authorization flow
* **Evidence:** EVD-018, EVD-020 - inspected endpoint registration and token endpoint (Inspected)
* **Confidence:** HIGH - no auth middleware is registered, `access.yaml` is never loaded, and the token endpoint is reached unconditionally
* **Verification State:** Statically confirmed - not executed
* **Counter-check:** Reviewed `Program.cs` for `UseAuthentication`/`RequireAuthorization`/filter equivalents - none exist - the `Microsoft.AspNetCore.Authentication.JwtBearer` package is referenced in the csproj but never wired
* **Security Classification:** CWE-306 (Missing Authentication for Critical Function), CWE-798 (Use of Hard-coded Credentials - the literal `test-client`/`test-secret` pair)
* **Description:** The C# token endpoint returns a literal `dummy-token` when the hardcoded client pair matches and returns a valid token for any password grant unconditionally. No endpoint requires authentication or checks scopes, so every workbook read/write operation is anonymously callable regardless of the token returned.
* **Impact:** Any network client can read, modify, or delete every registered workbook without credentials - the authorization model is nonexistent in this server.
* **Remediation Recommendation:** Load `access.yaml`, verify Bearer JWTs with the configured secret and `Token` static credentials, enforce scope/ACL rules per endpoint, and remove the hardcoded credential pair and dummy-token responses.
* **Verification Method:** `GET /workbooks` without Authorization returns 401 and a forged bearer token is rejected - a read-scope token receives 403 on `PUT`.
* **Exploitability Narrative:** Static-Confirmed - the anonymous path is unconditional in source: any `GET/PUT/POST/DELETE` to the data routes is served without an Authorization check, and the token endpoint issues a success response for arbitrary passwords - exploitation requires only network reachability.

### FND-SEC-002: Java password grant compares hash field to plaintext

* **Pillar:** Security & Compliance
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-java/.../controller/AuthController.java` lines 160-166
* **Requirement Basis:** Password grant per contract plus bcrypt-hashed `password_hash` field in `access.yaml`
* **Evidence:** EVD-015 - inspected `validateUser` (Inspected)
* **Confidence:** HIGH - `u.getPasswordHash().equals(password)` is a direct string comparison - no `PasswordEncoder` is invoked despite `spring-security-crypto` being on the classpath
* **Verification State:** Statically confirmed - not executed
* **Counter-check:** A bcrypt hash string (for example the test fixture's `$2b$12$...` value) can never equal a plaintext password, so the grant either always fails against compliant stores or silently requires plaintext `password_hash` values
* **Security Classification:** CWE-287 (Improper Authentication) - associated CWE-256 (Plaintext Storage of a Password) if deployments adapt by storing plaintext
* **Description:** `validateUser` compares the stored `password_hash` field to the submitted plaintext password with `String.equals`. With a real bcrypt hash the grant can never succeed, and the only way to make it succeed is to store plaintext passwords in `password_hash`, which converts a functional bug into a credential-storage vulnerability.
* **Impact:** Password-grant authentication is either broken or actively insecure, and operators are pushed toward plaintext credential storage to keep it working.
* **Remediation Recommendation:** Verify passwords with a `PasswordEncoder`/`BCrypt` check against `password_hash`, reject non-hash formats, and return RFC-6749 `invalid_grant` on mismatch.
* **Verification Method:** A bcrypt-hashed user's correct password yields a token and the wrong password yields 401.
* **Exploitability Narrative:** Static-Confirmed - the comparison is unconditional code - when deployments store plaintext hashes to make the grant work, credential files become directly reusable, and any readability of `access.yaml` exposes usable passwords.

### FND-SEC-003: No scope or ACL authorization enforcement in Java

* **Pillar:** Security & Compliance
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-java/.../config/WebSecurityConfig.java` lines 27-43, `excel-api-java/.../config/AccessConfig.java` AclConfig, all controllers
* **Requirement Basis:** [ACL](#glossary) scope-to-method rules in `access.yaml` and `docs/ARCHITECTURE.md` authorization flow
* **Evidence:** EVD-014, EVD-016 - inspected filter chain and controllers (Inspected)
* **Confidence:** HIGH - `anyRequest().authenticated()` is the only authorization rule, no `@PreAuthorize`, `hasAuthority`, or [ACL](#glossary) lookup exists anywhere, and the parsed `AclConfig` is never consulted
* **Verification State:** Statically confirmed - not executed
* **Counter-check:** Granted authorities are populated from token scopes by both filters, but nothing consumes them downstream
* **Security Classification:** CWE-862 (Missing Authorization) - maps to OWASP API5
* **Description:** After authentication, any endpoint is reachable regardless of granted scopes: a `read`-scope token can `PUT`, `POST`, and `DELETE` records and reach the admin lock-status endpoint. The `acl.rules` configuration is inert.
* **Impact:** The documented read/write/admin separation does not exist in the Java server, so least-privilege deployment is impossible.
* **Remediation Recommendation:** Enforce scope checks per endpoint (method security or an authorization filter evaluating `AclConfig` rules), honoring `admin_endpoints` for lock-status.
* **Verification Method:** A token carrying only `read` receives 403 on `PUT /cells/...` and `GET /workbooks/{id}/lock-status` requires `admin`.
* **Exploitability Narrative:** Static-Confirmed - the missing check is structural - any holder of a low-privilege token (including the `test-readonly-token` fixture pattern) reaches write paths with no additional primitive.

### FND-SEC-004: TLS declared in configuration but never enabled

* **Pillar:** Security & Compliance
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/config/loader.ts` lines 14-17, `server.ts` line 182 - `excel-api-java/src/main/resources/application.properties` - `excel-api-csharp/src/ExcelApi/Program.cs` line 131
* **Requirement Basis:** `server.tls.enabled` config field and `DEPLOYMENT.md` [TLS](#glossary) guidance
* **Evidence:** EVD-007, EVD-013, EVD-018 - inspected listeners and [TLS](#glossary) config consumption (Inspected)
* **Confidence:** HIGH - the only consumption of `tls.enabled` is scheme selection inside the served OpenAPI document - listeners are plaintext in all three servers and C# hardcodes `http://0.0.0.0:8443`
* **Verification State:** Statically confirmed - not executed
* **Counter-check:** Searched for `https`, `ssl`, `keystore`, or certificate wiring in each codebase - none exists
* **Security Classification:** CWE-319 (Cleartext Transmission of Sensitive Information)
* **Description:** Bearer tokens, static tokens, and [OAuth2](#glossary) credentials traverse unencrypted [HTTP](#glossary). The `tls.enabled` flag is a no-op beyond cosmetic [URL](#glossary) generation, and DEPLOYMENT.md's [TLS](#glossary) guidance has no backing implementation.
* **Impact:** Network observers can capture credentials and workbook data - the documented [TLS](#glossary) option cannot actually be enabled.
* **Remediation Recommendation:** Implement TLS listeners per config in each server, or document [TLS](#glossary) termination at a reverse proxy and mark `server.tls` accordingly - meanwhile restrict deployment to trusted networks.
* **Verification Method:** With `tls.enabled: true` and a cert/key configured, the listener negotiates [HTTPS](#glossary).
* **Exploitability Narrative:** Static-Confirmed for the configuration defect itself - the absence of [TLS](#glossary) is unconditional - actual interception additionally requires network position, so end-to-end exploitability is Theoretical under source-only review.

### FND-SEC-005: Plaintext secrets and non-constant-time comparisons

* **Pillar:** Security & Compliance
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/auth/jwt.ts` lines 71-73, 130-140 - `excel-api-java/.../controller/AuthController.java` lines 141-147 - `access.yaml` schema
* **Requirement Basis:** Credential handling per `docs/ARCHITECTURE.md` and general secret-storage practice
* **Evidence:** EVD-008, EVD-015 - inspected comparison code (Inspected)
* **Confidence:** HIGH - `client_secret` is stored and compared as plaintext via `===` and `.equals` - static tokens are stored plaintext and compared directly
* **Verification State:** Statically confirmed
* **Counter-check:** Node bcrypt-hashes user passwords, so the gap is scoped to client secrets and static tokens - timing-attack feasibility over a network is limited but nonzero
* **Security Classification:** CWE-208 (Observable Timing Discrepancy), CWE-256 (Plaintext Storage of a Password)
* **Description:** `access.yaml` carries `client_secret` and `tokens.static[].token` values in plaintext, and verification uses early-exit string equality rather than constant-time comparison.
* **Impact:** Read access to `access.yaml` (backup, config dump, error page) yields directly reusable credentials - string compares leak byte-position timing.
* **Remediation Recommendation:** Store secrets as hashes (bcrypt or keyed digests) and compare with constant-time primitives (`crypto.timingSafeEqual`, `MessageDigest.isEqual`).
* **Verification Method:** Token verification still succeeds while `access.yaml` contains only hash values.
* **Exploitability Narrative:** [N/A](#glossary) - MEDIUM severity - narrative not required.

### FND-SEC-006: Permissive or broken CORS configuration across servers

* **Pillar:** Security & Compliance
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/server.ts` lines 161-165, `excel-api-csharp/src/ExcelApi/Program.cs` lines 28-36, 52-57, `excel-api-java/.../config/CorsFilterConfiguration.java` lines 18-25
* **Requirement Basis:** [CORS](#glossary) policy per `docs/ARCHITECTURE.md` non-functional requirements
* **Evidence:** EVD-007, EVD-014, EVD-018 - inspected [CORS](#glossary) registration (Inspected)
* **Confidence:** HIGH - Node sets `origin: true` (reflects any origin), C# allows any origin/method/header, and Java combines `allowedOrigin("*")` with `allowCredentials(true)`
* **Verification State:** Statically confirmed - Java runtime rejection is a documented Spring behavior, not executed
* **Counter-check:** Java's combination is rejected by Spring's [CORS](#glossary) validation at request time, so Java's [CORS](#glossary) is effectively broken rather than merely permissive - no allowlist exists anywhere
* **Security Classification:** CWE-942 (Permissive Cross-domain Policy with Untrusted Domains) - CWE-346 (Origin Validation Error) for the credential-wildcard combination
* **Description:** Cross-origin policy is either maximally permissive (Node, C#) or self-contradictory (Java's wildcard-plus-credentials). No origin allowlist is configurable.
* **Impact:** Browser-based cross-origin use is unrestricted, and Java deployments see failing preflights.
* **Remediation Recommendation:** Add an `allowed_origins` list to the config schema and apply it in all three servers - drop credentials-with-wildcard.
* **Verification Method:** A disallowed origin's preflight is rejected and an allowlisted origin succeeds in each server.
* **Exploitability Narrative:** [N/A](#glossary) - MEDIUM severity - narrative not required.

### FND-SEC-007: No rate limiting on token or data endpoints

* **Pillar:** Security & Compliance
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** all three servers, `/auth/token` handlers
* **Requirement Basis:** [NFR](#glossary) resilience expectations in `docs/PROJECT.md`/`ARCHITECTURE.md`
* **Evidence:** EVD-007, EVD-014, EVD-018 - inspected pipelines - no limiter middleware or filter exists (Inspected)
* **Confidence:** HIGH - no rate-limit construct is present in any implementation or config
* **Verification State:** Statically confirmed
* **Counter-check:** Checked dependencies for limiter packages (`@fastify/rate-limit`, Resilience4j/Bucket4j, ASP.NET rate limiting) - none referenced
* **Security Classification:** CWE-307 (Improper Restriction of Excessive Authentication Attempts) - CWE-770 (Allocation of Resources Without Limits) on the wider surface
* **Description:** The token endpoint accepts unlimited attempts and all data endpoints are unthrottled - there is also no request-body size policy beyond framework defaults.
* **Impact:** Online brute force against client secrets and static tokens is unconstrained - resource exhaustion is uncontrolled.
* **Remediation Recommendation:** Add per-IP/per-subject rate limits to `/auth/token` and global limits elsewhere, with a documented 429 response.
* **Verification Method:** Repeated failed token attempts produce 429 after the configured threshold.
* **Exploitability Narrative:** [N/A](#glossary) - MEDIUM severity - narrative not required.

### FND-SEC-008: Write serialization absent or racy across servers

* **Pillar:** Security & Compliance
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/lock/lockfile.ts` lines 33-59, `excel-api-java/.../service/ExcelService.java` write methods, `excel-api-csharp/src/ExcelApi/Services/ExcelService.cs` write methods
* **Requirement Basis:** Lockfile protocol in `docs/ARCHITECTURE.md` (`{pid, hostname, locked_at, implementation}`) and cross-process write safety
* **Evidence:** EVD-009, EVD-016, EVD-019 - inspected lock and write paths (Inspected)
* **Confidence:** HIGH - Java and C# perform no locking around `workbook.write`/`Save`, and Node's acquire is a non-atomic `existsSync` + `writeFileSync` pair keyed on a `timestamp` field instead of the documented `locked_at`, breaking cross-implementation interoperability
* **Verification State:** Statically confirmed - not executed
* **Counter-check:** Node wraps writes in `try/finally` release, and stale-lock expiry exists via timestamp comparison, but the check-then-create window and divergent field name remain
* **Security Classification:** CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization) - CWE-367 (TOCTOU) on the Node check-then-create
* **Description:** Two writers on the same workbook race in Java and C# with no lock at all - in Node they race inside the acquire window - and a Node lockfile is not recognized by the documented `locked_at` schema, so mixed-implementation deployments cannot interoperate on lock state.
* **Impact:** Concurrent writes can corrupt or lose workbook data - the core integrity guarantee of the [API](#glossary).
* **Remediation Recommendation:** Implement atomic lockfile creation (`O_EXCL`/exclusive create) with the documented `locked_at` field in all servers, and honor foreign locks regardless of creator.
* **Verification Method:** Parallel writes from two server instances against one workbook serialize and produce a consistent file.
* **Exploitability Narrative:** [N/A](#glossary) - MEDIUM severity - narrative not required.

### FND-SEC-009: No HTTP security headers emitted

* **Pillar:** Security & Compliance
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** all three server pipelines
* **Requirement Basis:** Baseline hardening for network-facing services
* **Evidence:** EVD-007, EVD-014, EVD-018 - no helmet/HSTS/CSP/X-Content-Type-Options configuration found (Inspected)
* **Confidence:** HIGH - header hardening is absent in all three pipelines
* **Verification State:** Statically confirmed
* **Counter-check:** As a JSON-only [API](#glossary) the exposure is lower than a rendered web app, hence LOW not MEDIUM
* **Security Classification:** CWE-693 (Protection Mechanism Failure)
* **Description:** Responses carry no `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or equivalent hardening headers - the served [YAML](#glossary) endpoint could be sniffed in older clients.
* **Impact:** Minor browser-side attack surface left open - mostly defense-in-depth.
* **Remediation Recommendation:** Add a minimal security-header set per server (`nosniff`, `deny`, `no-referrer`).
* **Verification Method:** Response headers include the configured set on representative endpoints.
* **Exploitability Narrative:** [N/A](#glossary) - LOW severity observation.

### FND-INF-001: No CI/CD configuration exists

* **Pillar:** Infrastructure & [CI/CD](#glossary)
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** repository root
* **Requirement Basis:** GUIDELINES.md verify loop (build, lint, test) and standard delivery practice
* **Evidence:** EVD-026 - inspected for `.github`, `.gitlab-ci.yml`, Jenkins, and pipeline files - none exist (Inspected)
* **Confidence:** HIGH - absence is total
* **Verification State:** Statically confirmed
* **Counter-check:** Checked for Makefile/task runners or shell scripts that could substitute for CI - only `sync-openapi.sh` exists
* **Security Classification:** [N/A](#glossary)
* **Description:** Nothing runs builds, unit tests, lint, or the integration suite automatically. The documented verification workflow is manual, which is consistent with the undetected defects found elsewhere in this report.
* **Impact:** Defects merge without a gate - release quality depends entirely on manual discipline.
* **Remediation Recommendation:** Add a minimal pipeline running per-component build plus unit tests and the integration suite against at least one server.
* **Verification Method:** A pull request triggers the pipeline and blocks merge on failure.
* **Exploitability Narrative:** [N/A](#glossary) - process gap.

### FND-INF-002: Compose environment variables do not match loader names

* **Pillar:** Infrastructure & [CI/CD](#glossary)
* **Severity:** High
* **Type:** Concern
* **Target Files/Modules:** `docker-compose.yaml`, `docker-compose.test.yaml`, all three config loaders
* **Requirement Basis:** Documented container deployment path
* **Evidence:** EVD-007, EVD-014, EVD-020, EVD-024 - inspected compose exports vs loader lookups (Inspected)
* **Confidence:** HIGH - Compose sets `CONFIG_PATH`/`ACCESS_PATH` while every loader reads `CONFIG`/`ACCESS`/`WORK` - the mounted files at `/etc/excel-api/*` are therefore never referenced and default resolution falls to `config/config.yaml`, which is absent in the images
* **Verification State:** Statically confirmed - containers NOT RUN
* **Counter-check:** Checked for entrypoint scripts or symlinks bridging the names - none exist - WORKFLOWS env-var naming drift (`IMPL=` vs `IMAGE=`) is a related but separate doc issue
* **Security Classification:** [N/A](#glossary)
* **Description:** The documented `docker compose` deployment cannot locate its configuration in any of the three servers: loaders resolve `CONFIG`/`ACCESS`/`WORK`, Compose exports `CONFIG_PATH`/`ACCESS_PATH`.
* **Impact:** Every documented container startup fails at config load - the black-box test harness cannot run as documented either.
* **Remediation Recommendation:** Either export `CONFIG`/`ACCESS` in both Compose files or teach each loader to accept the `_PATH` variants - add a smoke check that the container reaches `/health`.
* **Verification Method:** `docker compose up` for each `IMAGE` reaches healthy state without manual env overrides.
* **Exploitability Narrative:** [N/A](#glossary) - deployment defect.

### FND-INF-003: Compiled Linux binary committed at project root

* **Pillar:** Infrastructure & [CI/CD](#glossary)
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-go/excel-api-go`
* **Requirement Basis:** GUIDELINES.md binary-output rule (all binaries to gitignored `bin/`)
* **Evidence:** EVD-022 - `file` reports a 7,584,554-byte x86-64 [ELF](#glossary), dynamically linked, with debug info, not stripped - `git ls-files` shows it tracked - `.gitignore` has no `bin/` rule (Inspected)
* **Confidence:** HIGH - tracked artifact, verified format
* **Verification State:** Statically confirmed
* **Counter-check:** The Go Dockerfile builds a fresh `CGO_ENABLED=0` stripped binary, so the committed artifact is a dev build leftover rather than a release artifact
* **Security Classification:** CWE-1357 (Reliance on Insufficiently Trustworthy Component) is the adjacent class for unverifiable binary provenance - primarily a hygiene violation
* **Description:** A host-built, dynamically linked, unstripped Go binary is committed at the component root, contrary to the repository's own binary-placement rule, and `.gitignore` lacks the `bin/` entry the rule requires.
* **Impact:** Repository size bloat, stale-artifact confusion (it will drift from `cmd/` source), and an unverifiable executable in the supply chain.
* **Remediation Recommendation:** Remove the binary from tracking, add `bin/` and the artifact path to `.gitignore`, and document the release build path.
* **Verification Method:** `git ls-files` no longer lists executables - a fresh clone builds the CLI from source.
* **Exploitability Narrative:** [N/A](#glossary) - MEDIUM severity - narrative not required.

### FND-INF-004: Metrics output thin and not valid Prometheus exposition

* **Pillar:** Infrastructure & [CI/CD](#glossary)
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `excel-api-node/src/metrics/collector.ts` lines 64-105, `excel-api-java/.../controller/MetricsController.java`, `excel-api-csharp/src/ExcelApi/Endpoints/HealthEndpoints.cs` metrics block
* **Requirement Basis:** `getMetrics` contract and "Prometheus/OpenMetrics text format" claim
* **Evidence:** EVD-012, EVD-016, EVD-018 - inspected exporters (Inspected)
* **Confidence:** HIGH - Java and C# emit only uptime plus an info gauge - Node emits HELP/TYPE lines whose metric name includes the label set (`name{labels}`), nonstandard `_min/_max/_p50` series instead of histogram `_bucket` lines, and no OpenMetrics EOF marker
* **Verification State:** Statically confirmed - not scraped
* **Counter-check:** Node does collect per-endpoint counters and durations internally, so the gap is exposition correctness, not absence of data
* **Security Classification:** [N/A](#glossary)
* **Description:** `/metrics` output is incompatible with Prometheus exposition conventions in all three servers: labeled TYPE/HELP lines are malformed and histograms use a custom percentile series - Java and C# expose almost nothing.
* **Impact:** Standard Prometheus scraping records malformed series - the documented observability contract is unmet.
* **Remediation Recommendation:** Emit one HELP/TYPE pair per base metric name, encode labels only on sample lines, expose histogram `_bucket`/`_sum`/`_count` series, and expand Java/C# coverage to request counters.
* **Verification Method:** `promtool`-style exposition parse accepts the endpoint output.
* **Exploitability Narrative:** [N/A](#glossary) - observability gap.

### FND-INF-005: No HEALTHCHECK in images, no digest pinning

* **Pillar:** Infrastructure & [CI/CD](#glossary)
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** all five `Dockerfile` files
* **Requirement Basis:** Container operational readiness per `docs/DEPLOYMENT.md`
* **Evidence:** EVD-025 - inspected Dockerfiles (Inspected)
* **Confidence:** HIGH - no `HEALTHCHECK` instruction and base images are tag-pinned, not digest-pinned
* **Verification State:** Statically confirmed
* **Counter-check:** Compose defines a `healthcheck` for the service container, partially compensating in that path only
* **Security Classification:** [N/A](#glossary)
* **Description:** Images rely on Compose-level health checks and mutable tags (`node:22-alpine`, `eclipse-temurin:21-jre-alpine`, `mcr.microsoft.com/dotnet/*:8.0-alpine`).
* **Impact:** Image-level liveness is absent outside Compose and base images can drift between builds.
* **Remediation Recommendation:** Add `HEALTHCHECK` to server images and pin base images by digest in the release pipeline.
* **Verification Method:** `docker inspect` shows a healthcheck - build pins resolve to recorded digests.
* **Exploitability Narrative:** [N/A](#glossary) - operational hygiene.

### FND-INF-006: Served spec version overridden by hardcoded literals

* **Pillar:** Infrastructure & [CI/CD](#glossary)
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** `excel-api-java/.../controller/OpenApiController.java`, `excel-api-csharp/src/ExcelApi/Endpoints/OpenApiEndpoints.cs`, `excel-api-node/src/routes/openapi.ts`, `excel-api-node/src/routes/health.ts`, `excel-api-csharp/.../HealthEndpoints.cs`, `excel-api-java/.../controller/HealthController.java`, `docs/VERSIONING.md`
* **Requirement Basis:** Version synchronization policy in `docs/VERSIONING.md`
* **Evidence:** EVD-030 - inspected version literals across the tree (Inspected)
* **Confidence:** HIGH - hardcoded `"0.0.1"` replacement literals and a Go `var version = "0.0.1"` were found diverging from the canonical 0.0.2
* **Verification State:** Statically confirmed - corrected during this audit pass
* **Counter-check:** The substitutions targeted a `${version}` placeholder that the synced [YAML](#glossary) no longer contains, so the served version was incidentally correct, but the literals were still live divergence points
* **Security Classification:** [N/A](#glossary)
* **Description:** Seven hardcoded version literals existed outside the locations `VERSIONING.md` originally listed: health and openapi handlers in all three servers plus a Go `version` variable duplicating `config.Version`. All were synchronized to 0.0.2 or redirected to the canonical constant during this audit, and `VERSIONING.md` now enumerates them.
* **Impact:** Latent drift between declared, served, and reported versions on the next bump.
* **Remediation Recommendation:** Keep `docs/VERSIONING.md`'s expanded file list authoritative and prefer deriving served versions from build metadata rather than literals.
* **Verification Method:** `grep -rn "0\\.0\\.[0-9]"` finds no stale literals and health/openapi responses report the manifest version.
* **Exploitability Narrative:** [N/A](#glossary) - metadata hygiene.

### FND-AIP-001: No AI-provenance verification artifacts

* **Pillar:** AI Provenance & Code Origin
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** repository-wide
* **Requirement Basis:** `docs/COPYRIGHTS.md` requires AI-generated code to be verified for originality
* **Evidence:** EVD-003, EVD-027, EVD-028 - inspected history, guidelines, and licensing docs (Inspected)
* **Confidence:** MEDIUM - policy text exists but no attribution markers, generation logs, or review records were found - absence of artifacts does not establish absence of practice
* **Verification State:** Statically confirmed absence of artifacts
* **Counter-check:** Per audit rules, no authorship is inferred from style - the finding records missing verification evidence only
* **Security Classification:** [N/A](#glossary)
* **Description:** The copyright policy mandates originality verification for AI-generated code, but no commit trailers, review records, or tooling output document that verification occurring.
* **Impact:** Provenance claims cannot be substantiated to a reviewer or licensee.
* **Remediation Recommendation:** Add a lightweight provenance convention (commit trailer or attribution note) and retain review evidence for generated contributions.
* **Verification Method:** A sampled recent change carries recorded provenance.
* **Exploitability Narrative:** [N/A](#glossary) - governance gap.

### FND-CPR-001: Declared license policy unenforced, component licenses unknown

* **Pillar:** Copyrights & Originality
* **Severity:** Medium
* **Type:** Concern
* **Target Files/Modules:** `docs/COPYRIGHTS.md`, `LICENSE.md`, all dependency manifests
* **Requirement Basis:** Declared policy limiting dependencies to MIT, Apache 2.0, BSD, ISC, Boost
* **Evidence:** EVD-028, [SBOM](#glossary) table - inspected policy and manifests (Inspected)
* **Confidence:** HIGH - no license scanner config, [SBOM](#glossary), or third-party notice file exists - all 31 direct components show `Unknown` license in the manifest-derived inventory
* **Verification State:** Statically confirmed
* **Counter-check:** `logstash-logback-encoder` is flagged `Review` because its published licensing is dual Apache-2.0/LGPL-2.1, which the manifest does not declare and the policy does not address - nothing inspected contradicts the policy, but nothing verifies it either
* **Security Classification:** [N/A](#glossary)
* **Description:** The permissive-license allowlist is a stated rule with no enforcement artifact: no license report, no NOTICE file, and no per-dependency declarations inside the manifests.
* **Impact:** A noncompliant transitive license could enter undetected - licensee-facing due diligence cannot be supported from the repo.
* **Remediation Recommendation:** Generate a per-component [SBOM](#glossary) (for example via manifest-to-SPDX tooling) and add a license-policy check covering direct and transitive dependencies.
* **Verification Method:** A license report lists every resolved dependency and flags policy violations.
* **Exploitability Narrative:** [N/A](#glossary) - compliance gap.

### FND-CPR-002: No third-party notices, binary provenance unverifiable

* **Pillar:** Copyrights & Originality
* **Severity:** Low
* **Type:** Observation
* **Target Files/Modules:** repository root, `excel-api-go/excel-api-go`
* **Requirement Basis:** Attribution obligations under permissive licenses and internal binary policy
* **Evidence:** EVD-022, EVD-028 - inspected root documents and tracked artifact (Inspected)
* **Confidence:** HIGH - no `THIRD-PARTY-NOTICES`/NOTICE/attribution file exists - the binary has no build manifest
* **Verification State:** Statically confirmed
* **Counter-check:** The project itself is MIT-licensed with a named holder, so the project's own attribution is in order
* **Security Classification:** [N/A](#glossary)
* **Description:** No attribution inventory accompanies the dependency set, and the committed Go executable carries no recorded provenance (build flags, commit, or checksum list).
* **Impact:** Redistribution cannot demonstrate license attribution - artifact trust is asserted rather than evidenced.
* **Remediation Recommendation:** Generate a `THIRD-PARTY-NOTICES` file from the [SBOM](#glossary) and remove or re-derive the binary with recorded build provenance.
* **Verification Method:** Notices file covers all distributed components - binaries map to commit plus checksum.
* **Exploitability Narrative:** [N/A](#glossary) - attribution hygiene.

## Technical Debt Register

| Debt ID | Debt Item                                       | Category        | Source Finding | Remediation Cost | Cost of Delay                          | Status |
|---------|-------------------------------------------------|-----------------|----------------|------------------|----------------------------------------|--------|
| TDR-001 | Triplicated business logic across three servers | Maintainability | FND-ARC-002    | High effort      | Growing divergence per change          | Open   |
| TDR-002 | Unwired write-queue scaffolding and dead code   | Maintainability | FND-CQY-008    | Low effort       | Confusing architecture surface         | Open   |
| TDR-003 | Placeholder test debt in integration suite      | Reliability     | FND-CQY-005    | Medium effort    | Regressions ship undetected            | Open   |
| TDR-004 | Documentation drift versus source tree          | Maintainability | FND-ARC-007    | Medium effort    | Onboarding and automation misdirection | Open   |

### TDR-001: Triplicated business logic across three servers

* **Category:** Maintainability
* **Source Finding:** FND-ARC-002
* **Description:** The same record-addressing, header-parsing, lock-management, and error-mapping logic is implemented three times with divergent behavior (range handling, error envelopes, `after_row` semantics). There is no shared spec artifact beyond the contract document and no conformance harness enforcing parity.
* **Remediation Cost:** High effort - requires either generated clients/validators or a conformance suite - estimate requires team-capacity information not supplied.
* **Cost of Delay:** Each feature or fix lands three times with rising inconsistency risk, evidenced by the divergences already present.
* **Status:** Open

### TDR-002: Unwired write-queue scaffolding and dead code

* **Category:** Maintainability
* **Source Finding:** FND-CQY-008
* **Description:** `writeQueue.ts`, its 168-line unit-test file, and the `queue_depth` contract field describe batching behavior that is never invoked, while `batch_max_size`/`batch_debounce_ms` config remains accepted and ignored.
* **Remediation Cost:** Low effort - either wire it into the write routes or delete it.
* **Cost of Delay:** Readers reasonably assume queueing exists - the false surface grows as routes accrete.
* **Status:** Open

### TDR-003: Placeholder test debt in integration suite

* **Category:** Reliability
* **Source Finding:** FND-CQY-005
* **Description:** Five of eight integration spec files contain `expect(true)` bodies while claiming scenario coverage in `TESTING.md` - the suite currently cannot fail on the defects it was designed to catch.
* **Remediation Cost:** Medium effort - real assertions against the fixture set for T-02 through T-08.
* **Cost of Delay:** Every release decision is made without the suite's stated signal.
* **Status:** Open

### TDR-004: Documentation drift versus source tree

* **Category:** Maintainability
* **Source Finding:** FND-ARC-007
* **Description:** Layout diagrams, framework names, env-var names, and lockfile field names in `ARCHITECTURE.md`, `SPECIFICATION.md`, `TESTING.md`, and `WORKFLOW.md` diverge from the inspected sources.
* **Remediation Cost:** Medium effort - a reconciliation pass plus a doc-checklist convention.
* **Cost of Delay:** Automation and contributors continue building on inaccurate specifications.
* **Status:** Open

## Unified Risk Register

| Risk ID | Risk                                                     | Source Finding | Impact                               | Likelihood | Severity | Mitigation                                  |
|---------|----------------------------------------------------------|----------------|--------------------------------------|------------|----------|---------------------------------------------|
| RSK-001 | Anonymous read/write/delete on the C# server             | FND-SEC-001    | Full workbook data exposure and loss | HIGH       | CRITICAL | Implement real auth and scope checks        |
| RSK-002 | Credentials and tokens captured on plaintext transport   | FND-SEC-004    | Credential theft, token replay       | MEDIUM     | HIGH     | Enable TLS or terminate at a proxy          |
| RSK-003 | Low-scope tokens perform write/admin operations in Java  | FND-SEC-003    | Unauthorized data modification       | HIGH       | CRITICAL | Enforce ACL rules per endpoint              |
| RSK-004 | Record insertion silently overwrites workbook rows       | FND-CQY-003    | Data corruption                      | MEDIUM     | HIGH     | Shift rows before insert                    |
| RSK-005 | All Node writes fail with 409 via the ESM require defect | FND-CQY-001    | Write path unusable                  | HIGH       | CRITICAL | Replace `require` with an ES import         |
| RSK-006 | Concurrent writes corrupt files absent working locks     | FND-SEC-008    | Data loss, torn workbooks            | MEDIUM     | HIGH     | Atomic lockfile protocol in all servers     |
| RSK-007 | Documented container deployment cannot start             | FND-INF-002    | Deployment outage, test harness dead | HIGH       | CRITICAL | Align env-var names                         |
| RSK-008 | Regressions pass undetected through placeholder tests    | FND-CQY-005    | Defects ship silently                | HIGH       | HIGH     | Implement the declared test scenarios       |
| RSK-009 | License or provenance violation enters undetected        | FND-CPR-001    | Compliance exposure                  | MEDIUM     | MEDIUM   | [SBOM](#glossary) plus license-policy check |
| RSK-010 | Delivery stalls on single-author, pipeline-free workflow | FND-INF-001    | Slow remediation, quality drift      | MEDIUM     | MEDIUM   | CI pipeline and release discipline          |
| RSK-011 | Online brute force against secrets and static tokens     | FND-SEC-007    | Credential compromise                | MEDIUM     | MEDIUM   | Rate limiting on `/auth/token`              |
| RSK-012 | Operators act on stale or wrong documentation            | FND-ARC-007    | Misconfiguration, bad assumptions    | MEDIUM     | MEDIUM   | Documentation reconciliation pass           |

### RSK-001: Anonymous read/write/delete on the C# server

* **Source Finding:** FND-SEC-001
* **Description:** Every C# data endpoint is served without authentication, and the token endpoint returns fixed dummy strings - an attacker needs only network reachability.
* **Impact:** Complete read/write exposure of all registered workbooks - data breach and integrity loss.
* **Likelihood:** HIGH - the path is unconditional and requires no special conditions.
* **Severity:** CRITICAL
* **Confidence:** HIGH
* **Triggering Condition:** Network access to the C# listener.
* **Existing Controls:** None - no middleware, no scope checks.
* **Mitigation:** Wire `access.yaml`-backed JWT/static-token authentication and [ACL](#glossary) enforcement before deployment.
* **Residual Risk:** UNKNOWN until authentication is implemented and re-verified.
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** 401 without credentials and 403 on scope mismatch verified in a conformant build.

### RSK-002: Credentials and tokens captured on plaintext transport

* **Source Finding:** FND-SEC-004
* **Description:** All servers listen on [HTTP](#glossary) only - the `tls.enabled` flag is cosmetic.
* **Impact:** Credential and token interception enabling full [API](#glossary) impersonation.
* **Likelihood:** MEDIUM - requires network position - deployment scope unknown.
* **Severity:** HIGH
* **Confidence:** HIGH
* **Triggering Condition:** Deployment on an untrusted network segment.
* **Existing Controls:** None implemented - DEPLOYMENT.md suggests [TLS](#glossary) but no code honors it.
* **Mitigation:** Implement TLS listeners or proxy termination and restrict plaintext deployment to trusted networks.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** [HTTPS](#glossary) negotiation or a documented trusted-network-only constraint.

### RSK-003: Low-scope tokens perform write/admin operations in Java

* **Source Finding:** FND-SEC-003
* **Description:** Java authenticates but never authorizes - scope claims are populated and unused.
* **Impact:** `read`-scope holders can modify or delete data.
* **Likelihood:** HIGH - any valid low-privilege token suffices.
* **Severity:** CRITICAL
* **Confidence:** HIGH
* **Triggering Condition:** Issuance of a low-scope token to an untrusted client.
* **Existing Controls:** Authentication only.
* **Mitigation:** Evaluate `AclConfig` rules per endpoint and reject scope mismatches with 403.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** Scope-enforcement tests passing on the Java server.

### RSK-004: Record insertion silently overwrites workbook rows

* **Source Finding:** FND-CQY-003
* **Description:** `after_row` writes into an occupied row without shifting in all three servers.
* **Impact:** Permanent loss of existing row data.
* **Likelihood:** MEDIUM - requires the `after_row` parameter, which is documented contract surface.
* **Severity:** HIGH
* **Confidence:** HIGH
* **Triggering Condition:** Any caller uses `after_row` on a populated sheet.
* **Existing Controls:** None.
* **Mitigation:** Shift rows before populating the inserted row in each implementation.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** An insert test asserting displaced content survives.

### RSK-005: All Node writes fail with 409 via the ESM require defect

* **Source Finding:** FND-CQY-001
* **Description:** `require('os')` inside an ES module throws on every `acquire`, and handlers map the throw to `FILE_LOCKED`.
* **Impact:** Node server's entire write surface is unusable and reports misleadingly.
* **Likelihood:** HIGH - unconditional on every write in the shipped module format.
* **Severity:** CRITICAL
* **Confidence:** MEDIUM-HIGH - ESM semantics are determinate - the unit-test environment may mask it, so runtime confirmation is pending.
* **Triggering Condition:** Any `PUT`/`POST`/`DELETE` to a writable workbook on Node.
* **Existing Controls:** None.
* **Mitigation:** Import `os` as an ES module and cover `acquire` in an ESM context.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** A successful write through a production-format Node build.

### RSK-006: Concurrent writes corrupt files absent working locks

* **Source Finding:** FND-SEC-008
* **Description:** Java and C# never lock - Node's acquire is non-atomic and uses a divergent field name.
* **Impact:** Torn or lost workbook writes under concurrency or multi-process deployment.
* **Likelihood:** MEDIUM - requires concurrent or mixed-implementation writers.
* **Severity:** HIGH
* **Confidence:** HIGH
* **Triggering Condition:** Two writers target one workbook, or a mixed implementation pair shares a directory.
* **Existing Controls:** Stale-timestamp heuristic only in Node.
* **Mitigation:** Atomic create plus the documented `locked_at` schema everywhere.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** Concurrency integration test shows serialized writes.

### RSK-007: Documented container deployment cannot start

* **Source Finding:** FND-INF-002
* **Description:** Compose exports `CONFIG_PATH`/`ACCESS_PATH` but loaders read `CONFIG`/`ACCESS` - config files mount to an unreferenced path.
* **Impact:** Every documented `docker compose` path fails at startup - the integration harness cannot run.
* **Likelihood:** HIGH - deterministic for the shipped configuration.
* **Severity:** CRITICAL
* **Confidence:** HIGH
* **Triggering Condition:** Any deployment using the committed Compose files without manual env fixes.
* **Existing Controls:** None.
* **Mitigation:** Export the loader-recognized variable names or extend the loaders.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** A Compose boot reaching healthy state per implementation.

### RSK-008: Regressions pass undetected through placeholder tests

* **Source Finding:** FND-CQY-005
* **Description:** Five of eight integration specs assert `true` - critical scenarios are uncovered.
* **Impact:** Defects in locking, writes, and batch behavior ship without signal.
* **Likelihood:** HIGH - already demonstrably the case for the defects in this report.
* **Severity:** HIGH
* **Confidence:** HIGH
* **Triggering Condition:** Any change to covered-by-placeholder behavior.
* **Existing Controls:** Three real spec files only.
* **Mitigation:** Implement the declared scenario assertions.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** Integration suite failures reproduced for seeded defects.

### RSK-009: License or provenance violation enters undetected

* **Source Finding:** FND-CPR-001
* **Description:** The license allowlist has no enforcement mechanism - component licenses are Unknown in manifests.
* **Impact:** Policy-violating dependency could ship - due-diligence evidence absent.
* **Likelihood:** MEDIUM - plausible across a normal dependency lifecycle.
* **Severity:** MEDIUM
* **Confidence:** HIGH
* **Triggering Condition:** Adding or upgrading a dependency with a non-permissive license.
* **Existing Controls:** Policy text only.
* **Mitigation:** Generated SBOM with a license gate.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** License report covering resolved dependencies exists.

### RSK-010: Delivery stalls on single-author, pipeline-free workflow

* **Source Finding:** FND-INF-001
* **Description:** One author, no tags or releases, no automated gates.
* **Impact:** Slow remediation and unverified merges during remediation of this report's items.
* **Likelihood:** MEDIUM - bus-factor and gate absence are persistent conditions.
* **Severity:** MEDIUM
* **Confidence:** MEDIUM - proxies only.
* **Triggering Condition:** Sustained change volume or maintainer unavailability.
* **Existing Controls:** Manual workflow only.
* **Mitigation:** Minimal CI plus a tagged release at the next version bump.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** Pipeline runs on pull requests.

### RSK-011: Online brute force against secrets and static tokens

* **Source Finding:** FND-SEC-007
* **Description:** `/auth/token` accepts unlimited attempts - static tokens are plaintext compared.
* **Impact:** Client-secret or token compromise yields full-scope access.
* **Likelihood:** MEDIUM - requires an exposed listener and weak secrets - exposure scope undocumented.
* **Severity:** MEDIUM
* **Confidence:** HIGH
* **Triggering Condition:** Network-accessible deployment with guessable credentials.
* **Existing Controls:** None.
* **Mitigation:** Rate limit and lockout on token endpoints.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** 429 on threshold breach verified.

### RSK-012: Operators act on stale or wrong documentation

* **Source Finding:** FND-ARC-007
* **Description:** Layout, framework, env-var, and lockfield naming diverge from source.
* **Impact:** Misconfiguration and misdirected fixes.
* **Likelihood:** MEDIUM - documents are actively referenced.
* **Severity:** MEDIUM
* **Confidence:** HIGH
* **Triggering Condition:** A change or deployment driven by the inaccurate documents.
* **Existing Controls:** Documentation-awareness guideline only.
* **Mitigation:** One reconciliation pass plus a doc-change checklist.
* **Residual Risk:** UNKNOWN
* **Treatment State:** Open
* **Owner:** NOT SPECIFIED
* **Closure Trigger:** Docs match tree on a doc-accuracy review.

## Actionable Remediation Roadmap

| Rec ID  | Priority        | Finding     | Recommendation                                                   | Impact | Effort | Complexity | Verification                                   |
|---------|-----------------|-------------|------------------------------------------------------------------|--------|--------|------------|------------------------------------------------|
| REC-001 | [P1](#glossary) | FND-SEC-001 | Implement real authentication and authorization in the C# server | High   | High   | Medium     | 401/403 behavior verified per scope            |
| REC-002 | [P1](#glossary) | FND-SEC-003 | Enforce ACL scope rules on every Java endpoint                   | High   | Medium | Low        | read-scope token gets 403 on writes            |
| REC-003 | [P1](#glossary) | FND-SEC-002 | Verify password grants against bcrypt hashes in Java             | High   | Low    | Low        | password grant accepts correct credential      |
| REC-004 | [P1](#glossary) | FND-INF-002 | Align Compose env vars with loader names                         | High   | Low    | Low        | `docker compose up` reaches healthy            |
| REC-005 | [P1](#glossary) | FND-CQY-001 | Replace `require('os')` with an ES import in the lock module     | High   | Low    | Low        | Node write returns 200 not 409                 |
| REC-006 | [P1](#glossary) | FND-SEC-004 | Implement TLS listeners or document proxy termination            | High   | Medium | Medium     | [HTTPS](#glossary) negotiates with tls.enabled |
| REC-007 | [P1](#glossary) | FND-CQY-003 | Shift rows when inserting records at `after_row`                 | High   | Low    | Low        | displaced row content preserved                |
| REC-008 | [P2](#glossary) | FND-ARC-001 | Implement or remove the two batch endpoints                      | High   | High   | High       | batch call returns BatchResult                 |
| REC-009 | [P2](#glossary) | FND-ARC-002 | Align response schemas to contract in all servers                | High   | High   | Medium     | responses validate against OpenAPI             |
| REC-010 | [P2](#glossary) | FND-ARC-003 | Reconcile `/range` vs `/ranges` and declare or drop openapi.json | Medium | Low    | Low        | declared path returns 200 everywhere           |
| REC-011 | [P2](#glossary) | FND-CQY-002 | Parse full range bounds in Node and Java                         | High   | Medium | Low        | A1:B2 returns a 2x2 block                      |
| REC-012 | [P2](#glossary) | FND-SEC-008 | Implement atomic interoperable lockfile protocol                 | High   | Medium | Medium     | concurrent writers serialize                   |
| REC-013 | [P2](#glossary) | FND-CQY-005 | Replace placeholder specs with real integration assertions       | High   | Medium | Medium     | suite fails on seeded defects                  |
| REC-014 | [P2](#glossary) | FND-INF-001 | Add a minimal build+test pipeline                                | Medium | Medium | Low        | pull request runs the gate                     |
| REC-015 | [P3](#glossary) | FND-SEC-005 | Hash secrets and compare constant-time                           | Medium | Medium | Low        | hashes in access.yaml verify                   |
| REC-016 | [P3](#glossary) | FND-SEC-006 | Configurable CORS allowlist per server                           | Medium | Low    | Low        | disallowed origin rejected                     |
| REC-017 | [P3](#glossary) | FND-SEC-007 | Rate limit `/auth/token` and apply global throttles              | Medium | Medium | Low        | 429 after threshold                            |
| REC-018 | [P3](#glossary) | FND-INF-003 | Remove committed binary, add `bin/` gitignore                    | Low    | Low    | Low        | no executables in `git ls-files`               |
| REC-019 | [P3](#glossary) | FND-INF-004 | Emit valid Prometheus exposition in all servers                  | Medium | Medium | Low        | exposition parses cleanly                      |
| REC-020 | [P3](#glossary) | FND-ARC-004 | Apply per-sheet header modes or drop unused config               | Medium | Medium | Medium     | multi-mode sheet resolves columns              |
| REC-021 | [P3](#glossary) | FND-CQY-004 | Validate request bodies and emit INVALID_REQUEST                 | Medium | Medium | Low        | malformed body yields 400                      |
| REC-022 | [P4](#glossary) | FND-ARC-007 | Reconcile documentation with the source tree                     | Medium | Medium | Low        | doc paths and commands resolve                 |
| REC-023 | [P4](#glossary) | FND-CPR-001 | Generate SBOM and enforce the license allowlist                  | Medium | Medium | Medium     | license report flags violations                |
| REC-024 | [P4](#glossary) | FND-CPR-002 | Publish third-party notices and record binary provenance         | Low    | Low    | Low        | notices cover distributed components           |
| REC-025 | [P4](#glossary) | FND-CQY-006 | Honor loaded config in C# and remove dead branch                 | Low    | Low    | Low        | port change reflects in binding                |
| REC-026 | [P4](#glossary) | FND-CQY-007 | Encode credentials and escape paths in the Go client             | Low    | Low    | Low        | special-character secrets work                 |
| REC-027 | [P4](#glossary) | FND-CQY-008 | Wire or remove the Node write queue and queue_depth              | Low    | Low    | Low        | lock-status reports real depth                 |
| REC-028 | [P4](#glossary) | FND-SEC-009 | Add baseline security headers                                    | Low    | Low    | Low        | headers present on responses                   |
| REC-029 | [P4](#glossary) | FND-AIP-001 | Record provenance for generated contributions                    | Low    | Low    | Low        | sampled change carries provenance              |
| REC-030 | [P4](#glossary) | FND-ARC-005 | Document the single-node storage constraint                      | Low    | Low    | Low        | DEPLOYMENT states the limit                    |
| REC-031 | [P4](#glossary) | FND-ARC-006 | Move RotatingFileLogger out of the bootstrap file                | Low    | Low    | Low        | server.ts is wiring-only                       |
| REC-032 | [P4](#glossary) | FND-INF-005 | Add image healthchecks and digest pinning                        | Low    | Low    | Low        | inspect shows healthcheck                      |

### REC-001: Implement real authentication and authorization in the C# server

* **Priority:** [P1](#glossary)
* **Finding:** FND-SEC-001
* **Description:** Load `access.yaml` through the existing loader, add a Bearer JWT validation filter using the configured secret and a `Token ` static-token check, then apply scope-to-method [ACL](#glossary) rules per endpoint group. Remove the hardcoded client pair and the unconditional `dummy-token` responses. This is the highest-impact change in the repository.
* **Impact:** Eliminates the anonymous read/write surface entirely.
* **Effort:** High - a full auth pipeline plus [ACL](#glossary) evaluation is missing, not merely misconfigured.
* **Complexity:** Medium - all primitives exist as references in the other two servers.
* **Verification:** `GET /workbooks` without credentials returns 401, a `read` token returns 403 on `PUT`, and a valid scoped token succeeds.

### REC-002: Enforce ACL scope rules on every Java endpoint

* **Priority:** [P1](#glossary)
* **Finding:** FND-SEC-003
* **Description:** Evaluate `access.yaml` `acl.rules` against the authenticated authorities per endpoint: scope membership plus method allowance, honoring `admin_endpoints` on lock-status. Implement as a filter or Spring method security.
* **Impact:** Restores the documented least-privilege model on the Java server.
* **Effort:** Medium - authorities are already populated, only the decision point is missing.
* **Complexity:** Low - standard Spring Security authorization.
* **Verification:** A read-scoped token receives 403 on `PUT`/`POST`/`DELETE` and on `lock-status`.

### REC-003: Verify password grants against bcrypt hashes in Java

* **Priority:** [P1](#glossary)
* **Finding:** FND-SEC-002
* **Description:** Replace `passwordHash.equals(password)` with a `PasswordEncoder`/`BCrypt` verification, reject stored values that are not recognizable hashes, and return `invalid_grant` on mismatch. `spring-security-crypto` is already a dependency.
* **Impact:** Makes the password grant functional and removes the plaintext-storage incentive.
* **Effort:** Low - single method change plus tests.
* **Complexity:** Low - localized to `AuthController.validateUser`.
* **Verification:** bcrypt-hashed user authenticates with the correct password and is rejected with a wrong one.

### REC-004: Align Compose env vars with loader names

* **Priority:** [P1](#glossary)
* **Finding:** FND-INF-002
* **Description:** Export `CONFIG` and `ACCESS` (not `CONFIG_PATH`/`ACCESS_PATH`) in both Compose files, or extend each loader to accept the `_PATH` names, so mounted `/etc/excel-api/*.yaml` files are found.
* **Impact:** Restores the only documented deployment path.
* **Effort:** Low - env-var name alignment.
* **Complexity:** Low - two [YAML](#glossary) files or small loader edits.
* **Verification:** `docker compose up` reaches the healthy state for each `IMAGE` value without manual overrides.

### REC-005: Replace `require('os')` with an ES import in the lock module

* **Priority:** [P1](#glossary)
* **Finding:** FND-CQY-001
* **Description:** Change `lockfile.ts` to `import * as os from 'os'` and use `os.hostname()`. Confirm the fix under the built `dist/` artifact rather than only under Vitest.
* **Impact:** Restores the entire Node write path.
* **Effort:** Low - one-line change plus regression coverage.
* **Complexity:** Low - localized to the lock module.
* **Verification:** A `PUT` against a writable workbook on the compiled server returns 200 and creates/removes the `.lock` file.

### REC-006: Implement TLS listeners or document proxy termination

* **Priority:** [P1](#glossary)
* **Finding:** FND-SEC-004
* **Description:** Honor `server.tls` with certificate/key configuration in each server, or explicitly document [TLS](#glossary) termination at a reverse proxy and restrict plaintext listeners to trusted networks.
* **Impact:** Protects credentials and data in transit.
* **Effort:** Medium - three listeners or one documented proxy pattern.
* **Complexity:** Medium - certificate management and deployment docs.
* **Verification:** With `tls.enabled: true` and configured material, each server negotiates [HTTPS](#glossary).

### REC-007: Shift rows when inserting records at `after_row`

* **Priority:** [P1](#glossary)
* **Finding:** FND-CQY-003
* **Description:** Insert with `spliceRows` (ExcelJS), `shiftRows` (POI), or `InsertRows` (ClosedXML) before writing when `after_row` targets an occupied row.
* **Impact:** Stops silent data loss on a documented operation.
* **Effort:** Low - one call per implementation plus a test.
* **Complexity:** Low - localized change.
* **Verification:** An insert at mid-sheet preserves the displaced row's contents.

### REC-008: Implement or remove the two batch endpoints

* **Priority:** [P2](#glossary)
* **Finding:** FND-ARC-001
* **Description:** Decide whether `.../operations` and `.../cells/operations` ship: implement them against the documented queue/lock protocol in all three servers, or remove the paths and schemas from the contract and re-sync copies.
* **Impact:** Either restores a declared capability or fixes contract honesty.
* **Effort:** High for implementation, low for removal.
* **Complexity:** High for implementation (ordering, atomicity, partial-failure semantics) - Low for removal.
* **Verification:** Either `BatchResult` responses conform end-to-end or the contract no longer advertises the paths.

### REC-009: Align response schemas to contract in all servers

* **Priority:** [P2](#glossary)
* **Finding:** FND-ARC-002
* **Description:** Emit `CellData.ref`/`column`/`row`, wrap range results in `RangeData`, return `ColumnList` envelopes in Java and C#, constrain `type` values to the contract enum, and route all errors through `{error, message, details?}`.
* **Impact:** Makes the three servers actually interchangeable for clients.
* **Effort:** High - touches every response path in three codebases.
* **Complexity:** Medium - mechanical but wide.
* **Verification:** A schema-validation harness passes for every endpoint in each server.

### REC-010: Reconcile `/range` vs `/ranges` and declare or drop openapi.json

* **Priority:** [P2](#glossary)
* **Finding:** FND-ARC-003
* **Description:** Choose the canonical path spelling in the contract, update all servers and the Go client, re-sync copies, and either declare `/openapi.json` or remove it.
* **Impact:** Contract-conformant clients work unchanged.
* **Effort:** Low - path renames.
* **Complexity:** Low - coordinated but mechanical.
* **Verification:** Declared paths respond 200 in every server and the served spec lists exactly the implemented routes.

### REC-011: Parse full range bounds in Node and Java

* **Priority:** [P2](#glossary)
* **Finding:** FND-CQY-002
* **Description:** Split `rangeRef` into start/end coordinates in Node and use POI `AreaReference` in Java, bounding iteration to the requested rectangle.
* **Impact:** Corrects a primary read path in two of three servers.
* **Effort:** Medium - bounded parsing logic plus tests.
* **Complexity:** Low - localized per implementation.
* **Verification:** `GET .../range/A1:B2` returns exactly four cells wrapped in `RangeData`.

### REC-012: Implement atomic interoperable lockfile protocol

* **Priority:** [P2](#glossary)
* **Finding:** FND-SEC-008
* **Description:** Create lockfiles with exclusive-create semantics (`wx` flag, atomic create, or OS locking) in all servers, write the documented `{pid, hostname, locked_at, implementation}` payload, and honor foreign-held locks.
* **Impact:** Provides the integrity guarantee the architecture promises for concurrent and mixed deployments.
* **Effort:** Medium - new lock modules in Java/C# plus a Node rewrite.
* **Complexity:** Medium - cross-process correctness.
* **Verification:** Two concurrent writers on one workbook serialize - a foreign lock blocks writes until stale.

### REC-013: Replace placeholder specs with real integration assertions

* **Priority:** [P2](#glossary)
* **Finding:** FND-CQY-005
* **Description:** Implement T-02 through T-08 assertions against the fixture workbooks: record CRUD, lock-status, concurrent writes, batch behavior, and sheet metadata, and remove `UnitTest1.cs` plus the duplicated `parseDuration` test body.
* **Impact:** Converts the suite from decoration into a regression gate.
* **Effort:** Medium - five spec files.
* **Complexity:** Medium - requires working fixtures and auth scopes.
* **Verification:** The suite fails when a seeded defect is introduced into a server.

### REC-014: Add a minimal build+test pipeline

* **Priority:** [P2](#glossary)
* **Finding:** FND-INF-001
* **Description:** Add a CI workflow running `npm ci && npm run build && npm test` for Node, `mvn -B package` for Java, `dotnet test` for C#, `go build ./... && go test ./...` for Go, and the integration suite against one implementation.
* **Impact:** Establishes an automated merge gate for the defects this report tracks.
* **Effort:** Medium - one workflow file plus caching.
* **Complexity:** Low - standard pipelines for each stack.
* **Verification:** A pull request executes the pipeline and blocks merge on failure.

### REC-015: Hash secrets and compare constant-time

* **Priority:** [P3](#glossary)
* **Finding:** FND-SEC-005
* **Description:** Store `client_secret` and `tokens.static[].token` as hashes and verify with `crypto.timingSafeEqual` (Node), `MessageDigest.isEqual` (Java), and a fixed-time compare (C#), keeping backward-readable migration notes.
* **Impact:** Removes directly reusable credentials from config storage.
* **Effort:** Medium - storage format change across three servers plus docs.
* **Complexity:** Low - well-understood primitives.
* **Verification:** Plaintext-free `access.yaml` still authenticates.

### REC-016: Configurable CORS allowlist per server

* **Priority:** [P3](#glossary)
* **Finding:** FND-SEC-006
* **Description:** Add a config-driven origin allowlist - drop the credential-wildcard combination in Java and `origin: true` in Node.
* **Impact:** Constrains browser cross-origin access to intended origins.
* **Effort:** Low - config field plus filter setup.
* **Complexity:** Low.
* **Verification:** Non-allowlisted origins are rejected while allowlisted ones succeed.

### REC-017: Rate limit `/auth/token` and apply global throttles

* **Priority:** [P3](#glossary)
* **Finding:** FND-SEC-007
* **Description:** Add a per-subject or per-IP limiter on the token endpoint and a global request throttle in each server, with a documented 429 response.
* **Impact:** Bounds brute force and resource exhaustion.
* **Effort:** Medium - limiter middleware per stack.
* **Complexity:** Low.
* **Verification:** Requests beyond the threshold return 429.

### REC-018: Remove committed binary, add `bin/` gitignore

* **Priority:** [P3](#glossary)
* **Finding:** FND-INF-003
* **Description:** Delete the tracked `excel-api-go/excel-api-go` artifact, add `bin/` and the artifact path to `.gitignore`, and document the release build path.
* **Impact:** Repository hygiene and provenance clarity.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** `git ls-files` lists no executables - `go build -o bin/` produces the CLI.

### REC-019: Emit valid Prometheus exposition in all servers

* **Priority:** [P3](#glossary)
* **Finding:** FND-INF-004
* **Description:** Emit HELP/TYPE per base metric name, put labels on sample lines only, expose real histogram `_bucket`/`_sum`/`_count` series, and expand Java/C# beyond uptime.
* **Impact:** The `/metrics` endpoint becomes scrapable as documented.
* **Effort:** Medium.
* **Complexity:** Low.
* **Verification:** A Prometheus exposition parser accepts the output.

### REC-020: Apply per-sheet header modes or drop unused config

* **Priority:** [P3](#glossary)
* **Finding:** FND-ARC-004
* **Description:** Either implement `single`/`multi`/`legend`/`none` handling in record and column paths consistently (including the Java indexing fix) or remove the unused schema surface.
* **Impact:** Config honesty and correct addressing for non-trivial sheets.
* **Effort:** Medium - three implementations.
* **Complexity:** Medium - per-mode resolution rules.
* **Verification:** A multi-mode sheet yields consistent columns and records across servers.

### REC-021: Validate request bodies and emit INVALID_REQUEST

* **Priority:** [P3](#glossary)
* **Finding:** FND-CQY-004
* **Description:** Add schema validation on all request bodies (Zod or Fastify JSON schema in Node, explicit checks or Bean Validation in Java, model binding guards in C#) and map failures to `INVALID_REQUEST`.
* **Impact:** Contract-conformant error handling instead of 500s.
* **Effort:** Medium.
* **Complexity:** Low.
* **Verification:** Missing `value`/`data` returns 400 with the contract envelope.

### REC-022: Reconcile documentation with the source tree

* **Priority:** [P4](#glossary)
* **Finding:** FND-ARC-007
* **Description:** Update layout sections in `ARCHITECTURE.md`/`SPECIFICATION.md`, framework names in `TESTING.md`, and `IMPL=`/`IMAGE=` and lockfile field names in `WORKFLOW.md`/`ARCHITECTURE.md`.
* **Impact:** Restores the documents' source-of-truth role.
* **Effort:** Medium.
* **Complexity:** Low.
* **Verification:** Every documented path and command resolves in the tree.

### REC-023: Generate SBOM and enforce the license allowlist

* **Priority:** [P4](#glossary)
* **Finding:** FND-CPR-001
* **Description:** Produce an [SPDX](#glossary) or CycloneDX SBOM covering direct and transitive dependencies in all four manifests, record licenses, and gate on the declared allowlist.
* **Impact:** Converts the license policy from text into an enforced control.
* **Effort:** Medium.
* **Complexity:** Medium - multi-ecosystem tooling.
* **Verification:** A license report lists every resolved dependency and violations are flagged.

### REC-024: Publish third-party notices and record binary provenance

* **Priority:** [P4](#glossary)
* **Finding:** FND-CPR-002
* **Description:** Generate a `THIRD-PARTY-NOTICES` file from the [SBOM](#glossary) and record build provenance for any distributed artifact.
* **Impact:** Attribution and artifact trust become demonstrable.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** Notices file covers all distributed components.

### REC-025: Honor loaded config in C# and remove dead branch

* **Priority:** [P4](#glossary)
* **Finding:** FND-CQY-006
* **Description:** Bind the listener to `serverConfig`, route file logging through `logging.file`, consume the loaded `access.yaml`, and remove the unreachable return in `GetCellType`.
* **Impact:** Configuration behaves as documented on the C# server.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** A non-default port produces a matching bind and warnings-as-errors is clean.

### REC-026: Encode credentials and escape paths in the Go client

* **Priority:** [P4](#glossary)
* **Finding:** FND-CQY-007
* **Description:** Build the token request body with `url.Values`, use the configured timeout client for `ObtainToken`, and `url.PathEscape` all path parameters.
* **Impact:** Removes credential-corruption and URL-injection edge cases.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** A secret containing `&` authenticates and a sheet named with a slash resolves.

### REC-027: Wire or remove the Node write queue and queue_depth

* **Priority:** [P4](#glossary)
* **Finding:** FND-CQY-008
* **Description:** Either connect `WriteQueue` to the write routes with a real `queue_depth` and capacity-based 503, or remove the module, its tests, and the contract field.
* **Impact:** Eliminates misleading dead architecture.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** `lock-status` reflects actual queue depth or the field is removed.

### REC-028: Add baseline security headers

* **Priority:** [P4](#glossary)
* **Finding:** FND-SEC-009
* **Description:** Emit `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer` in each server.
* **Impact:** Cheap defense-in-depth.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** Headers appear on representative responses.

### REC-029: Record provenance for generated contributions

* **Priority:** [P4](#glossary)
* **Finding:** FND-AIP-001
* **Description:** Adopt a provenance convention (commit trailer or note) and keep originality-review evidence for generated code as required by `COPYRIGHTS.md`.
* **Impact:** Provenance claims become auditable.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** A sampled recent contribution carries recorded provenance.

### REC-030: Document the single-node storage constraint

* **Priority:** [P4](#glossary)
* **Finding:** FND-ARC-005
* **Description:** State explicitly in `DEPLOYMENT.md` that multi-replica deployment is unsupported with local file storage and advisory locks.
* **Impact:** Prevents unsafe scale-out attempts.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** Deployment docs state the constraint.

### REC-031: Move RotatingFileLogger out of the bootstrap file

* **Priority:** [P4](#glossary)
* **Finding:** FND-ARC-006
* **Description:** Relocate `RotatingFileLogger` into `src/logger/` and keep `server.ts` to wiring only.
* **Impact:** Aligns the module layout with the documented structure.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** `server.ts` contains only bootstrap code.

### REC-032: Add image healthchecks and digest pinning

* **Priority:** [P4](#glossary)
* **Finding:** FND-INF-005
* **Description:** Add `HEALTHCHECK` instructions to server Dockerfiles and pin base images by digest in the release pipeline.
* **Impact:** Image-level liveness outside Compose and reproducible builds.
* **Effort:** Low.
* **Complexity:** Low.
* **Verification:** `docker inspect` shows healthchecks and digest pins.

## Scope Exclusions

- **Runtime and execution checks**.

All builds, tests, linters, scanners, and live endpoint calls are `NOT INSPECTED` because this
audit is source-only - every unrun check is listed in Limitations and Unknowns.

- **Dynamic/runtime penetration testing**.

`NOT PERFORMED` by default. Security findings on network-facing surfaces carry `Theoretical` or
`Static-Confirmed` exploitability narratives only - a scoped live penetration test is a distinct
engagement.

- **Organizational and team interviews, business-fit assessment**.

`NOT PERFORMED` by default. The report covers engineering dimensions of technical due diligence
but not interview-based pillars.

- **Compliance certification**.

`NOT PERFORMED`. This report is not a SOC 2, [ISO](#glossary) 27001, or PCI-DSS conformance assessment.
referenced standards were used as rubrics and coverage checklists only.

- **Operational runtime infrastructure**.

Live servers, container hosts, network topology, and firewall rules were `NOT INSPECTED` - only
the checked-in Dockerfiles and Compose configuration were reviewed.

- **Data backups and disaster-recovery procedures**.

`NOT INSPECTED` - no backup tooling or runbook exists in the repository to review.

- **Skill Definition Conformance**.

Omitted - the subject contains no `SKILL.md` files and is not an Agent Skill.

- **AI System Assessment**.

Omitted - the project does not train, serve, or materially depend on an AI system (the
AI-provenance pillar is assessed separately under findings).

- **API Compatibility & Versioning Discipline pillar**.

Omitted - the subject is a deployable service, not a reusable library or package - contract
conformance is assessed in its own section.

- **Architecture Decision Records**.

Omitted - no ADR artifacts exist in the repository, and no decision records were supplied.

- **Changes Since Previous Audit**.

Omitted by design - this is a fresh audit - a prior Polish report (`AUDYT.md`, revision 1.0)
exists at the repository root but was not used as a comparison baseline.

- **[OWASP](#glossary) coverage statement**.

OWASP API Security Top 10 (2023) categories assessed from source: API2 (authentication), API5
(function-level authorization), API8 (security misconfiguration), API10 partially (unsafe
consumption). `NOT ASSESSED`: API3 (object property authorization - requires schema-level data
modeling review), API4 (resource consumption beyond noted rate limits), API6 (business flows),
API7 (server-side request forgery - no outbound [URL](#glossary) fetching found), API9 (inventory management -
single service), and web-application Top 10 categories that do not apply to a JSON API.

## Limitations and Unknowns

| Item                                                                    | Type        | Reason                                          | Resolution                                                   |
|-------------------------------------------------------------------------|-------------|-------------------------------------------------|--------------------------------------------------------------|
| Node `require('os')` runtime failure                                    | Unrun check | Requires execution of the built ESM artifact    | `node dist/lock/lockfile.js` acquire call or a write request |
| Java `CellReference` rejection of `A1:C3` range strings                 | Unrun check | Requires executing POI parsing                  | `mvn test` plus a range-read request                         |
| Spring CORS wildcard+credentials rejection behavior                     | Unrun check | Requires a running filter chain                 | Preflight request against the Java server                    |
| Unit and integration test outcomes                                      | Unrun check | Source-only audit                               | `npm test`, `mvn test`, `dotnet test`, `go test`, `jest`     |
| Container startup under the shipped Compose files                       | Unrun check | Requires Docker runtime                         | `docker compose up --abort-on-container-exit`                |
| Dependency vulnerability posture                                        | Unrun check | No advisory scan artifact supplied or committed | OSV/npm audit/Maven dependency-check/NuGet audit run         |
| Resolved (transitive) dependency license set                            | Unknown     | Manifests do not record licenses                | Generated SBOM with license data                             |
| logstash-logback-encoder license class                                  | Unknown     | License not declared in inspected pom           | Package POM license element or vendor LICENSE                |
| Deployment network exposure                                             | Unknown     | No deployment inventory supplied                | Environment inventory or deployment manifest                 |
| [DORA](#glossary) metrics (lead time, deployment frequency, fail rates) | Unknown     | No tags, releases, or incident data exist       | Tagged releases and deployment telemetry                     |
| Reviewer diversity                                                      | Unknown     | Git history does not record reviews             | Pull-request or code-review records                          |
| `access.yaml` production content and secret strength                    | Unknown     | Secret-bearing file not committed               | Redacted access config review                                |
| Remediation cost in effort units                                        | Unknown     | No team-capacity or rate data supplied          | Capacity plan or engineering estimate                        |

## Re-audit And Follow-up Plan

| Finding     | Priority        | Verification Owner | Closure Evidence                                             | Target Re-audit Trigger         |
|-------------|-----------------|--------------------|--------------------------------------------------------------|---------------------------------|
| FND-SEC-001 | [P1](#glossary) | NOT SPECIFIED      | C# endpoints reject anonymous and scope-mismatched calls     | Next P1 remediation merge       |
| FND-SEC-002 | [P1](#glossary) | NOT SPECIFIED      | Password grant verified against bcrypt fixture               | Next P1 remediation merge       |
| FND-SEC-003 | [P1](#glossary) | NOT SPECIFIED      | Scope-enforcement tests pass on Java                         | Next P1 remediation merge       |
| FND-SEC-004 | [P1](#glossary) | NOT SPECIFIED      | [TLS](#glossary) negotiation or documented proxy termination | Deployment configuration change |
| FND-CQY-001 | [P1](#glossary) | NOT SPECIFIED      | Production-format Node build completes a write               | Next P1 remediation merge       |
| FND-CQY-003 | [P1](#glossary) | NOT SPECIFIED      | Insert preserves displaced row in all servers                | Next P1 remediation merge       |
| FND-INF-002 | [P1](#glossary) | NOT SPECIFIED      | Compose boots healthy for each implementation                | Next deployment-affecting merge |
| FND-ARC-001 | [P2](#glossary) | NOT SPECIFIED      | Batch endpoints implemented or contract amended              | Contract change                 |
| FND-ARC-002 | [P2](#glossary) | NOT SPECIFIED      | Schema-validation harness passes per server                  | Contract change                 |
| FND-CQY-002 | [P2](#glossary) | NOT SPECIFIED      | Range requests return bounded results                        | Next P2 remediation merge       |
| FND-SEC-008 | [P2](#glossary) | NOT SPECIFIED      | Concurrent writes serialize under a shared lockfile          | Next P2 remediation merge       |
| FND-CQY-005 | [P2](#glossary) | NOT SPECIFIED      | Integration suite exercises real assertions                  | Next P2 remediation merge       |
| FND-INF-001 | [P2](#glossary) | NOT SPECIFIED      | Pipeline executes on pull requests                           | CI configuration merge          |

Sign-off gates: RSK-001, RSK-003, RSK-005, and RSK-007 must be `Closed` before any
production-bound deployment is considered, because each gates a network-facing or
deployment-blocking defect.

A re-audit is additionally triggered by any manifest or lockfile change (SBOM-drift re-audit)
and by completion of the [P1](#glossary) roadmap items - if any `HIGH` or `CRITICAL` network-facing finding
remains `Theoretical` after remediation planning, escalation to a scoped live penetration test
is the verification path.

## Validation Record

| Check                          | Result           | Evidence / Justification                                                                                                                                                          |
|--------------------------------|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PAR-1                          | Applied          | Every Security finding carries a CWE ID or a justified `N/A`                                                                                                                      |
| PAR-2                          | Applied          | Severity table carries the matrix-not-CVSS clarification line                                                                                                                     |
| PAR-3                          | Applied          | [ISO/IEC](#glossary) 25010:2023 crosswalk present as a coverage mapping                                                                                                           |
| PAR-4                          | Applied          | Technical Debt Register separates remediation cost from delay cost                                                                                                                |
| PAR-5                          | Applied          | Git author/commit concentration inspected, Team & Continuity line present                                                                                                         |
| PAR-6                          | Applied          | Manifest-derived component inventory produced                                                                                                                                     |
| PAR-7                          | Applied          | Limitations and Unknowns lists every unrun execution check                                                                                                                        |
| PAR-8                          | Applied          | This Validation Record renders the capability set                                                                                                                                 |
| PAR-9                          | Applied          | Stack-specific references re-derived for TS/Java/C#/Go/Docker                                                                                                                     |
| PAR-10                         | Applied          | Glossary indexes every acronym, body occurrences linked to anchors                                                                                                                |
| PAR-11                         | Applied          | Coverage matrix precedes Glossary and agrees with Scope Exclusions                                                                                                                |
| PAR-12                         | Applied          | Every SBOM License cell populated (`Unknown` where undeclared)                                                                                                                    |
| PAR-13                         | Applied          | Every ledger row and finding carries `Observation`/`Concern`                                                                                                                      |
| PAR-14                         | Applied          | Every HIGH/CRITICAL security finding carries a tiered narrative                                                                                                                   |
| PAR-15                         | Applied          | [DORA](#glossary) proxies marked `NOT SPECIFIED`, bus-factor rated `High`                                                                                                         |
| PAR-16                         | [N/A](#glossary) | Report language is English - translation parity check not applicable                                                                                                              |
| PAR-17                         | [N/A](#glossary) | Subject contains no `SKILL.md` - skill inventory not applicable                                                                                                                   |
| FND/RSK/REC cross-referencing  | PASS             | Every [RSK](#rsk-risk-id) and [REC](#rec-recommendation-id) resolves an existing [FND](#fnd-finding-id)                                                                           |
| Count reconciliation           | PASS             | 33 findings, 4 debt items, 12 risks, 32 recommendations reconcile                                                                                                                 |
| Conditional-section evaluation | PASS             | Included: Data Flow, Design Patterns, Threat Model, API Contract, Standards, [TDR](#tdr-technical-debt-register-id), Re-audit, all omitted sections justified in Scope Exclusions |
| Formatting rules               | PASS             | Heading depth, table alignment, [ASCII](#glossary) punctuation verified                                                                                                           |
| Parity baseline                | [N/A](#glossary) | Prior report `AUDYT.md` (revision 1.0, Polish, root-level) found - capabilities compared at section level - no absent capability applies to this subject                          |

## References

| Reference                                                           | Publisher or Author                           | Used In                                               |
|---------------------------------------------------------------------|-----------------------------------------------|-------------------------------------------------------|
| [ISO/IEC](#glossary) 25010:2023 Systems and software Quality Models | [ISO/IEC](#glossary)                          | Scoring Rubrics                                       |
| OWASP API Security Top 10 (2023)                                    | [OWASP](#glossary)                            | API Contract Conformance, Threat Model                |
| OWASP Application Security Verification Standard 5.0                | [OWASP](#glossary)                            | Auditing Methodology, security findings               |
| [CWE](#glossary) - Common Weakness Enumeration                      | MITRE                                         | Security finding classification                       |
| NIST SP 800-30 Rev.1 Guide for Conducting Risk Assessments          | [NIST](#glossary)                             | Unified Risk Register                                 |
| [STRIDE](#glossary) threat taxonomy                                 | Microsoft                                     | Threat Model                                          |
| CISQ Automated Source Code Quality Measures / [SQALE](#glossary)    | [CISQ](#glossary) / [SQALE](#glossary) method | Technical Debt Register                               |
| [ISO](#glossary) 19011 Guidelines for auditing management systems   | [ISO](#glossary)                              | Re-audit And Follow-up Plan                           |
| NIST Risk Management Framework                                      | [NIST](#glossary)                             | Re-audit And Follow-up Plan                           |
| OpenAPI Specification 3.1                                           | OpenAPI Initiative                            | API Contract Conformance                              |
| OAuth 2.0 Authorization Framework (RFC 6749)                        | IETF                                          | Token endpoint assessment                             |
| Prometheus exposition formats                                       | Prometheus project                            | Metrics findings                                      |
| Apache POI API documentation                                        | Apache Software Foundation                    | Java ExcelService review                              |
| ExcelJS documentation                                               | ExcelJS project                               | Node operations review                                |
| ClosedXML documentation                                             | ClosedXML project                             | C# ExcelService review                                |
| Spring Security reference                                           | VMware/Broadcom                               | Java security configuration review                    |
| Semantic Versioning 2.0.0                                           | semver.org                                    | Standards Conformance                                 |
| Excel API internal documentation set                                | Filip Golewski                                | Entire audit - requirements and architecture baseline |

- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE](https://cwe.mitre.org/)
- [NIST SP 800-30](https://csrc.nist.gov/publications/detail/sp/800-30/rev-1/final)
- [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)
- [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [Apache POI](https://poi.apache.org/apidocs/)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [ClosedXML](https://github.com/ClosedXML/ClosedXML)
- [Spring Security](https://docs.spring.io/spring-security/reference/)
- [SemVer 2.0.0](https://semver.org/)
