# OpenAPI Engineering Standards

<!-- Standards set: openapi-general-development@0.1.4 | Date: 2026-10-25 -->

## Purpose

This document defines the engineering standard for authoring, maintaining,
and validating OpenAPI specifications.

It covers the specification version, the document structure, the schema design,
the security definitions, the error handling, the vendor extensions, and the tooling.

It is written to be executed directly by an AI coding agent and to be read without effort by a human
reviewer.

## Scope

A project is in scope when all of the following conditions hold.

- The project authors an OpenAPI specification as the API contract.
- The specification is the source of truth for the API, not a side effect of the implementation.
- The specification is consumed by code generators, documentation renderers, mock servers,
  or contract testers.

A project that uses GraphQL or gRPC instead of REST is out of scope,
because those technologies have different contract formats.

A project that uses an OpenAPI specification only as generated documentation from code is partially
in scope: the structure and schema sections apply, but the authoring workflow does not.

## How To Use This Standard

This section is the entry point for an agent.

Read it before reading anything else in this document.

**Order Of Operations**

Follow these steps in order at the start of every task that touches an OpenAPI specification.

1. Read the project rules file, such as `AGENTS.md`, `README.md`, or `docs/GUIDELINES.md`,
   because a project rule overrides this standard.
2. Determine the OpenAPI version, the file structure,
   and the tooling using the Agent Intake Protocol below.
3. Confirm the conclusion with the user when the repository is ambiguous or empty.
4. Apply the sections of this standard that match the confirmed project kind.
5. Run every applicable row of the Verification section.
6. Check the result against the Definition of Done before reporting the task complete.

**Precedence**

When two rules conflict, apply the first matching source in this list.

| Rank | Source                                    | Example                                      |
|------|-------------------------------------------|----------------------------------------------|
| 1    | An explicit instruction from the user     | "Keep this spec on OpenAPI 3.0"              |
| 2    | The project rules file                    | `AGENTS.md`, `docs/GUIDELINES.md`            |
| 3    | The existing convention in the repository | OData-style errors already used              |
| 4    | This standard                             | RFC 9457 Problem Details for errors          |
| 5    | General OpenAPI best practice             | Anything the four sources above do not cover |

Never silently reformat an existing specification to match this standard.

A whole-specification reformat destroys review history and hides the real change inside noise.

Bring a deviation to the user as a proposal, not as an unrequested edit.

**Non-Negotiable Rules**

- **The root document declares the OpenAPI version.** A missing `openapi` field is a defect.
- **The `openapi` version is not changed without user confirmation.** A version upgrade may break
  downstream tooling, so it is a proposal, not an automatic edit.
- **Every operation has a `description`.** A missing description is a defect,
  because a reader cannot understand the operation's purpose.
- **Every operation has at least one success response.** An operation with only error responses is a
  defect.
- **Every schema property has a `type` or `$ref`.** A property without a type is a defect,
  because a consumer cannot validate it.
- **Every schema property has a `description`.** A missing description is a defect,
  because a consumer cannot understand the property's meaning.
- **No inline schema duplication.** The same schema inlined in two operations is a defect,
  because a change to one drifts from the other.
- **Spectral lint passes.** A Spectral error is a defect.

A violation of any of these rules is a defect, not a style preference.

## Agent Intake Protocol

**Detection First**

Before asking the user anything, inspect the repository and infer the project shape.

| Signal Found In The Repository                         | Inferred Decision                | Confidence |
|--------------------------------------------------------|----------------------------------|------------|
| `openapi: 3.1` in root file                            | OpenAPI 3.1                      | High       |
| `openapi: 3.0` in root file                            | OpenAPI 3.0                      | High       |
| Multiple `.yaml` files under a specification directory | Multi-file structure             | High       |
| Single `openapi.yaml` file                             | Single-file structure            | High       |
| `.spectral.yaml` or `.spectral.json`                   | Spectral linting enforced        | High       |
| `redocly.yaml` or Redocly config                       | Redocly tooling                  | High       |
| OData-style `error` object in schemas                  | OData-style error convention     | High       |
| RFC 9457 `ProblemDetails` schema                       | Problem Details error convention | High       |
| No OpenAPI files at all                                | New project                      | High       |

**Existing Project**

When detection is confident, state the conclusion and ask for a single confirmation rather than
running a questionnaire.

Example: "I see OpenAPI 3.1, a multi-file structure with paths and schemas directories,
Spectral linting, and RFC 9457 Problem Details for errors.

I will follow the existing conventions.

Is that correct?"

When detection is ambiguous, ask only the questions that resolve the ambiguity.

**New Project**

When the repository is empty or the user declares a new project, ask the following questions.

| Question                | Options                      | Default If Declined        |
|-------------------------|------------------------------|----------------------------|
| Which OpenAPI version?  | 3.1, 3.0                     | 3.1                        |
| Which file structure?   | Single-file, Multi-file      | Single-file                |
| Which error convention? | Problem Details, OData-style | Problem Details (RFC 9457) |

## Documentation

The following are the authoritative sources for OpenAPI development.

- [OpenAPI Specification 3.1.2](https://spec.openapis.org/oas/v3.1) - latest specification version.
- [OpenAPI Specification 3.0.3](https://spec.openapis.org/oas/v3.0.3) - previous major version.
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation) -
  underlying validation semantics for OpenAPI 3.1.
- [OpenAPI Guide](https://swagger.io/docs/specification/v3_0/about/) - Swagger official guide.
- [RFC 9457 Problem Details](https://datatracker.ietf.org/doc/html/rfc9457) - standard error
  response format.
- [Spectral](https://meta.stoplight.io/docs/spectral) - OpenAPI linter.
- [Redocly CLI](https://redocly.com/docs/cli/) - bundling and documentation tool.
- [OpenAPI Generator](https://openapi-generator.tech/) - code generation.

## Language Version

The project targets **OpenAPI 3.1** or **OpenAPI 3.0.x** - both are supported versions.

OpenAPI 3.1 aligns with JSON Schema Draft 2020-12, which adds `$defs`, `unevaluatedProperties`,
`$dynamicRef`, and full JSON Schema compatibility.

OpenAPI 3.2 is the latest published version of the specification, adding the `query` HTTP method,
`additionalOperations`, and the `$self` keyword.

Adopt 3.2 only when the downstream toolchain supports it,
because linter and generator coverage for 3.2 is still incomplete.

The root document declares `openapi: 3.1.0` (or the latest 3.1.x patch) or `openapi: 3.0.x`.

OpenAPI 3.0.x remains a fully supported choice - it has the broadest compatibility across
generators, validators, and UI renderers,
and a simple specification gains nothing from 3.1-only features.

**Version Upgrade Authority**

An agent must not change the declared `openapi` version without explicit user confirmation,
because a version change may affect downstream tooling compatibility, code generation,
and validation behavior.

When a version upgrade is recommended, the agent presents the change as a proposal with the current
version, the proposed version, and the rationale.

The upgrade is applied only after the user confirms.

## Project Structure

The OpenAPI specification lives in a single authoritative file or a split directory structure.

**Single-File Approach**

Recommended for APIs with fewer than 50 endpoints.

```plaintext
openapi.yaml
```

A service that serves the specification over HTTP may keep the file in a publicly served directory
instead, because the served copy is the contract.

**Multi-File Approach**

Recommended for large APIs or team ownership boundaries.

```plaintext
docs/
  api/
    openapi.yaml          Root document with info, servers, security
    paths/
      auth.yaml           Authentication endpoints
      pets.yaml           Pet domain endpoints
    schemas/
      common.yaml         Shared schemas (error responses, pagination)
      pets.yaml           Pet domain schemas
    parameters.yaml       Reusable parameters
    responses.yaml        Reusable responses
    security.yaml         Security schemes and requirements
```

When using the multi-file approach, the root `openapi.yaml` uses `$ref` to include external files,
because splitting by domain keeps each file readable.

**File Naming Conventions**

| Element            | Convention        | Example                       |
|--------------------|-------------------|-------------------------------|
| Root specification | `openapi.yaml`    | `openapi.yaml`                |
| Domain files       | `kebab-case.yaml` | `pet-store.yaml`, `auth.yaml` |
| Extension          | `.yaml`           | Never `.yml`                  |

## Naming Conventions

| Element                  | Convention                    | Example                                         |
|--------------------------|-------------------------------|-------------------------------------------------|
| Schema object names      | `PascalCase`                  | `OAuthTokenRequest`, `Pet`                      |
| Reusable parameter names | `PascalCase`                  | `CompanyQuery`, `AcceptLanguageHeader`          |
| Response names           | `PascalCase`                  | `BadRequest`, `NotFound`, `InternalServerError` |
| Tag names                | `kebab-case`                  | `pets`, `orders`                                |
| Path segments            | `kebab-case`                  | `/pet-categories`, `/order-items`               |
| Path parameters          | `snake_case` or `{camelCase}` | `{user_id}` or `{userId}`                       |
| Query parameters         | `camelCase`                   | `sortBy`, `pageSize`                            |
| Schema properties        | `camelCase`                   | `createdAt`, `ownerName`                        |
| Vendor extensions        | `x-camelCase`                 | `x-query-name`, `x-route-to`                    |

Each tag has a `description` in the root `tags` section,
because a tag without a description is a label without context.

## Code Conventions

**Document Root**

Every specification includes the following.

- `openapi` version string.
- `info` with `title`, `version`, and `description`.
- `servers` array with at least one entry including the base URL.
- `security` section declaring the default security scheme.
- `tags` array describing every tag used in the API.

```yaml
openapi: 3.1.0
info:
  title: Sample API
  version: "1.0.0"
  description: |
    API for managing resources. Replace with your domain description.
servers:

  - url: https://api.example.com
    description: Production server
  - url: https://staging.api.example.com
    description: Staging server for testing
security:
  - BearerAuth: []
```

**Info Section.**

The `info` section is the first thing a consumer reads.

- `title` is a meaningful product name, not a generic label like "OpenAPI 3.0".
- `version` follows semantic versioning (`MAJOR.MINOR.PATCH`),
  because a non-semantic version like "1.0" is ambiguous.
- `description` explains what the API does and may link to additional documentation.

**Servers.**

Every `servers` entry has a `description`,
because a URL without a description does not tell the consumer which environment to use.

Common descriptions: `Production server`, `Staging server`, `Development server`,
`Local development server`.

**External Documentation.**

The `externalDocs` field, when present, links to documentation that is relevant to this API.

Do not link to generic external sites unrelated to the project, because an irrelevant link is noise.

Remove `externalDocs` when no project-specific documentation exists,
because an absent field is cleaner than a placeholder.

**Security**

Use `securitySchemes` in `components` with type `http` and scheme `bearer` for JWT.

```yaml
securitySchemes:
  BearerAuth:
    type: http
    scheme: bearer
    bearerFormat: JWT
```

OAuth2 token endpoints declare `security: []` to indicate public access.

All other endpoints inherit the global `security` or declare their own.

**Operation IDs**

The `operationId` uniquely identifies an operation across the entire specification.

Declaring it on every operation is recommended - code generators derive client method names from it,
documentation tools use it for anchors, and contract tooling references operations by ID.

A missing `operationId` is a gap rather than a defect when no generator or contract tool consumes
the specification - add them when the spec feeds tooling,
and prefer adding them anyway for future use.

When `operationId` is used, follow these rules.

- Use a consistent case style: `camelCase` or `PascalCase`, chosen once and applied everywhere.
- Follow a verb-noun or resource-verb pattern: `listUsers`, `createOrder`, `getUserById`.
- Include parent resource context for nested operations: `listUserOrders`, not `listOrders`,
  when under `/users/{userId}/orders`.
- Keep the identifier under 40 characters when possible,
  because long identifiers produce unwieldy SDK method names.
- Avoid abbreviations that drop whole words: `Competencies`, not `Competencys`.
- Never duplicate an `operationId`, because the specification requires uniqueness.

A consistent `operationId` pattern produces readable SDK method names and reliable cross-references
via the Link Object.

**Reusable Parameters**

Parameters that appear in more than one operation are defined once in `components/parameters` and
referenced with `$ref`, because an inlined parameter duplicated across operations drifts.

```yaml
components:
  parameters:
    CompanyQuery:
      name: company
      in: query
      required: false
      schema:
        type: string
      description: Company identifier used to select the database instance
      example: ACME
    AcceptLanguageHeader:
      name: Accept-Language
      in: header
      required: false
      schema:
        type: string
      description: Language preference for the response content
      example: en-US
    XSerialHeader:
      name: X-Serial
      in: header
      required: false
      schema:
        type: string
        format: uuid
      description: Optional request identifier in UUID format
      example: 123e4567-e89b-12d3-a456-426614174000
```

Reference reusable parameters in operations:

```yaml
parameters:

  - $ref: "#/components/parameters/CompanyQuery"
  - $ref: "#/components/parameters/AcceptLanguageHeader"
  - $ref: "#/components/parameters/XSerialHeader"
```

A parameter that appears in only one operation may stay inline,
because a single-use component adds indirection without benefit.

**Reusable Headers**

Response headers that appear in more than one response are defined once in `components/headers` and
referenced with `$ref`, because an inlined header duplicated across responses drifts.

```yaml
components:
  headers:
    XCompanyEcho:
      description: Echo of the company identifier
      schema:
        type: string
    XSerialEcho:
      description: Echo of the request identifier
      schema:
        type: string
        format: uuid
```

Reference reusable headers in responses:

```yaml
headers:
  X-Company:
    $ref: "#/components/headers/XCompanyEcho"
  X-Serial:
    $ref: "#/components/headers/XSerialEcho"
```

**Endpoints**

**GET List Endpoints.**

Every GET endpoint that returns a collection returns HTTP 200 with a JSON object containing the
collection array.

When the project uses an OData-style `value` envelope,
the response wraps the array in a `value` property:

```yaml
responses:
  200:
    description: Successful operation
    content:
      application/json:
        schema:
          type: object
          properties:
            value:
              type: array
              items:
                $ref: "#/components/schemas/Entity"
```

When the project uses a plain `items` envelope, the response wraps the array in an `items` property.

Use the same envelope key consistently across all collection endpoints,
because a mixed convention confuses consumers.

**POST Create and Update Endpoints.**

Every POST endpoint accepts a `requestBody` with `application/json` content referencing a schema,
returns HTTP 201 with the created entity schema,
and returns HTTP 400 referencing a shared `BadRequest` response.

A POST endpoint that updates an existing resource returns HTTP 200 with the updated entity schema,
because an update is not a creation.

A POST endpoint that performs an action or confirmation returns HTTP 200 with the result schema,
because the operation is neither a creation nor an update.

**GET Single-Entity Endpoints.**

Every GET endpoint that returns a single entity returns HTTP 200 with the entity schema and returns
HTTP 404 referencing a shared `NotFound` response.

**Parameters**

Query, header, and path parameters are explicitly declared with the following.

- `name` with the exact case expected by the backend.
- `in` as `query`, `header`, or `path`.
- `required` as a boolean.
- `schema` with `type` and, where applicable, `format`.
- `description` explaining the purpose.
- `example` for every parameter.

**Responses**

**Success Responses.**

Success responses echo tracing headers when the project adopts those conventions.

**Error Responses.**

Every endpoint declares at minimum the following.

- 400 `BadRequest` for invalid input format or validation failure.
- 500 `InternalServerError` for unexpected server error.

GET single-entity endpoints also declare 404 `NotFound`.

Authentication endpoints declare 401 `Unauthorized` for invalid credentials.

Shared error responses are defined in `components/responses` and referenced with `$ref`,
because a shared response is consistent and maintainable.

Define a shared `Unauthorized` response when the API has authenticated endpoints,
because a 401 inline in multiple operations drifts.

```yaml
components:
  responses:
    BadRequest:
      description: Bad Request
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    NotFound:
      description: Not Found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    InternalServerError:
      description: Internal Server Error
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
```

An endpoint that returns a domain-specific error format (such as OAuth error responses on a token
endpoint) may define the error inline, because the error shape is unique to that endpoint.

**Error Schema.**

Use a consistent error structure.

For new projects, use RFC 9457 Problem Details,
because it is an IETF standard with broad tooling support.

```yaml
ProblemDetails:
  type: object
  properties:
    type:
      type: string
      format: uri-reference
      description: URI reference to the problem type.
      example: https://api.example.com/errors/invalid-request
    title:
      type: string
      description: Short human-readable summary.
      example: Invalid Request
    status:
      type: integer
      description: HTTP status code.
      example: 400
    detail:
      type: string
      description: Human-readable explanation specific to this occurrence.
      example: The field 'name' is required.
    instance:
      type: string
      description: URI reference identifying the specific occurrence.
      example: /pets/42
  required:
    - type
    - title
    - status
```

For existing projects that already use OData-style errors,
continue with that convention for consistency.

**Conditional Endpoints**

The specification documents the full surface a server may expose,
including endpoints that exist only under a configuration flag or a licensed feature.

A conditionally mounted path declares the condition in its `description`,
for example "mounted only when a knowledge library is configured",
so a consumer knows a `404` can mean "feature off" rather than "wrong URL".

Feature gates that hide endpoints are not modeled as separate specifications,
because one contract with documented conditions is easier to diff and lint than two overlapping
files.

**Schemas**

**Schema Properties.**

Every schema property includes the following.

- `type` or `$ref`.
- `format` where applicable, such as `int64`, `uuid`, `date-time`, or `uri`.
- `description` explaining the semantic meaning.
- `example` demonstrating a valid value.
- `minLength` and `maxLength` for bounded string fields.

**Required Fields.**

Schemas that serve as request bodies declare a `required` array listing all mandatory properties.

Response schemas may omit `required` if the backend guarantees all fields are present.

**Reuse.**

Define every schema once in `components/schemas` and reference with `$ref`,
because a schema defined in two places drifts.

Define reusable responses in `components/responses`.

Define reusable parameters in `components/parameters`.

Never inline the same schema definition in multiple endpoints,
because an inlined schema is a duplicate.

**Composition.**

Use `$ref` for pure reuse, `allOf` for merging constraints,
and `oneOf` with a `discriminator` for typed unions,
because these are the JSON Schema Draft 2020-12 composition keywords.

Use `$defs` for sub-schemas referenced only inside a single parent schema,
because `$defs` keeps the global component namespace clean.

Avoid `anyOf` for typed unions, because `anyOf` is looser than `oneOf` and rarely what a typed SDK
wants.

**Examples.**

Every schema property has an `example`.

Every endpoint response has an `example` block under the content type.

For POST request bodies with multiple valid input styles, use `examples` (plural) with named keys.

```yaml
requestBody:
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Pet"
      examples:
        with_category:
          summary: Example with category
          value:
            name: "Rex"
            categoryId: 1
            status: "available"
```

**Vendor Extensions**

Vendor extensions (`x-*`) are permitted only when they carry metadata consumed by backend tooling,
documentation generators, or SDK generators.

Every extension used is documented in the project's API documentation,
because an undocumented extension is an implicit contract.

The documentation for each extension includes the following.

- The extension name.
- The purpose of the extension.
- The expected value format.
- Which operations or objects carry the extension.
- Which tool consumes the extension.

| Extension      | Purpose                                  |
|----------------|------------------------------------------|
| `x-query-name` | Backend query or method name for routing |
| `x-route-to`   | Backend route template for proxying      |

Forbidden: vendor extensions that duplicate information already present in standard OpenAPI fields,
because a duplicate is a maintenance burden.

Forbidden: vendor extensions that are present on some operations but not others without a documented
rule, because an inconsistent extension is an undocumented contract.

## Formatting and Linting

**Spectral**

Use Spectral for OpenAPI linting.

Configuration in `.spectral.yaml` at project root.

```yaml
extends: ["spectral:oas"]
rules:
  operation-operationId: warn
  operation-description: error
  operation-tags: error
  operation-success-response: error
  oas3-schema: error
  oas3-unused-components: warn
  operation-parameters: error
```

```bash
spectral lint openapi.yaml
```

Spectral runs in CI.

A pull request that fails the lint check is not accepted.

**Redocly CLI**

Use Redocly CLI for bundling and preview.

```bash
# Bundle multi-file specs into a single file
redocly bundle openapi.yaml -o dist/openapi.yaml

# Preview documentation
redocly preview-docs openapi.yaml
```

## Testing

**Validation**

Validate the specification after every change.

```bash
# Spectral linting
spectral lint openapi.yaml

# Redocly bundle (catches broken $ref)
redocly bundle openapi.yaml -o /dev/null
```

**Mock Server Testing**

Use Prism or Mockoon to run a mock server from the specification,
because a mock server lets frontend clients and integration tests consume the API contract before
the backend is implemented.

```bash
prism mock openapi.yaml
```

**Contract Testing**

When the backend is implemented, use Schemathesis or Dredd to verify that the implementation
conforms to the specification, because a spec that the implementation does not match is a lie.

```bash
schemathesis run openapi.yaml --base-url http://localhost:5002
```

When the implementation keeps a static list of its public surface,
such as a route table or a tool manifest asserted by a contract test,
the spec and the list are updated in the same change.

A path added to the spec without the list, or a route added to the list without the spec,
is a defect the contract check must catch,
so the test asserts containment in both directions rather than only "every implemented route is
documented".

## Build

**Documentation Generation**

Generate API documentation from the specification using Redoc or Swagger UI.

```bash
# Redoc (static HTML)
redocly build-docs openapi.yaml -o dist/api-docs.html

# Swagger UI
npx swagger-ui-cli -i openapi.yaml -o dist/swagger-ui
```

**Code Generation**

Generate client SDKs and server stubs using OpenAPI Generator.

```bash
# TypeScript client
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o generated/ts-client

# C# client
openapi-generator-cli generate -i openapi.yaml -g csharp -o generated/csharp-client
```

## Dependencies

**Tooling**

| Tool              | Purpose                           | Installation                                         |
|-------------------|-----------------------------------|------------------------------------------------------|
| Spectral          | OpenAPI linting                   | `npm install -g @stoplight/spectral-cli`             |
| Redocly CLI       | Bundling, preview, docs           | `npm install -g @redocly/cli`                        |
| OpenAPI Generator | Client and server code generation | `npm install -g @openapitools/openapi-generator-cli` |
| Prism             | Mock server                       | `npm install -g @stoplight/prism-cli`                |
| Schemathesis      | Contract testing                  | `pip install schemathesis`                           |

**Version Control**

Commit `openapi.yaml` and split files to version control.

Commit generated artifacts only if they are consumed by external teams,
and otherwise generate them in CI, because a committed generated artifact drifts from the source.

Use `redocly bundle` in CI to produce a single-file artifact for distribution.

## Comments

YAML comments are appropriate in two cases.

- A `# REASON:` comment on a non-obvious decision, such as a workaround for a tool limitation.
- A block comment at the top of a file stating its domain and responsibility.

Do not comment what the YAML does, because the YAML itself states that.

Do not leave commented-out YAML, because version control preserves history.

## Verification

| Check                                    | Command Or Method                                                                 | Applies To        |
|------------------------------------------|-----------------------------------------------------------------------------------|-------------------|
| Spectral lint passes                     | `npx spectral lint openapi/openapi.yaml --ruleset .spectral.yaml`                 | All spec files    |
| Redocly lint passes                      | `npx @redocly/cli lint openapi/openapi.yaml`                                      | Multi-file specs  |
| Redocly bundle succeeds                  | `npx @redocly/cli bundle openapi/openapi.yaml --output /dev/null`                 | Resolves `$ref`s  |
| Operations have `operationId`            | `npx spectral lint openapi/openapi.yaml -r operation-operationId`                 | All operations    |
| Every operation has `description`        | `npx spectral lint openapi/openapi.yaml -r operation-description`                 | All operations    |
| Every operation has a success response   | `npx spectral lint openapi/openapi.yaml -r operation-success-response`            | All operations    |
| Schema metadata complete                 | `npx spectral lint openapi/openapi.yaml -r oas3-schema`                           | All schemas       |
| Descriptions present                     | `npx spectral lint openapi/openapi.yaml -r openapi-tags -r operation-description` | Spec-wide         |
| No inline schema duplication             | `npx spectral lint openapi/openapi.yaml -r oas3-unused-component`                 | All schemas       |
| Declared `operationId` values are unique | `npx spectral lint openapi/openapi.yaml -r operation-operationId-unique`          | All operations    |
| Parameters described                     | `npx spectral lint openapi/openapi.yaml -r openapi-parameter-description`         | All parameters    |
| Every tag has a `description`            | `npx spectral lint openapi/openapi.yaml -r tag-description`                       | Root tags section |
| Contract tests pass                      | `npx schemathesis run openapi/openapi.yaml --checks all`                          | Implemented APIs  |
| Diff hygiene                             | `git diff --check`                                                                | Every change      |

## Definition of Done

**Correctness**

- Spectral produces no errors.
- Redocly bundle succeeds with no broken `$ref`.
- Every operation has a `description` and at least one success response,
  and carries an `operationId` when generators or contract tools consume the spec.
- Every schema property has a `type` or `$ref` and a `description`.
- Every parameter has an `example`.
- Every response has an `example`.
- Every requestBody has an `example`.
- Declared `operationId` values are unique and follow a consistent naming convention.

**Structure**

- The file layout matches the confirmed project kind.
- Schemas are defined once in `components/schemas` and referenced with `$ref`.
- Reusable parameters are in `components/parameters`.
- Reusable headers are in `components/headers`.
- Reusable responses are in `components/responses`.
- No schema is inlined in more than one operation.
- No parameter is inlined in more than one operation.
- No header is inlined in more than one response.
- Any implementation-side static list of routes or operations matches the spec paths exactly.

**Quality**

- Spectral reports zero errors and zero warnings.
- All parameters and responses carry `example` values.
- Zero unresolved `$ref` pointers in the bundled output.

**Interface**

- Every path uses nouns for resources and HTTP methods for verbs.
- Every tag has a `description` in the root `tags` section.
- Every server has a `description`.
- Every error response references a shared error schema.
- Every parameter has an `example`.
- The `info` section has a meaningful `title`, a semantic `version`, and a `description`.
- The `externalDocs` field, when present, links to project-relevant documentation.

**Hygiene**

- `openapi.yaml` and split files are committed to version control.
- Generated artifacts are not committed unless consumed by external teams.
- No commented-out YAML remains.
- Documentation was updated when the change altered the API contract.

## General Principles

**Contract First.** The specification is the source of truth, not the implementation,
because a spec-first workflow keeps the contract stable across backend changes.

**Single Source of Truth.** Every schema is defined once and referenced everywhere,
because a duplicate drifts.

**Nouns in Paths, Verbs in Methods.** Paths name resources, HTTP methods name operations,
because a verb in a path (`/getUser`) is a REST anti-pattern.

**Reuse Over Duplication.** Use `components` for schemas, parameters, responses,
and security schemes, because a component is consistent and maintainable.

**Examples Everywhere.** Every property, parameter, and response has an example,
because an example communicates more than a description.

**Fail Fast.** Spectral lint runs on every change,
because a spec error caught late is expensive to fix.

**Zero Warnings.** A Spectral error is either a defect or a rule the project does not want,
and both cases require an action.

## Sources

The following authoritative references support the rules in this document.

- [OpenAPI Specification v3.1](https://spec.openapis.org/oas/v3.1) - the feature set this standard
  targets by default.
- [OpenAPI Specification v3.2](https://spec.openapis.org/oas/latest) - the latest published version,
  adopted only when the downstream toolchain supports it.
- [OpenAPI Specification v3.0.3](https://spec.openapis.org/oas/v3.0.3) - the legacy line referenced
  when a downstream tool pins 3.0.
- [OpenAPI Specification Repository](https://github.com/OAI/OpenAPI-Specification) - the OpenAPI
  Initiative source, changelogs, and schema files.
- [JSON Schema Draft 2020-12 Validation](https://json-schema.org/draft/2020-12/json-schema-validation)
  - the schema vocabulary OpenAPI 3.1 aligns with.
- [Swagger Documentation](https://swagger.io/docs/specification/v3_0/about/) - the practical
  annotation and tooling reference.
- [RFC 9457 Problem Details](https://datatracker.ietf.org/doc/html/rfc9457) - the
  `application/problem+json` error contract.
- [Spectral](https://meta.stoplight.io/docs/spectral) - the lint ruleset and custom-rule format
  behind the zero-warnings gate.
- [Redocly CLI](https://redocly.com/docs/cli/) - the alternative linter and bundler.
- [OpenAPI Generator](https://openapi-generator.tech/) - the code-generation tool whose output the
  spec must round-trip cleanly.

## Project Conventions

- `docs/contract/openapi.yaml` is the canonical contract and the only copy
  that is edited.
- `shell/sync.sh` propagates the contract to
  `excel-api-node/resources/openapi.yaml`,
  `excel-api-java/src/main/resources/openapi.yaml`, and
  `excel-api-csharp/src/ExcelApi/Resources/openapi.yaml`. The copies are never
  edited by hand - run the script and verify each diff.
- The contract's `info.version` tracks the project version and bumps with it
  per `docs/VERSIONING.md`.
- Endpoint and error-code conventions for new routes follow `docs/WORKFLOW.md`
  "Adding a New Endpoint".
