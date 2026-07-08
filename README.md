<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-mark.svg">
    <img src="docs/assets/logo-mark-light.svg" alt="redmine-mcp-stdio logo" width="140">
  </picture>
</p>

# redmine-mcp-stdio

A local [Model Context Protocol](https://modelcontextprotocol.io) server (stdio) for [Redmine](https://www.redmine.org). Point an MCP client at it (Cursor, VS Code, Claude, Codex, Windsurf, Cline, Zed, JetBrains AI and others) and work with Redmine issues, projects and time entries straight from the editor.

[![npm](https://img.shields.io/npm/v/redmine-mcp-stdio)](https://www.npmjs.com/package/redmine-mcp-stdio) [![CI](https://github.com/andrelaptenok/redmine-mcp-stdio/actions/workflows/ci.yml/badge.svg)](https://github.com/andrelaptenok/redmine-mcp-stdio/actions/workflows/ci.yml) ![license](https://img.shields.io/badge/license-MIT-green) ![node](https://img.shields.io/badge/node-%3E%3D20-blue)

## Tools

| Tool                | What it does                                               | Key parameters                                                                                     |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `list_issues`       | List/filter issues, paginated                              | `project_id`, `status_id`, `assigned_to_id`, `query`, `limit`, `offset`, `all`                     |
| `get_issue`         | Full details of one issue + comments/history + attachments | `id`, `include_journals` (default `true`)                                                          |
| `list_projects`     | Accessible projects                                        | `limit`                                                                                            |
| `get_project`       | Project details, versions and members                      | `id`                                                                                               |
| `create_issue`      | Create an issue                                            | `project_id`, `subject`, `description`, `tracker_id`, `priority_id`, `assigned_to_id`, `status_id` |
| `update_issue`      | Update issue fields                                        | `id` + any of `subject`, `status_id`, `priority_id`, `assigned_to_id`, `done_ratio`, `notes`       |
| `add_comment`       | Add a note to an issue                                     | `id`, `notes`                                                                                      |
| `log_time`          | Log a time entry on an issue/project                       | `issue_id` or `project_id`, `hours`, `activity_id`, `comments`, `spent_on`                         |
| `list_time_entries` | List time entries, filtered                                | `issue_id`, `project_id`, `user_id`, `from`, `to`, `limit`, `offset`                               |
| `list_enumerations` | IDs of trackers/statuses/priorities/activities             | none                                                                                               |

## Install

No manual install needed. The client launches the server on demand with `npx`, which
downloads it on first run and caches it after. Just add the config for your client under
[Connect](#connect).

Prefer to run from a local clone? See [Development](#development).

## Get a Redmine API key

**My account > API access key > Show.**

- If there's no such section, an admin must enable the REST API in **Administration > Settings > API**.
- The key must belong to a user with permission to view (and, for writes, create/edit) issues.

> ⚠️ Never commit your API key. Copy `.env.example` to `.env` for local use; `.env` is gitignored.

## Connect

The server reads `REDMINE_URL` and `REDMINE_API_KEY` from the environment. Provide them via the client's MCP config `env` block.

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in a project root:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "redmine-mcp-stdio"],
      "env": {
        "REDMINE_URL": "https://redmine.your-company.com",
        "REDMINE_API_KEY": "your_key"
      }
    }
  }
}
```

Reload Cursor and enable the server in **Settings > MCP**.

### VS Code (GitHub Copilot)

Edit `.vscode/mcp.json` in your workspace (or your user `mcp.json`). Note the top-level key is `servers`, not `mcpServers`:

```json
{
  "servers": {
    "redmine": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "redmine-mcp-stdio"],
      "env": {
        "REDMINE_URL": "https://redmine.your-company.com",
        "REDMINE_API_KEY": "your_key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add redmine \
  --env REDMINE_URL=https://redmine.your-company.com \
  --env REDMINE_API_KEY=your_key \
  -- npx -y redmine-mcp-stdio
```

Or edit `~/.claude.json` / the project `.mcp.json` directly (same shape as Claude Desktop below).

### Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "redmine-mcp-stdio"],
      "env": {
        "REDMINE_URL": "https://redmine.your-company.com",
        "REDMINE_API_KEY": "your_key"
      }
    }
  }
}
```

Restart Claude Desktop afterwards.

### Codex CLI

Add a server table to `~/.codex/config.toml`:

```toml
[mcp_servers.redmine]
command = "npx"
args = ["-y", "redmine-mcp-stdio"]
env = { REDMINE_URL = "https://redmine.your-company.com", REDMINE_API_KEY = "your_key" }
```

If node is installed via nvm, use the full path from `which npx` as `command`.

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "redmine-mcp-stdio"],
      "env": {
        "REDMINE_URL": "https://redmine.your-company.com",
        "REDMINE_API_KEY": "your_key"
      }
    }
  }
}
```

In Cascade, open **MCP servers > Manage > View raw config**, paste, then refresh. Supports `${env:VAR}` interpolation if you'd rather not inline the key.

### Cline

In the Cline pane, click the **MCP Servers** icon and choose **Configure MCP Servers** to open `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "redmine-mcp-stdio"],
      "env": {
        "REDMINE_URL": "https://redmine.your-company.com",
        "REDMINE_API_KEY": "your_key"
      }
    }
  }
}
```

### Zed

Zed calls MCP servers **context servers**. Open the command palette and run **zed: open settings**, then add to `settings.json` (note `"source": "custom"`):

```json
{
  "context_servers": {
    "redmine": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "redmine-mcp-stdio"],
      "env": {
        "REDMINE_URL": "https://redmine.your-company.com",
        "REDMINE_API_KEY": "your_key"
      }
    }
  }
}
```

Zed restarts the server on save, so no editor reload is needed.

### JetBrains AI Assistant (2025.2+)

**Settings > Tools > AI Assistant > Model Context Protocol (MCP) > Add:**

- Type: **stdio**
- Command: `npx` (if node is installed via nvm, use the full path from `which npx`)
- Arguments: `-y redmine-mcp-stdio`
- Environment:
  - `REDMINE_URL=https://redmine.your-company.com`
  - `REDMINE_API_KEY=your_key`

Enable _"Automatically enable new and changed MCP servers"_, then **Apply**. Click the status icon and you should see 10 tools. Invoke them in chat with `/`.

## Verify locally (optional)

```bash
REDMINE_URL=https://redmine.your-company.com REDMINE_API_KEY=your_key npx -y redmine-mcp-stdio
```

The process should start and wait silently on stdio (Ctrl+C to exit).

## Troubleshooting

- **`Failed to connect` / server won't start:** the `command` must resolve in the client's environment. If node is installed via nvm, a bare `npx` may not be found. Use the full path from `which npx` as the command.
- **`Missing REDMINE_URL or REDMINE_API_KEY`:** the `env` block wasn't passed. Double-check it's in the MCP config, not your shell.
- **`Redmine 401` / `403`:** bad API key, or the key's user lacks permission for that action.
- **`Redmine 404`:** the issue/project id doesn't exist, or `REDMINE_URL` points at the wrong host.

## Configuration

| Variable              | Required | Default | Description                                     |
| --------------------- | -------- | ------- | ----------------------------------------------- |
| `REDMINE_URL`         | yes      | n/a     | Base URL of your Redmine instance (http/https)  |
| `REDMINE_API_KEY`     | yes      | n/a     | Personal API access key                         |
| `REDMINE_TIMEOUT_MS`  | no       | `10000` | Per-request timeout in milliseconds             |
| `REDMINE_MAX_RETRIES` | no       | `2`     | Retries on `429`/`5xx` with exponential backoff |

## Architecture

The code is organized in layers, with a single HTTP client injected into each tool
group so that tools never touch transport or `process.env` directly:

```
src/
  index.ts            entry point: load config, build client, register tools, serve stdio
  config.ts           env parsing + validation (Zod) into a typed RedmineConfig
  version.ts          single source of the version string
  redmine/
    client.ts         RedmineClient: auth, timeout, retry, host pinning, secret redaction
    errors.ts         RedmineError / ConfigError + HTTP error normalization
    paths.ts          safe path-segment encoding + project-id validation
    types.ts          Redmine API response types
  tools/
    register.ts       wires every tool group onto the server
    issues.ts         list/get/create/update issues + add_comment
    projects.ts       list/get projects (versions, members)
    time-entries.ts   log_time, list_time_entries
    enumerations.ts   trackers / statuses / priorities / activities
    helpers.ts        guard(), ok()/fail(), ToolResult
  format.ts           pure presentation helpers
```

## Development

```bash
npm run build       # compile src/ to build/
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm run format      # prettier --write
npm test            # build, then run the vitest suite
npm run check       # typecheck + lint + format:check + test (what CI runs)
```

See [CHANGELOG.md](./CHANGELOG.md) for releases.

## Security

The API key is never logged and is redacted from error output; requests are pinned to
the configured host, path parameters are encoded, and every call is bounded by a
timeout and a response-size cap. Details and reporting: [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE](./LICENSE).
