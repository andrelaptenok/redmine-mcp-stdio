# Security

## Reporting a vulnerability

Please report suspected vulnerabilities privately via GitHub Security Advisories
("Report a vulnerability" on the repository's **Security** tab) rather than opening
a public issue. You'll get an acknowledgement within a few days.

## Threat model

This is a local stdio server. It runs on the operator's machine, is launched by a
trusted MCP client, and talks to a single, operator-configured Redmine instance.
It does not open a network port and does not accept connections from third parties.

## Hardening in place

- **Secrets stay local.** The API key is read from the environment and sent only in
  the `X-Redmine-API-Key` header. It is never logged, and it is redacted (`***`)
  from any error text before that text can reach a caller.
- **No secrets in the repo.** `.env` is gitignored; only `.env.example` is tracked.
- **Config is validated.** `REDMINE_URL` must be a well-formed `http`/`https` URL
  (checked with Zod at startup); a bad or missing value fails fast with a clear message.
- **Requests can't leave the configured host.** Every request URL is rebuilt from the
  configured base and its origin is asserted before the call, so a crafted parameter
  can't redirect the request to another host.
- **Path parameters are encoded.** Dynamic path segments are percent-encoded, and
  project ids are validated against a numeric/identifier allowlist, preventing path
  traversal or URL reshaping.
- **Bounded requests.** Every call has a timeout (default 10s), a capped
  retry-with-backoff on `429`/`5xx`, and a maximum response size to avoid buffering a
  hostile or oversized body.
- **Minimal dependencies.** Runtime deps are limited to the MCP SDK and Zod.

## Supply chain

- **Two direct runtime dependencies:** the official `@modelcontextprotocol/sdk` and `zod`.
- **Trusted publishing.** Releases are published to npm from GitHub Actions via OIDC
  (no long-lived tokens) and carry build **provenance**, so each version is
  cryptographically traceable to this repository and workflow.
- **No install scripts.** Nothing in the dependency tree runs `pre/post/install` hooks,
  and `npm audit` reports **0 known vulnerabilities**.

### About supply-chain scanner alerts

Automated scanners (e.g. Socket) flag a number of _capabilities_ in the dependency
tree. None are known vulnerabilities; they come from two expected sources:

- **The MCP SDK's HTTP stack.** The SDK ships `express`, `cors`, `ajv`, `eventsource`
  and friends as dependencies for its HTTP/SSE transports. **This server uses the
  `stdio` transport only** and never loads them, but npm still installs the whole tree,
  so scanners report `network access`, `uses eval` (ajv schema codegen), `shell access`
  (`cross-spawn`), `dynamic require`, and `unmaintained` on those transitive packages.
- **This server's own, intentional capabilities:** network access (HTTPS requests to
  your Redmine host), environment-variable access (reading `REDMINE_URL` /
  `REDMINE_API_KEY`), and a single filesystem read of its own `package.json` to report
  the version. All three are documented above and are core to the tool's function.

## Operator guidance

- Use a Redmine API key scoped to a user with only the permissions you need.
- Point `REDMINE_URL` directly at your Redmine host over HTTPS.
- Never commit your `.env` or paste your key into shared configs.
