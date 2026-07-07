# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); versioning is [SemVer](https://semver.org/).

## 1.0.2

### Changed

- Added `homepage` (landing page) and `bugs` (issue tracker) links to the npm package.

## 1.0.1

### Changed

- Documented client configs now use `npx -y redmine-mcp-stdio` (no clone or build needed).
- Releases publish to npm via GitHub Actions with trusted publishing (OIDC) and provenance.

## 1.0.0 (initial release)

### Added

- MCP (stdio) server exposing Redmine over 10 tools:
  `list_issues`, `get_issue`, `list_projects`, `get_project`, `create_issue`,
  `update_issue`, `add_comment`, `log_time`, `list_time_entries`, `list_enumerations`.
- Pagination for `list_issues` (`offset`, `all`) with a `Showing X-Y of TOTAL` header.
- Attachment listing in `get_issue`.
- Typed Redmine client with centralized error handling (401/403/404/422 mapped to
  readable messages; validation `errors` parsed from the body).
- Request timeout and backoff retry on `429`/`5xx`, both configurable via env.
- Config validation with Zod (`REDMINE_URL`, `REDMINE_API_KEY`, optional tuning knobs).
- Layered architecture: `config`, `redmine/` client class (injected), domain-split `tools/`,
  pure `format` helpers.
- Security hardening: API-key redaction, host pinning, encoded path parameters,
  project-id validation, response-size cap. See `SECURITY.md`.
- Tooling: strict `tsconfig`, ESLint + Prettier, and a `check` script.
- Unit tests (vitest) and CI (GitHub Actions, Node 18/20/22).
