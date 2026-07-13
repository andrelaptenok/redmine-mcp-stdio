import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RedmineClient } from "../build/redmine/client.js";
import { runSearch } from "../build/tools/search.js";
import { renderSearchResults } from "../build/format.js";
import type { RedmineConfig } from "../build/config.js";
import type { RedmineSearchResult } from "../build/redmine/types.js";

const config: RedmineConfig = {
  baseUrl: "https://redmine.example.com",
  apiKey: "key",
  timeoutMs: 10_000,
  maxRetries: 2,
};

const RESULTS: RedmineSearchResult[] = [
  {
    id: 42,
    title: "Login fails on Safari",
    type: "issue",
    url: "https://redmine.example.com/issues/42",
    description: "Steps to reproduce...",
    datetime: "2026-07-01T10:00:00Z",
  },
];

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let client: RedmineClient;

beforeEach(() => {
  fetchMock = vi.fn(async () =>
    response({ results: RESULTS, total_count: 1, offset: 0, limit: 25 })
  );
  vi.stubGlobal("fetch", fetchMock);
  client = new RedmineClient(config);
});

afterEach(() => vi.unstubAllGlobals());

describe("runSearch", () => {
  it("queries /search.json with q, limit and offset", async () => {
    const out = await runSearch(client, {
      q: "login",
      titles_only: false,
      open_issues: false,
      limit: 25,
      offset: 0,
    });

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/search.json");
    expect(url.searchParams.get("q")).toBe("login");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.has("titles_only")).toBe(false);
    expect(out.total).toBe(1);
    expect(out.results[0].title).toBe("Login fails on Safari");
  });

  it("scopes the search to a project and sets type/flag params", async () => {
    await runSearch(client, {
      q: "login",
      project_id: "my-project",
      types: ["issues", "wiki_pages"],
      titles_only: true,
      open_issues: true,
      limit: 10,
      offset: 20,
    });

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/projects/my-project/search.json");
    expect(url.searchParams.get("issues")).toBe("1");
    expect(url.searchParams.get("wiki_pages")).toBe("1");
    expect(url.searchParams.get("titles_only")).toBe("1");
    expect(url.searchParams.get("open_issues")).toBe("1");
    expect(url.searchParams.get("offset")).toBe("20");
  });

  it("rejects an unsafe project id instead of building a bad path", async () => {
    await expect(
      runSearch(client, {
        q: "login",
        project_id: "../admin",
        titles_only: false,
        open_issues: false,
        limit: 25,
        offset: 0,
      })
    ).rejects.toThrow(/Invalid project id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("renderSearchResults", () => {
  it("renders a header, type, url and first description line", () => {
    const text = renderSearchResults(RESULTS, { query: "login", total: 1, from: 0 });
    expect(text).toContain('Showing 1-1 of 1 for "login".');
    expect(text).toContain("[issue] Login fails on Safari");
    expect(text).toContain("https://redmine.example.com/issues/42");
    expect(text).toContain("Steps to reproduce...");
  });

  it("says so when there are no results", () => {
    expect(renderSearchResults([], { query: "nothing", total: 0, from: 0 })).toBe(
      'No results for "nothing".'
    );
  });
});
