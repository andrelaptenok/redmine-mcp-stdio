import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RedmineClient } from "../build/redmine/client.js";
import { collectIssues } from "../build/tools/issues.js";
import type { RedmineConfig } from "../build/config.js";

const config: RedmineConfig = {
  baseUrl: "https://redmine.example.com",
  apiKey: "key",
  timeoutMs: 10_000,
  maxRetries: 2,
};

// 250 issues; the only match for "target" sits on page 2 (index 150).
const ALL = Array.from({ length: 250 }, (_, i) => ({
  id: i + 1,
  subject: i === 150 ? "target ticket" : `issue ${i}`,
  done_ratio: 0,
  created_on: "2026-01-01",
  updated_on: "2026-01-01",
}));

function page(offset: number, limit: number): Response {
  const slice = ALL.slice(offset, offset + limit);
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify({ issues: slice, total_count: ALL.length, offset, limit }),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let client: RedmineClient;

beforeEach(() => {
  fetchMock = vi.fn(async (url: URL) => {
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 25);
    return page(offset, limit);
  });
  vi.stubGlobal("fetch", fetchMock);
  client = new RedmineClient(config);
});

afterEach(() => vi.unstubAllGlobals());

describe("collectIssues", () => {
  it("searches across pages when a query is set, not just the first page", async () => {
    const res = await collectIssues(client, { query: "target", limit: 25, offset: 0, all: false });

    expect(res.scanAll).toBe(true);
    expect(res.issues.map((i) => i.subject)).toContain("target ticket");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1); // paginated past page 1
  });

  it("fetches a single page when there is no query and all=false", async () => {
    const res = await collectIssues(client, { limit: 25, offset: 0, all: false });

    expect(res.scanAll).toBe(false);
    expect(res.issues).toHaveLength(25);
    expect(res.total).toBe(250);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps a full scan at MAX_ALL (500) issues", async () => {
    const res = await collectIssues(client, { all: true, limit: 25, offset: 0 });
    // Only 250 exist, so it stops when the source is exhausted.
    expect(res.issues).toHaveLength(250);
    expect(res.scanAll).toBe(true);
  });
});
