import { describe, it, expect } from "vitest";
import { requireBody } from "../build/tools/helpers.js";
import { RedmineError } from "../build/redmine/errors.js";

describe("requireBody", () => {
  it("returns the body when present", () => {
    const body = { issue: { id: 1 } };
    expect(requireBody(body, "missing")).toBe(body);
  });

  it("throws a RedmineError when the body is null", () => {
    expect(() => requireBody(null, "Redmine returned nothing")).toThrow(RedmineError);
    expect(() => requireBody(null, "Redmine returned nothing")).toThrow("Redmine returned nothing");
  });
});
