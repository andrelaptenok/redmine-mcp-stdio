import { describe, it, expect } from "vitest";
import { loadConfig } from "../build/config.js";
import { ConfigError } from "../build/redmine/errors.js";

const base = { REDMINE_URL: "https://redmine.example.com", REDMINE_API_KEY: "key" };

describe("loadConfig", () => {
  it("returns a normalized config with defaults", () => {
    const cfg = loadConfig({ ...base });
    expect(cfg.baseUrl).toBe("https://redmine.example.com");
    expect(cfg.apiKey).toBe("key");
    expect(cfg.timeoutMs).toBe(10_000);
    expect(cfg.maxRetries).toBe(2);
  });

  it("strips trailing slashes from the URL", () => {
    expect(loadConfig({ ...base, REDMINE_URL: "https://x.test///" }).baseUrl).toBe(
      "https://x.test"
    );
  });

  it("coerces numeric tuning knobs from strings", () => {
    const cfg = loadConfig({ ...base, REDMINE_TIMEOUT_MS: "5000", REDMINE_MAX_RETRIES: "0" });
    expect(cfg.timeoutMs).toBe(5000);
    expect(cfg.maxRetries).toBe(0);
  });

  it("rejects a missing key", () => {
    expect(() => loadConfig({ REDMINE_URL: base.REDMINE_URL })).toThrow(ConfigError);
  });

  it("rejects a non-http(s) URL", () => {
    expect(() => loadConfig({ ...base, REDMINE_URL: "ftp://x.test" })).toThrow(/http/);
  });

  it("rejects a malformed URL", () => {
    expect(() => loadConfig({ ...base, REDMINE_URL: "not a url" })).toThrow(ConfigError);
  });
});
