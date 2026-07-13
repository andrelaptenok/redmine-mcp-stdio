import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RedmineClient } from "../redmine/client.js";
import type { RedmineSearchResult, SearchResponse } from "../redmine/types.js";
import type { QueryParams } from "../redmine/client.js";
import { safeProjectId } from "../redmine/paths.js";
import { renderSearchResults } from "../format.js";
import { guard, ok } from "./helpers.js";

const SEARCH_TYPES = [
  "issues",
  "wiki_pages",
  "documents",
  "changesets",
  "news",
  "messages",
  "projects",
] as const;

export interface SearchInput {
  q: string;
  project_id?: string;
  types?: readonly (typeof SEARCH_TYPES)[number][];
  titles_only: boolean;
  open_issues: boolean;
  limit: number;
  offset: number;
}

export interface SearchOutput {
  results: RedmineSearchResult[];
  total: number;
  offset: number;
}

export async function runSearch(client: RedmineClient, input: SearchInput): Promise<SearchOutput> {
  const path = input.project_id
    ? `/projects/${safeProjectId(input.project_id)}/search.json`
    : "/search.json";

  const params: QueryParams = {
    q: input.q,
    limit: input.limit,
    offset: input.offset,
  };
  if (input.titles_only) params.titles_only = 1;
  if (input.open_issues) params.open_issues = 1;
  for (const type of input.types ?? []) params[type] = 1;

  const data = await client.get<SearchResponse>(path, params);
  return { results: data.results, total: data.total_count, offset: data.offset };
}

export function registerSearchTools(server: McpServer, client: RedmineClient): void {
  server.registerTool(
    "search",
    {
      title: "Search Redmine",
      description:
        "Full-text search across Redmine: issues (subjects, descriptions, comments), wiki pages, news and more. Prefer this over list_issues when looking for text.",
      inputSchema: {
        q: z.string().describe("Search query"),
        project_id: z
          .string()
          .optional()
          .describe("Limit the search to one project (identifier or numeric id)"),
        types: z
          .array(z.enum(SEARCH_TYPES))
          .optional()
          .describe("Restrict to these result types (default: all types)"),
        titles_only: z.boolean().default(false).describe("Match only in titles/subjects"),
        open_issues: z.boolean().default(false).describe("Match only open issues"),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0).describe("Number of results to skip"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q, project_id, types, titles_only, open_issues, limit, offset }) =>
      guard(async () => {
        const out = await runSearch(client, {
          q,
          project_id,
          types,
          titles_only,
          open_issues,
          limit,
          offset,
        });
        return ok(
          renderSearchResults(out.results, { query: q, total: out.total, from: out.offset })
        );
      })
  );
}
