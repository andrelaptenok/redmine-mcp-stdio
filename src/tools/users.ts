import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RedmineClient } from "../redmine/client.js";
import type { UserResponse } from "../redmine/types.js";
import { guard, ok } from "./helpers.js";

export function registerUserTools(server: McpServer, client: RedmineClient): void {
  server.registerTool(
    "get_current_user",
    {
      title: "Get current user",
      description:
        "Get the Redmine account behind the configured API key: numeric id, login and name. Use the id (or the literal 'me') wherever a user id is expected.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      guard(async () => {
        const data = await client.get<UserResponse>("/users/current.json");
        const u = data.user;
        const lines = [
          `${u.firstname} ${u.lastname} (login: ${u.login}, id: ${u.id})`,
          `Mail: ${u.mail ?? "hidden"}`,
        ];
        if (u.admin) lines.push("Admin: yes");
        if (u.last_login_on) lines.push(`Last login: ${u.last_login_on}`);
        return ok(lines.join("\n"));
      })
  );
}
