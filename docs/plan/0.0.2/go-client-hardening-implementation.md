# Go Client Hardening — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/go-client-hardening.md`

**Best Practices**: `docs/standard/go-cli-development.md` (error handling, HTTP client, standard library only).

**Documentation Updates**: None — hardening matches the documented client behavior.

**Step by Step Implementation**:

1. **Form-encoded token body**
   - Build the `ObtainToken` body with `net/url.Values` (`grant_type`, `client_id`, `client_secret`, `username`, `password`, `scope`) instead of string interpolation.
   - Files: `excel-api-go/internal/client/client.go` (or `auth.go`).

2. **Timeout on token call**
   - Use the configured `http.Client` (30s timeout) for `ObtainToken`, not `http.DefaultClient`.
   - Files: same as above.

3. **Path escaping**
   - `url.PathEscape` on workbook ids, sheet names, and cell/range refs when building request paths.
   - Files: `excel-api-go/internal/client/*.go` (workbooks, sheets, records, cells, operations).

**Testing Strategy**: `httptest`-backed unit tests: secret with `&` authenticates; sheet name with space/slash resolves; token call honors timeout.

**Verification**: `docs/TESTING.md` loop on `excel-api-go` (`go build ./...`, `gofmt`, `go vet`, `go test`).
