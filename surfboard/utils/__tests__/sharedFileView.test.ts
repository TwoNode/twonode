import { describe, expect, it } from "vitest";
import {
  isRecipientKind,
  markGrid,
  pageScale,
  PAGE_MAX_SIDE,
  PAGE_MIN_SIDE,
  watermarkText,
} from "@/surfboard/utils/sharedFileView";

describe("watermarkText", () => {
  it("is Draft_ and the sharing surveyor's SURCON number", () => {
    expect(watermarkText("SURCON_A1B2C")).toBe("Draft_SURCON_A1B2C");
    expect(watermarkText("LS/1234/2020")).toBe("Draft_LS/1234/2020");
  });

  it("drops anything that is not a letter, a digit or _ - . /", () => {
    expect(watermarkText("SUR<script>CON 12")).toBe("Draft_SURscriptCON12");
    expect(watermarkText("a\nb\tc")).toBe("Draft_abc");
  });

  it("still marks the page when the surveyor has no number on file: never a clean page", () => {
    for (const none of [null, undefined, "", "   ", "<>"]) {
      expect(watermarkText(none)).toBe("Draft_SURCON");
    }
  });

  it("is short, however long the stored value is", () => {
    expect(watermarkText("A".repeat(500)).length).toBe("Draft_".length + 40);
  });
});

describe("pageScale", () => {
  it("leaves a page whose long side is already in range", () => {
    expect(pageScale(1600, 1200)).toBe(1);
  });

  it("makes a large page fit the longest side we send", () => {
    expect(pageScale(8000, 5000)).toBeCloseTo(PAGE_MAX_SIDE / 8000);
    expect(8000 * pageScale(8000, 5000)).toBeCloseTo(PAGE_MAX_SIDE);
  });

  it("scales a small page (a PDF page is 595 x 842 points) up to be readable", () => {
    expect(842 * pageScale(595, 842)).toBeCloseTo(PAGE_MIN_SIDE);
  });

  it("does not fail on nonsense sizes", () => {
    expect(pageScale(0, 0)).toBe(1);
    expect(pageScale(Number.NaN, 5)).toBe(1);
    expect(pageScale(-5, -5)).toBe(1);
  });
});

describe("markGrid", () => {
  it("covers the page, corners included, whatever the turn", () => {
    const marks = markGrid(1000, 1400, 300, 120);
    const reach = Math.hypot(1000, 1400) / 2;
    expect(Math.min(...marks.map((m) => m.x))).toBeLessThanOrEqual(-reach);
    expect(Math.max(...marks.map((m) => m.x))).toBeGreaterThanOrEqual(
      reach - 300
    );
    expect(Math.min(...marks.map((m) => m.y))).toBeLessThanOrEqual(-reach);
    expect(Math.max(...marks.map((m) => m.y))).toBeGreaterThanOrEqual(
      reach - 120
    );
  });

  it("staggers every other row by half a step", () => {
    const rows = new Map<number, number[]>();
    for (const m of markGrid(600, 600, 200, 100)) {
      rows.set(m.y, [...(rows.get(m.y) ?? []), m.x]);
    }
    const [first, second] = [...rows.values()];
    expect(Math.abs((second[0] - first[0]) % 200)).toBe(100);
  });

  it("makes nothing for a page or a step that is not a size", () => {
    expect(markGrid(0, 100, 10, 10)).toEqual([]);
    expect(markGrid(100, 100, 0, 10)).toEqual([]);
    expect(markGrid(100, 100, 10, -1)).toEqual([]);
  });
});

describe("isRecipientKind", () => {
  it("allows the survey plan and the Certificate only", () => {
    expect(isRecipientKind("SURVEY_PLAN")).toBe(true);
    expect(isRecipientKind("CERTIFICATE")).toBe(true);
    expect(isRecipientKind("DRAWING")).toBe(false);
    expect(isRecipientKind("RECORD_COPY")).toBe(false);
    expect(isRecipientKind("")).toBe(false);
  });
});
