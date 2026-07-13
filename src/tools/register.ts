import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RedmineClient } from "../redmine/client.js";
import { registerIssueTools } from "./issues.js";
import { registerProjectTools } from "./projects.js";
import { registerTimeEntryTools } from "./time-entries.js";
import { registerEnumerationTools } from "./enumerations.js";
import { registerSearchTools } from "./search.js";
import { registerUserTools } from "./users.js";

export function registerTools(server: McpServer, client: RedmineClient): void {
  registerIssueTools(server, client);
  registerProjectTools(server, client);
  registerTimeEntryTools(server, client);
  registerEnumerationTools(server, client);
  registerSearchTools(server, client);
  registerUserTools(server, client);
}
