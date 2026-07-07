import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RedmineClient } from "../build/redmine/client.js";
import { RedmineError } from "../build/redmine/errors.js";
import type { RedmineConfig } from "../build/config.js";

const config: RedmineConfig = {
  baseUrl: "https://redmine.example.com",
  apiKey: "secret-key",
  timeoutMs: 10_000,
  maxRetries: 2,
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-length": "0" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => JSON.parse(body),
    text: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let client: RedmineClient;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  client = new RedmineClient(config);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request building", () => {
  it("sends the API key, JSON Accept and a User-Agent, with query params", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { issues: [], total_count: 0 }));
    await client.get("/issues.json", { project_id: "web", limit: 25 });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe("https://redmine.example.com/issues.json");
    expect(url.searchParams.get("project_id")).toBe("web");
    expect(url.searchParams.get("limit")).toBe("25");

    const headers = init.headers as Record<string, string>;
    expect(headers["X-Redmine-API-Key"]).toBe("secret-key");
    expect(headers["Accept"]).toBe("application/json");
    expect(headers["User-Agent"]).toMatch(/^redmine-mcp-stdio\//);
  });

  it("omits undefined query params", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    await client.get("/time_entries.json", { issue_id: undefined, limit: 10 });
    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.has("issue_id")).toBe(false);
    expect(url.searchParams.get("limit")).toBe("10");
  });
});

describe("error normalization", () => {
  it("parses a 422 body's errors array into a readable message", async () => {
    fetchMock.mockResolvedValueOnce(
      textResponse(
        422,
        JSON.stringify({ errors: ["Subject can't be blank", "Tracker is invalid"] })
      )
    );
    await expect(client.get("/issues.json")).rejects.toMatchObject({
      status: 422,
      message: "Redmine 422 (validation): Subject can't be blank; Tracker is invalid",
    });
  });

  it("maps 401 to an auth hint and 404 to not-found", async () => {
    fetchMock.mockResolvedValueOnce(textResponse(401, "nope"));
    const err = await client.get("/issues.json").catch((e) => e);
    expect(err).toBeInstanceOf(RedmineError);
    expect(err.message).toMatch(/authentication or permission/);

    fetchMock.mockResolvedValueOnce(textResponse(404, "nope"));
    await expect(client.get("/issues/999.json")).rejects.toMatchObject({ status: 404 });
  });
});

describe("retry on transient failures", () => {
  it("retries 5xx then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse(500, "boom"))
      .mockResolvedValueOnce(textResponse(503, "boom"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const res = await client.get<{ ok: boolean }>("/issues.json");
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after maxRetries and throws the last status", async () => {
    fetchMock.mockResolvedValue(textResponse(500, "boom"));
    await expect(client.get("/issues.json")).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});

describe("response parsing", () => {
  it("reports a non-JSON 2xx body clearly and does not retry it", async () => {
    fetchMock.mockResolvedValue(textResponse(200, "<html>login</html>"));
    const err = await client.get("/issues.json").catch((e) => e);
    expect(err).toBeInstanceOf(RedmineError);
    expect(err.message).toMatch(/non-JSON/i);
    expect(fetchMock).toHaveBeenCalledTimes(1); // deterministic failure, no retry
  });
});

describe("security", () => {
  it("never leaks the API key: it is redacted from error bodies", async () => {
    fetchMock.mockResolvedValueOnce(textResponse(400, "failure referencing secret-key inline"));
    const err = await client.get("/issues.json").catch((e) => e);
    expect(err.message).not.toContain("secret-key");
    expect(err.message).toContain("***");
  });
});
