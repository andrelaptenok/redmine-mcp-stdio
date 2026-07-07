import type { RedmineIssue } from "./redmine/types.js";

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
