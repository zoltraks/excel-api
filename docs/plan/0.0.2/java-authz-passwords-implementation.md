# Java Authorization and Password Verification — Implementation Plan

**Change Request Reference**: `docs/change/0.0.2/java-authz-passwords.md`

**Best Practices**: `docs/standard/java-spring-maven-development.md` (constructor injection, Spring Security conventions).

**Documentation Updates**: `docs/SPECIFICATION.md` Java section — authorization enforcement now exists; `docs/ARCHITECTURE.md` authorization flow already describes the target.

**Step by Step Implementation**:

1. **bcrypt password verification**
   - In `AuthController.validateUser`, replace `u.getPasswordHash().equals(password)` with a `PasswordEncoder` (`BCryptPasswordEncoder` from `spring-security-crypto`, already on classpath) match; reject non-`$2` prefixed stored values; `invalid_grant` on mismatch.
   - Files: `excel-api-java/src/main/java/pl/alyx/api/excel/controller/AuthController.java`.

2. **ACL scope enforcement**
   - Implement authorization evaluating `AccessConfig` `acl.rules`/`admin_endpoints` against the authenticated authorities — either a servlet filter after auth or Spring method security (`@PreAuthorize`/`hasAuthority`) on controllers.
   - GET→`read`, PUT/POST/DELETE→`write`, lock-status→`admin`. Deny with 403 + contract envelope.
   - Files: `config/WebSecurityConfig.java`, new `security/AclAuthorizationFilter.java` (or per-controller annotations), controllers.

3. **Tests**
   - JUnit: password grant succeeds with correct bcrypt-verified password, fails wrong password; scope tests for read/write/admin decisions.

**Testing Strategy**: JUnit unit tests on auth decisions; the integration suite auth spec covers it end-to-end.

**Verification**: `docs/TESTING.md` loop on `excel-api-java` + security gate (auth change): OWASP dependency-check on demand, manual credential-handling review.
