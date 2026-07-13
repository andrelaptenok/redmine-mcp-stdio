import type {
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
  RedmineSearchResult,
} from "./redmine/types.js";

export const MAX_ALL = 500;

export interface IssueListMeta {
  total: number;
  from: number;
  all: boolean;
  query?: string;
}

export function renderIssueList(issues: RedmineIssue[], meta: IssueListMeta): string {
  const rows = issues.map(
    (i) =>
      `#${i.id} [${i.status?.name}] ${i.subject} - ${i.project?.name}` +
      (i.assigned_to ? ` (assignee: ${i.assigned_to.name})` : "")
  );

  let header: string;
  if (issues.length === 0) {
    header = "No issues found.";
  } else if (meta.query) {
    const scope = meta.all ? `first ${Math.min(meta.total, MAX_ALL)}` : `offset ${meta.from}`;
    header = `Showing ${issues.length} match(es) for "${meta.query}" within ${scope} of ${meta.total} total.`;
  } else {
    header = `Showing ${meta.from + 1}-${meta.from + issues.length} of ${meta.total}.`;
  }

  return rows.length ? `${header}\n\n${rows.join("\n")}` : header;
}

export interface SearchResultsMeta {
  query: string;
  total: number;
  from: number;
}

export function renderSearchResults(
  results: RedmineSearchResult[],
  meta: SearchResultsMeta
): string {
  if (results.length === 0) return `No results for "${meta.query}".`;

  const rows = results.map((r) => {
    const snippet = r.description?.trim() ? `\n  ${r.description.trim().split("\n")[0]}` : "";
    return `[${r.type}] ${r.title}${r.datetime ? ` (${r.datetime})` : ""}\n  ${r.url}${snippet}`;
  });
  const header = `Showing ${meta.from + 1}-${meta.from + results.length} of ${meta.total} for "${meta.query}".`;
  return `${header}\n\n${rows.join("\n\n")}`;
}

function describeDetail(d: RedmineJournalDetail): string {
  const from = d.old_value;
  const to = d.new_value;
  if (from == null || from === "") return `set ${d.name} to "${to ?? ""}"`;
  if (to == null || to === "") return `cleared ${d.name} (was "${from}")`;
  return `${d.name}: "${from}" → "${to}"`;
}

/**
 * Render an issue's journals (comments + field-change history) as plain text.
 * Entries with neither a note nor recorded changes are skipped.
 */
export function renderJournals(journals: RedmineJournal[]): string {
  const entries = journals.filter((j) => j.notes?.trim() || j.details?.length);
  if (entries.length === 0) return "No comments or history.";

  return entries
    .map((j) => {
      const who = j.user?.name ?? "Unknown";
      const priv = j.private_notes ? " (private)" : "";
      const lines = [`[#${j.id}] ${who} · ${j.created_on}${priv}`];
      for (const d of j.details ?? []) lines.push(`  ${describeDetail(d)}`);
      if (j.notes?.trim()) {
        for (const line of j.notes.trimEnd().split("\n")) lines.push(`  > ${line}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}
