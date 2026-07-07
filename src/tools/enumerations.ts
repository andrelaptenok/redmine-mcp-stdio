import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RedmineClient } from "../redmine/client.js";
import type {
  ActivitiesResponse,
  PrioritiesResponse,
  RedmineRef,
  StatusesResponse,
  TrackersResponse,
} from "../redmine/types.js";
import { guard, ok } from "./helpers.js";

const formatRefs = (refs: RedmineRef[]): string =>
  refs.map((r) => `  ${r.id} - ${r.name}`).join("\n");

export function registerEnumerationTools(server: McpServer, client: RedmineClient): void {
  server.tool(
    "list_enumerations",
    "List trackers, statuses, priorities and time-entry activities with their ids",
    {},
    async () =>
      guard(async () => {
        const [statuses, priorities, trackers, activities] = await Promise.all([
          client.get<StatusesResponse>("/issue_statuses.json"),
          client.get<PrioritiesResponse>("/enumerations/issue_priorities.json"),
          client.get<TrackersResponse>("/trackers.json"),
          client.get<ActivitiesResponse>("/enumerations/time_entry_activities.json"),
        ]);
        return ok(
          `Statuses:\n${formatRefs(statuses.issue_statuses)}\n\n` +
            `Priorities:\n${formatRefs(priorities.issue_priorities)}\n\n` +
            `Trackers:\n${formatRefs(trackers.trackers)}\n\n` +
            `Time-entry activities:\n${formatRefs(activities.time_entry_activities)}`
        );
      })
  );
}
