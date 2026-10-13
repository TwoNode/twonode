import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  pdfPageScale,
  stepZoom,
  wrapIndex,
} from "../viewerMath";

describe("wrapIndex", () => {
  it("wraps both ways", () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(1, 3)).toBe(1);
    expect(wrapIndex(5, 0)).toBe(0);
  });
});

describe("zoom", () => {
  it("clamps and steps", () => {
    expect(clampZoom(10)).toBe(MAX_ZOOM);
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(NaN)).toBe(1);
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });
});

describe("pdfPageScale", () => {
  it("fits the page to the width and renders sharper on dense screens", () => {
    const r = pdfPageScale({
      pageWidth: 600,
      pageHeight: 800,
      cssWidth: 300,
      devicePixelRatio: 2,
    });
    expect(r.cssHeight).toBe(400);
    expect(r.canvasScale).toBeCloseTo(1, 5);
  });
  it("never goes past the canvas size limit (a huge survey sheet)", () => {
    const r = pdfPageScale({
      pageWidth: 3370,
      pageHeight: 2384,
      cssWidth: 3000,
      devicePixelRatio: 3,
      maxPixels: 16_000_000,
    });
    const pixels = 3370 * r.canvasScale * 2384 * r.canvasScale;
    expect(pixels).toBeLessThanOrEqual(16_000_001);
  });
  it("handles an empty page without dividing by zero", () => {
    expect(
      pdfPageScale({
        pageWidth: 0,
        pageHeight: 0,
        cssWidth: 300,
        devicePixelRatio: 1,
      })
    ).toEqual({ canvasScale: 1, cssHeight: 0 });
  });
});

describe("fitPageWidth", () => {
  it("keeps the full width when the page fits the height", async () => {
    const { fitPageWidth } = await import("../viewerMath");
    expect(fitPageWidth({ width: 1224, height: 2000, aspect: 1.414 })).toBe(1200);
  });
  it("narrows the page so its height fits", async () => {
    const { fitPageWidth } = await import("../viewerMath");
    expect(fitPageWidth({ width: 1224, height: 624, aspect: 1.5 })).toBe(400);
  });
  it("falls back to the width before the size is known", async () => {
    const { fitPageWidth } = await import("../viewerMath");
    expect(fitPageWidth({ width: 500, height: 0, aspect: 0 })).toBe(476);
  });
});
