# Changelog

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
