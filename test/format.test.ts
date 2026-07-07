import { describe, it, expect } from "vitest";
import { renderIssueList } from "../build/format.js";
import type { RedmineIssue } from "../build/redmine/types.js";

const issue = (over: Partial<RedmineIssue>): RedmineIssue => ({
  id: 1,
  subject: "Fix login",
  done_ratio: 0,
  created_on: "2026-01-01",
  updated_on: "2026-01-02",
  status: { id: 1, name: "New" },
  project: { id: 9, name: "Web" },
  ...over,
});

describe("renderIssueList", () => {
  it("says 'No issues found.' for an empty list", () => {
    expect(renderIssueList([], { total: 0, from: 0, all: false })).toBe("No issues found.");
  });

  it("shows a paginated header and one row per issue", () => {
    const out = renderIssueList([issue({ id: 1 }), issue({ id: 2, subject: "Logout bug" })], {
      total: 42,
      from: 0,
      all: false,
    });
    expect(out).toContain("Showing 1-2 of 42.");
    expect(out).toContain("#1 [New] Fix login - Web");
    expect(out).toContain("#2 [New] Logout bug - Web");
  });

  it("respects a non-zero offset in the header", () => {
    const out = renderIssueList([issue({ id: 5 })], { total: 42, from: 25, all: false });
    expect(out).toContain("Showing 26-26 of 42.");
  });

  it("includes the assignee when present", () => {
    const out = renderIssueList([issue({ assigned_to: { id: 7, name: "Ann" } })], {
      total: 1,
      from: 0,
      all: false,
    });
    expect(out).toContain("(assignee: Ann)");
  });

  it("renders a query-scoped header when filtering", () => {
    const out = renderIssueList([issue({ subject: "login" })], {
      total: 100,
      from: 0,
      all: false,
      query: "login",
    });
    expect(out).toContain('match(es) for "login"');
  });
});
