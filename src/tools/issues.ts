import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RedmineClient } from "../redmine/client.js";
import type { IssueResponse, IssuesResponse, RedmineIssue } from "../redmine/types.js";
import { encodeSegment } from "../redmine/paths.js";
import { MAX_ALL, renderIssueList, renderJournals } from "../format.js";
import { guard, ok, requireBody } from "./helpers.js";

export interface CollectIssuesInput {
  project_id?: string;
  status_id?: string;
  assigned_to_id?: string;
  query?: string;
  limit: number;
  offset: number;
  all: boolean;
}

export interface CollectedIssues {
  issues: RedmineIssue[];
  total: number;
  from: number;
  scanAll: boolean;
}

export async function collectIssues(
  client: RedmineClient,
  input: CollectIssuesInput
): Promise<CollectedIssues> {
  const filters: Record<string, string> = {};
  if (input.project_id) filters.project_id = input.project_id;
  if (input.status_id) filters.status_id = input.status_id;
  if (input.assigned_to_id) filters.assigned_to_id = input.assigned_to_id;

  const scanAll = input.all || Boolean(input.query);
  let issues: RedmineIssue[] = [];
  let total = 0;
  let from = input.offset;

  if (scanAll) {
    from = 0;
    let cursor = 0;
    while (issues.length < MAX_ALL) {
      const page = await client.get<IssuesResponse>("/issues.json", {
        ...filters,
        limit: 100,
        offset: cursor,
      });
      total = page.total_count;
      issues.push(...page.issues);
      if (issues.length >= total || page.issues.length === 0) break;
      cursor += page.issues.length;
    }
    issues = issues.slice(0, MAX_ALL);
  } else {
    const page = await client.get<IssuesResponse>("/issues.json", {
      ...filters,
      limit: input.limit,
      offset: input.offset,
    });
    total = page.total_count;
    issues = page.issues;
  }

  if (input.query) {
    const q = input.query.toLowerCase();
    issues = issues.filter((i) => i.subject?.toLowerCase().includes(q));
  }

  return { issues, total, from, scanAll };
}

export function registerIssueTools(server: McpServer, client: RedmineClient): void {
  server.tool(
    "list_issues",
    "List Redmine issues with optional filters and pagination",
    {
      project_id: z.string().optional().describe("Project identifier or numeric id"),
      status_id: z.string().optional().describe("open, closed, * or a status id"),
      assigned_to_id: z.string().optional().describe("User id or 'me'"),
      query: z
        .string()
        .optional()
        .describe(`Free-text search in subject; scans up to ${MAX_ALL} matching issues`),
      limit: z.number().int().min(1).max(100).default(25),
      offset: z.number().int().min(0).default(0).describe("Number of issues to skip"),
      all: z
        .boolean()
        .default(false)
        .describe(`Fetch every matching issue (up to ${MAX_ALL}), ignoring limit/offset`),
    },
    async ({ project_id, status_id, assigned_to_id, query, limit, offset, all }) =>
      guard(async () => {
        const { issues, total, from, scanAll } = await collectIssues(client, {
          project_id,
          status_id,
          assigned_to_id,
          query,
          limit,
          offset,
          all,
        });
        return ok(renderIssueList(issues, { total, from, all: scanAll, query }));
      })
  );

  server.tool(
    "get_issue",
    "Get full details of one Redmine issue by id, including attachments and, by default, comments/history (journals)",
    {
      id: z.number().int().describe("Issue id"),
      include_journals: z
        .boolean()
        .default(true)
        .describe("Include comments and field-change history"),
    },
    async ({ id, include_journals }) =>
      guard(async () => {
        const include = ["attachments"];
        if (include_journals) include.push("journals");
        const data = await client.get<IssueResponse>(`/issues/${encodeSegment(id)}.json`, {
          include: include.join(","),
        });
        const i = data.issue;
        const lines = [
          `#${i.id}: ${i.subject}`,
          `Project: ${i.project?.name}`,
          `Status: ${i.status?.name}   Priority: ${i.priority?.name}`,
          `Author: ${i.author?.name}   Assignee: ${i.assigned_to?.name ?? "none"}`,
          `Created: ${i.created_on}   Updated: ${i.updated_on}`,
          `Done: ${i.done_ratio}%`,
          "",
          i.description || "(no description)",
        ];
        if (i.attachments?.length) {
          lines.push("", "Attachments:");
          for (const a of i.attachments) {
            lines.push(`  #${a.id} ${a.filename} (${a.filesize} bytes) - ${a.content_url}`);
          }
        }
        if (include_journals) {
          lines.push("", "Comments & history:", "", renderJournals(i.journals ?? []));
        }
        return ok(lines.join("\n"));
      })
  );

  server.tool(
    "create_issue",
    "Create a new Redmine issue",
    {
      project_id: z.union([z.string(), z.number()]).describe("Project identifier or numeric id"),
      subject: z.string().describe("Issue title"),
      description: z.string().optional(),
      tracker_id: z.number().int().optional(),
      priority_id: z.number().int().optional(),
      assigned_to_id: z.number().int().optional(),
      status_id: z.number().int().optional(),
    },
    async (args) =>
      guard(async () => {
        const data = requireBody(
          await client.post<IssueResponse>("/issues.json", { issue: args }),
          "Redmine did not return the created issue."
        );
        const i = data.issue;
        return ok(`Created #${i.id}: ${i.subject}\n${client.baseUrl}/issues/${i.id}`);
      })
  );

  server.tool(
    "update_issue",
    "Update fields of an existing Redmine issue",
    {
      id: z.number().int().describe("Issue id to update"),
      subject: z.string().optional(),
      description: z.string().optional(),
      status_id: z.number().int().optional(),
      priority_id: z.number().int().optional(),
      assigned_to_id: z.number().int().optional(),
      done_ratio: z.number().int().min(0).max(100).optional(),
      notes: z.string().optional().describe("Comment added to the issue journal"),
    },
    async ({ id, ...fields }) =>
      guard(async () => {
        await client.put(`/issues/${encodeSegment(id)}.json`, { issue: fields });
        return ok(`Updated #${id}.`);
      })
  );

  server.tool(
    "add_comment",
    "Add a comment (note) to a Redmine issue",
    { id: z.number().int(), notes: z.string() },
    async ({ id, notes }) =>
      guard(async () => {
        await client.put(`/issues/${encodeSegment(id)}.json`, { issue: { notes } });
        return ok(`Comment added to #${id}.`);
      })
  );
}
