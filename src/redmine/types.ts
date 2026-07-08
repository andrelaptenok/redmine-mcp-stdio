export interface RedmineRef {
  id: number;
  name: string;
}

export interface RedmineAttachment {
  id: number;
  filename: string;
  filesize: number;
  content_url: string;
}

export interface RedmineJournalDetail {
  property: string;
  name: string;
  old_value?: string | null;
  new_value?: string | null;
}

export interface RedmineJournal {
  id: number;
  user?: RedmineRef;
  notes?: string;
  created_on: string;
  private_notes?: boolean;
  details?: RedmineJournalDetail[];
}

export interface RedmineIssue {
  id: number;
  subject: string;
  description?: string;
  done_ratio: number;
  created_on: string;
  updated_on: string;
  status?: RedmineRef;
  priority?: RedmineRef;
  project?: RedmineRef;
  author?: RedmineRef;
  assigned_to?: RedmineRef;
  attachments?: RedmineAttachment[];
  journals?: RedmineJournal[];
}

export interface RedmineProject {
  id: number;
  identifier: string;
  name: string;
}

export interface RedmineProjectDetail extends RedmineProject {
  description?: string;
  homepage?: string;
  created_on?: string;
}

export interface RedmineVersion {
  id: number;
  name: string;
  status: string;
  due_date?: string;
}

export interface RedmineMembership {
  id: number;
  user?: RedmineRef;
  group?: RedmineRef;
  roles: RedmineRef[];
}

export interface RedmineTimeEntry {
  id: number;
  hours: number;
  comments?: string;
  spent_on: string;
  activity?: RedmineRef;
  user?: RedmineRef;
  issue?: { id: number };
  project?: RedmineRef;
}

export interface Paginated {
  total_count: number;
  offset: number;
  limit: number;
}

export interface IssuesResponse extends Paginated {
  issues: RedmineIssue[];
}
export interface IssueResponse {
  issue: RedmineIssue;
}
export interface ProjectsResponse extends Paginated {
  projects: RedmineProject[];
}
export interface ProjectResponse {
  project: RedmineProjectDetail;
}
export interface VersionsResponse {
  versions: RedmineVersion[];
}
export interface MembershipsResponse extends Paginated {
  memberships: RedmineMembership[];
}
export interface TimeEntriesResponse extends Paginated {
  time_entries: RedmineTimeEntry[];
}
export interface TimeEntryResponse {
  time_entry: RedmineTimeEntry;
}
export interface StatusesResponse {
  issue_statuses: RedmineRef[];
}
export interface PrioritiesResponse {
  issue_priorities: RedmineRef[];
}
export interface TrackersResponse {
  trackers: RedmineRef[];
}
export interface ActivitiesResponse {
  time_entry_activities: RedmineRef[];
}
