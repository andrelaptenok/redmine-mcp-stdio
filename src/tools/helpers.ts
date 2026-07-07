import { RedmineError } from "../redmine/errors.js";

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

export const ok = (text: string): ToolResult => ({ content: [{ type: "text", text }] });

export const fail = (text: string): ToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

export function requireBody<T>(data: T | null, message: string): T {
  if (data == null) throw new RedmineError(0, message);
  return data;
}

export async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RedmineError) return fail(err.message);
    return fail(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
