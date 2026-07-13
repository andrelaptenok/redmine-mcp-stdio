import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RedmineClient } from "../redmine/client.js";
import type { TimeEntriesResponse, TimeEntryResponse } from "../redmine/types.js";
import { guard, ok, fail, requireBody } from "./helpers.js";

export function registerTimeEntryTools(server: McpServer, client: RedmineClient): void {
  server.registerTool(
    "log_time",
    {
      title: "Log time",
      description: "Log a time entry against an issue or a project",
      inputSchema: {
        issue_id: z.number().int().optional().describe("Issue to log against"),
        project_id: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Project to log against (if no issue_id)"),
        hours: z.number().positive().describe("Hours spent"),
        activity_id: z.number().int().optional().describe("Time entry activity id"),
        comments: z.string().optional(),
        spent_on: z.string().optional().describe("Date YYYY-MM-DD (defaults to today)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ issue_id, project_id, hours, activity_id, comments, spent_on }) =>
      guard(async () => {
        if (issue_id === undefined && project_id === undefined) {
          return fail("Provide issue_id or project_id.");
        }
        const entry: Record<string, unknown> = { hours };
        if (issue_id !== undefined) entry.issue_id = issue_id;
        if (project_id !== undefined) entry.project_id = project_id;
        if (activity_id !== undefined) entry.activity_id = activity_id;
        if (comments) entry.comments = comments;
        if (spent_on) entry.spent_on = spent_on;

        const data = requireBody(
          await client.post<TimeEntryResponse>("/time_entries.json", { time_entry: entry }),
          "Redmine did not return the logged time entry."
        );
        const t = data.time_entry;
        const target = t.issue
          ? ` on issue #${t.issue.id}`
          : t.project
            ? ` on ${t.project.name}`
            : "";
        return ok(`Logged ${t.hours}h (entry #${t.id})${target} for ${t.spent_on}.`);
      })
  );

  server.registerTool(
    "list_time_entries",
    {
      title: "List time entries",
      description: "List time entries, filtered by issue, project, user or date range",
      inputSchema: {
        issue_id: z.number().int().optional(),
        project_id: z.union([z.string(), z.number()]).optional(),
        user_id: z.union([z.string(), z.number()]).optional().describe("User id or 'me'"),
        from: z.string().optional().describe("Start date YYYY-MM-DD"),
        to: z.string().optional().describe("End date YYYY-MM-DD"),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ issue_id, project_id, user_id, from, to, limit, offset }) =>
      guard(async () => {
        const data = await client.get<TimeEntriesResponse>("/time_entries.json", {
          issue_id,
          project_id,
          user_id,
          from,
          to,
          limit,
          offset,
        });
        const entries = data.time_entries;
        if (entries.length === 0) return ok("No time entries found.");

        const sum = entries.reduce((acc, t) => acc + t.hours, 0);
        const rows = entries.map((t) => {
          const activity = t.activity ? ` [${t.activity.name}]` : "";
          const issue = t.issue ? ` #${t.issue.id}` : "";
          const comments = t.comments ? ` - ${t.comments}` : "";
          return `${t.spent_on}  ${t.hours}h  ${t.user?.name ?? "?"}${activity}${issue}${comments}`;
        });
        const header = `Showing ${offset + 1}-${offset + entries.length} of ${data.total_count} (${sum}h on this page).`;
        return ok(`${header}\n\n${rows.join("\n")}`);
      })
  );
}
