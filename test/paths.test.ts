import { describe, it, expect } from "vitest";
import { encodeSegment, safeProjectId } from "../build/redmine/paths.js";
import { RedmineError } from "../build/redmine/errors.js";

describe("encodeSegment", () => {
  it("percent-encodes slashes so a segment can't traverse the path", () => {
    expect(encodeSegment("../../admin")).toBe("..%2F..%2Fadmin");
    expect(encodeSegment(42)).toBe("42");
  });
});

describe("safeProjectId", () => {
  it("accepts numeric ids and identifier slugs", () => {
    expect(safeProjectId(15)).toBe("15");
    expect(safeProjectId("my-project_1")).toBe("my-project_1");
  });

  it("rejects values that could reshape the URL", () => {
    expect(() => safeProjectId("../secret")).toThrow(RedmineError);
    expect(() => safeProjectId("a/b")).toThrow(RedmineError);
    expect(() => safeProjectId("has space")).toThrow(RedmineError);
  });
});
