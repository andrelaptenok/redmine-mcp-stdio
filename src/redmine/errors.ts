export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class RedmineError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RedmineError";
  }
}

function extractDetail(rawBody: string): string {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (
      parsed &&
      typeof parsed === "object" &&
      "errors" in parsed &&
      Array.isArray((parsed as { errors: unknown }).errors)
    ) {
      return (parsed as { errors: unknown[] }).errors.map(String).join("; ");
    }
  } catch {
    return rawBody;
  }
  return rawBody;
}

export function normalizeHttpError(
  status: number,
  rawBody: string,
  redact: (text: string) => string
): RedmineError {
  const detail = redact(extractDetail(rawBody)).slice(0, 500);
  switch (status) {
    case 401:
    case 403:
      return new RedmineError(
        status,
        `Redmine ${status}: authentication or permission failed. Check your API key and that its user is allowed to do this.`
      );
    case 404:
      return new RedmineError(status, "Redmine 404: issue or project not found.");
    case 422:
      return new RedmineError(status, `Redmine 422 (validation): ${detail}`);
    default:
      return new RedmineError(status, `Redmine ${status}: ${detail}`);
  }
}
