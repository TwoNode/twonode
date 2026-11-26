import { describe, expect, it } from "vitest";
import { scrubOptional, scrubReportText } from "@/lib/diagnostics/scrubReport";

describe("scrubReportText", () => {
  it.each([
    ["a UUID", "plan 3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c opened"],
    ["an email", "signed in as someone.name+tag@example.co.uk now"],
    ["a phone number", "call +2348031234567 now"],
    ["a long run of digits", "account 0123456789 failed"],
    ["a latitude", "at 6.44061 and 3.47061"],
    ["a JWT", "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.c2lnbmF0dXJl x"],
    ["a Bearer token", "header Bearer abc.def-ghi_123== sent"],
    [
      "a URL with a query",
      "GET https://api.example.com/plans?id=42&token=secret failed",
    ],
  ])("replaces %s", (_name, text) => {
    const out = scrubReportText(text, 200);
    expect(out).toContain("…");
    expect(out).not.toMatch(
      /3f2b8c1e|someone\.name|8031234567|0123456789|6\.44061|3\.47061|eyJ|abc\.def|token=secret|id=42/
    );
  });

  it("keeps words and small numbers: zoom levels, counts and times", () => {
    const text = "13:51:54.123 map tap, zoom 18.4, found 5 plans";
    expect(scrubReportText(text, 200)).toBe(text);
  });

  it("keeps a URL without a query", () => {
    expect(scrubReportText("see https://example.com/privacy", 200)).toBe(
      "see https://example.com/privacy"
    );
  });

  it("turns control characters and line breaks into single spaces", () => {
    expect(scrubReportText("a\nb\r\nc\u0000d e\u009ff", 200)).toBe(
      "a b c d e f"
    );
  });

  it("cuts to the limit, and never leaves half of an emoji", () => {
    expect(scrubReportText("x".repeat(300), 90)).toHaveLength(90);
    const cut = scrubReportText("ab😀cd", 3); // the emoji is two code units: it would be split
    expect(cut).toBe("ab");
  });

  it("does not throw on odd Unicode, a lone surrogate, or something that is not a string", () => {
    expect(() => scrubReportText("\ud800 𝒳 ‮", 50)).not.toThrow();
    expect(scrubReportText(undefined, 10)).toBe("");
    expect(scrubReportText(42, 10)).toBe("");
    expect(scrubReportText(null, 10)).toBe("");
  });

  it("never makes a string longer", () => {
    const text = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c a@b.co 6.123456";
    expect(scrubReportText(text, 500).length).toBeLessThanOrEqual(text.length);
  });
});

describe("scrubOptional", () => {
  it("keeps absent as null and scrubs what is there", () => {
    expect(scrubOptional(undefined, 10)).toBeNull();
    expect(scrubOptional("a@b.co", 10)).toBe("…");
  });
});
