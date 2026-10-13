export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.25;

/** Next or previous item in a group, wrapping at both ends. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

/**
 * The page width that fits a whole page in the viewing area: the full width
 * when the page is wide enough to fit, else narrower so the height fits too.
 * `aspect` is page height divided by page width.
 */
export function fitPageWidth(input: {
  width: number;
  height: number;
  aspect: number;
  padding?: number;
}): number {
  const { width, height, aspect } = input;
  const padding = input.padding ?? 24;
  const availableWidth = Math.max(0, width - padding);
  if (!(aspect > 0) || height <= 0) return availableWidth;
  const availableHeight = Math.max(0, height - padding);
  return Math.min(availableWidth, availableHeight / aspect);
}

/** iOS Safari refuses canvases bigger than about 16.7 million pixels. */
export const MAX_CANVAS_PIXELS = 16_000_000;

/**
 * How big to draw one PDF page: the width it should have on screen, and the
 * scale to render the canvas at (sharper on dense screens, but never past the
 * canvas size limit).
 */
export function pdfPageScale(input: {
  pageWidth: number;
  pageHeight: number;
  cssWidth: number;
  devicePixelRatio: number;
  maxPixels?: number;
}): { canvasScale: number; cssHeight: number } {
  const { pageWidth, pageHeight, cssWidth } = input;
  const maxPixels = input.maxPixels ?? MAX_CANVAS_PIXELS;
  const dpr = Math.min(Math.max(input.devicePixelRatio || 1, 1), 3);
  if (pageWidth <= 0 || pageHeight <= 0 || cssWidth <= 0) {
    return { canvasScale: 1, cssHeight: 0 };
  }
  const fit = cssWidth / pageWidth;
  let canvasScale = fit * dpr;
  const pixels = pageWidth * canvasScale * pageHeight * canvasScale;
  if (pixels > maxPixels) canvasScale *= Math.sqrt(maxPixels / pixels);
  return { canvasScale, cssHeight: pageHeight * fit };
}
