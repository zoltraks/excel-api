# Changelog

## Version 0.0.2

Removed EXCEL_API_* prefixed environment variable fallbacks to simplify configuration across all implementations.

- **Configuration**: Removed EXCEL_API_WORK, EXCEL_API_CONFIG, EXCEL_API_ACCESS, and EXCEL_API_LIFE environment variable fallbacks from Java and C# implementations
- **Java ConfigLoader**: Fixed lifecycle resolution logic to use System.getenv("LIFE") instead of System.getProperty("LIFE", System.getenv("LIFE"))
- **Java Tests**: Removed incorrect environment variable test that used system property instead of environment variable
- **C# Tests**: Updated tests to remove EXCEL_API_* environment variable references
- **Documentation**: Added rule to VERSIONING.md about checking changes between versions when describing changes

## Version 0.0.1

Initial repository skeleton with project documentation, API contract, and implementation scaffolding.

- Established repository structure with five project directories: three API implementations (Node, Java, C#), one CLI client (Go), and an integration test suite
- Created project documentation: PROJECT.md, ARCHITECTURE.md, SPECIFICATION.md, GUIDELINES.md
- Created development standards for all four languages: TypeScript/Node, Java/Spring/Maven, C#/ASP.NET, Go CLI
- Defined OpenAPI 3.1 contract with dual addressing modes (cell-level and record-level)
- Added OAuth2 (password, client_credentials) and static token authorization to the API contract
- Created Dockerfile scaffolding for all four components
- Added docker-compose configuration for development and testing
- Added `sync-openapi.sh` script for synchronizing the contract across implementations
