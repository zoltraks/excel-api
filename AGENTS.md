# Excel API - Agent Entry

HTTP service exposing Excel spreadsheet data as a JSON API with queued write
operations and file-level locking.

Rules index: `docs/GUIDELINES.md` - the central source of truth for
AI-assisted development. Read it and `README.md` before any change.

## Sources of Truth

| Document | Owns |
| -------- | ---- |
| `docs/PROJECT.md` | Requirements and behavior |
| `docs/ARCHITECTURE.md` | Shared architecture and cross-implementation patterns |
| `docs/SPECIFICATION.md` | Implementation-specific details |
| `docs/contract/openapi.yaml` | API contract |
| `docs/WORKFLOW.md` | Change cycle and the autonomous SDLC routine |
| `docs/TESTING.md` | Verification loop and security gate |
| `docs/standard/` | Per-stack engineering standards |

## Components

| Directory           | Implementation                      |
| ------------------- | ----------------------------------- |
| `excel-api-node/`   | Node.js/TypeScript server (Fastify) |
| `excel-api-java/`   | Java 21/Spring Boot server (POI)    |
| `excel-api-csharp/` | C#/ASP.NET 8 server (ClosedXML)     |
| `excel-api-rust/`   | Rust/axum server (umya-spreadsheet) |
| `excel-api-go/`     | Go CLI client                       |
| `excel-api-test/`   | Jest black-box integration suite    |

Key rules at a glance: every change starts with a change request and an
implementation plan, features land in all applicable implementations, version
numbers stay synchronized, and commits are never automatic.
