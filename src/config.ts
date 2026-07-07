import { z } from "zod";
import { ConfigError } from "./redmine/errors.js";

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const EnvSchema = z.object({
  REDMINE_URL: z
    .string({ required_error: "REDMINE_URL is required" })
    .min(1, "REDMINE_URL is required")
    .refine(isHttpUrl, "REDMINE_URL must be a valid http(s) URL"),
  REDMINE_API_KEY: z
    .string({ required_error: "REDMINE_API_KEY is required" })
    .min(1, "REDMINE_API_KEY is required"),
  REDMINE_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(10_000),
  REDMINE_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(2),
});

export interface RedmineConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RedmineConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .filter((msg, i, all) => all.indexOf(msg) === i)
      .join("; ");
    throw new ConfigError(message);
  }

  const values = parsed.data;
  return {
    baseUrl: values.REDMINE_URL.replace(/\/+$/, ""),
    apiKey: values.REDMINE_API_KEY,
    timeoutMs: values.REDMINE_TIMEOUT_MS,
    maxRetries: values.REDMINE_MAX_RETRIES,
  };
}
