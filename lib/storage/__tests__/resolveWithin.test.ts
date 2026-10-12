import { describe, it, expect } from "vitest";
import path from "path";
import { resolveWithin } from "../utils";

const base = path.join(path.sep, "srv", "uploads");

describe("resolveWithin", () => {
  it("resolves a normal key under the base folder", () => {
    expect(resolveWithin(base, "surfboard/u1/pdf/a.pdf")).toBe(
      path.join(base, "surfboard", "u1", "pdf", "a.pdf")
    );
  });
  it("refuses keys that climb out of the base folder", () => {
    expect(() => resolveWithin(base, "../etc/passwd")).toThrow(
      "Invalid storage key"
    );
    expect(() => resolveWithin(base, "a/../../b")).toThrow(
      "Invalid storage key"
    );
  });
  it("refuses absolute keys that point elsewhere", () => {
    expect(() => resolveWithin(base, "/etc/passwd")).toThrow(
      "Invalid storage key"
    );
  });
  it("allows dot segments that stay inside", () => {
    expect(resolveWithin(base, "a/../b/c.txt")).toBe(
      path.join(base, "b", "c.txt")
    );
  });
});
