import { RedmineError } from "./errors.js";

export function encodeSegment(value: string | number): string {
  return encodeURIComponent(String(value));
}

const IDENTIFIER = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;

export function safeProjectId(id: string | number): string {
  const raw = String(id).trim();
  if (/^\d+$/.test(raw) || IDENTIFIER.test(raw)) {
    return encodeSegment(raw);
  }
  throw new RedmineError(
    0,
    `Invalid project id "${raw}". Use a numeric id or an identifier (letters, digits, - and _).`
  );
}
