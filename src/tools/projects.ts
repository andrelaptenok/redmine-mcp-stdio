import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RedmineClient } from "../redmine/client.js";
import type {
  MembershipsResponse,
  ProjectResponse,
  ProjectsResponse,
  VersionsResponse,
} from "../redmine/types.js";
import { safeProjectId } from "../redmine/paths.js";
import { guard, ok } from "./helpers.js";

export function registerProjectTools(server: McpServer, client: RedmineClient): void {
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List accessible Redmine projects",
      inputSchema: { limit: z.number().int().min(1).max(100).default(50) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit }) =>
      guard(async () => {
        const data = await client.get<ProjectsResponse>("/projects.json", { limit });
        const rows = data.projects.map((p) => `${p.identifier} - ${p.name}`);
        return ok(rows.join("\n") || "No projects.");
      })
  );

  server.registerTool(
    "get_project",
    {
      title: "Get project",
      description: "Get a project's details, versions and members",
      inputSchema: { id: z.string().describe("Project identifier or numeric id") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) =>
      guard(async () => {
        const pid = safeProjectId(id);
        const [proj, versions, memberships] = await Promise.all([
          client.get<ProjectResponse>(`/projects/${pid}.json`),
          client.get<VersionsResponse>(`/projects/${pid}/versions.json`),
          client.get<MembershipsResponse>(`/projects/${pid}/memberships.json`, { limit: 100 }),
        ]);
        const p = proj.project;
        const lines = [
          `${p.name} (${p.identifier}, #${p.id})`,
          p.description || "(no description)",
          "",
          "Versions:",
        ];

        if (versions.versions.length) {
          for (const v of versions.versions) {
            lines.push(
              `  #${v.id} ${v.name} [${v.status}]${v.due_date ? ` due ${v.due_date}` : ""}`
            );
          }
        } else {
          lines.push("  (none)");
        }

        lines.push("", "Members:");
        if (memberships.memberships.length) {
          for (const m of memberships.memberships) {
            const who = m.user?.name ?? m.group?.name ?? "?";
            const roles = m.roles.map((r) => r.name).join(", ");
            lines.push(`  ${who} - ${roles}`);
          }
        } else {
          lines.push("  (none)");
        }

        return ok(lines.join("\n"));
      })
  );
}
