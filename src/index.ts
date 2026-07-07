#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { RedmineClient } from "./redmine/client.js";
import { registerTools } from "./tools/register.js";
import { VERSION } from "./version.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new RedmineClient(config);

  const server = new McpServer({ name: "redmine-mcp-stdio", version: VERSION });
  registerTools(server, client);

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
