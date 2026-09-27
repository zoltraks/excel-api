# Go Client Hardening

**Type**: Fix

**Summary**: The Go CLI builds the token request body without URL-encoding, calls the token endpoint with no timeout, and doesn't escape path segments — credentials containing `&`/`=`/`%` corrupt the form and sheet names with `/`/`?`/`#` produce wrong URLs. Harden the client per the Go standard.

**Description**:

Audit finding FND-CQY-007 / recommendation REC-026.

- Build the token request body with `net/url.Values` so credentials are properly form-encoded.
- Use the configured timeout `http.Client` for `ObtainToken` instead of `http.DefaultClient`.
- `url.PathEscape` all user-controlled path segments (workbook ids, sheet names, cell/range refs).
- A `client_secret` containing `&` must authenticate correctly; a sheet named with a space or slash must resolve.

## Out of Scope

- New CLI features or REPL changes.
