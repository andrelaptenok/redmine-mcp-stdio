import { describe, it, expect } from "vitest";
import { renderIssueList, renderJournals } from "../build/format.js";
import type { RedmineIssue, RedmineJournal } from "../build/redmine/types.js";

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

const journal = (over: Partial<RedmineJournal>): RedmineJournal => ({
  id: 1,
  user: { id: 7, name: "Kirill" },
  created_on: "2026-07-08T08:01:00Z",
  ...over,
});

describe("renderJournals", () => {
  it("returns a placeholder when there is nothing to show", () => {
    expect(renderJournals([])).toBe("No comments or history.");
  });

  it("skips empty entries that have neither a note nor changes", () => {
    expect(renderJournals([journal({ notes: "  " })])).toBe("No comments or history.");
  });

  it("renders a comment note with author and timestamp", () => {
    const out = renderJournals([journal({ notes: "Looks good to me" })]);
    expect(out).toContain("[#1] Kirill · 2026-07-08T08:01:00Z");
    expect(out).toContain("> Looks good to me");
  });

  it("renders multi-line notes with a quote prefix per line", () => {
    const out = renderJournals([journal({ notes: "line one\nline two" })]);
    expect(out).toContain("> line one");
    expect(out).toContain("> line two");
  });

  it("describes a field change from an old value to a new one", () => {
    const out = renderJournals([
      journal({
        details: [{ property: "attr", name: "done_ratio", old_value: "30", new_value: "50" }],
      }),
    ]);
    expect(out).toContain('done_ratio: "30" → "50"');
  });

  it("describes a value being set from empty and cleared to empty", () => {
    const out = renderJournals([
      journal({
        details: [
          { property: "attr", name: "assigned_to_id", old_value: null, new_value: "7" },
          { property: "attr", name: "due_date", old_value: "2026-07-01", new_value: null },
        ],
      }),
    ]);
    expect(out).toContain('set assigned_to_id to "7"');
    expect(out).toContain('cleared due_date (was "2026-07-01")');
  });

  it("marks private notes", () => {
    const out = renderJournals([journal({ notes: "internal", private_notes: true })]);
    expect(out).toContain("(private)");
  });
});
