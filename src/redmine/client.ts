import { VERSION } from "../version.js";
import type { RedmineConfig } from "../config.js";
import { RedmineError, normalizeHttpError } from "./errors.js";

export type QueryValue = string | number | undefined;
export type QueryParams = Record<string, QueryValue>;

type Method = "GET" | "POST" | "PUT";

const MAX_RESPONSE_BYTES = 5_000_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const backoffMs = (attempt: number): number => 300 * 2 ** attempt;

export class RedmineClient {
  private readonly origin: string;

  constructor(private readonly config: RedmineConfig) {
    this.origin = new URL(config.baseUrl).origin;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async get<T>(path: string, query: QueryParams = {}): Promise<T> {
    return (await this.request<T>("GET", path, query, undefined)) as T;
  }

  post<T>(path: string, body: unknown): Promise<T | null> {
    return this.request<T>("POST", path, {}, body);
  }

  put<T>(path: string, body: unknown): Promise<T | null> {
    return this.request<T>("PUT", path, {}, body);
  }

  private redact(text: string): string {
    return text.split(this.config.apiKey).join("***");
  }

  private buildUrl(path: string, query: QueryParams): URL {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (url.origin !== this.origin) {
      throw new RedmineError(0, "Refusing to call a URL outside the configured Redmine host.");
    }
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url;
  }

  private headers(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Redmine-API-Key": this.config.apiKey,
      Accept: "application/json",
      "User-Agent": `redmine-mcp-stdio/${VERSION}`,
    };
    if (hasBody) headers["Content-Type"] = "application/json";
    return headers;
  }

  private async parse<T>(res: Response): Promise<T | null> {
    if (res.status === 204) return null;

    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
      throw new RedmineError(0, "Redmine response is too large to process.");
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new RedmineError(0, "Redmine response is too large to process.");
    }
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new RedmineError(
        0,
        "Redmine returned a non-JSON response. Check that REDMINE_URL points at the Redmine API, not a login or proxy page."
      );
    }
  }

  private async request<T>(
    method: Method,
    path: string,
    query: QueryParams,
    body: unknown
  ): Promise<T | null> {
    const url = this.buildUrl(path, query);
    const hasBody = body !== undefined;
    const init: RequestInit = {
      method,
      headers: this.headers(hasBody),
      body: hasBody ? JSON.stringify(body) : undefined,
    };

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });

        if (res.ok) return await this.parse<T>(res);

        if ((res.status === 429 || res.status >= 500) && attempt < this.config.maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        const rawBody = await res.text();
        throw normalizeHttpError(res.status, rawBody, (t) => this.redact(t));
      } catch (err) {
        if (err instanceof RedmineError) throw err;
        if (attempt < this.config.maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw new RedmineError(0, `Redmine request timed out after ${this.config.timeoutMs}ms.`);
        }
        const reason = err instanceof Error ? err.message : String(err);
        throw new RedmineError(0, `Network error contacting Redmine: ${this.redact(reason)}`);
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
