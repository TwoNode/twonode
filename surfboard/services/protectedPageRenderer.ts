import fs from "node:fs";
import path from "node:path";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/observability/logger";
import {
  markGrid,
  pageScale,
  PAGE_MAX_SIDE,
} from "@/surfboard/utils/sharedFileView";

/**
 * Turns one page of a survey plan or Certificate into a watermarked JPEG for a person the plan was
 * shared with (TASK-0015 in the app repo). The page is drawn on a canvas, the words `Draft_{SURCON}`
 * are drawn over the whole of it, and only the picture leaves the server: the original file is never
 * sent, so the watermark is part of the pixels and cannot be edited out of a PDF.
 *
 * If the watermark cannot be drawn (the font is missing, the canvas will not load) this throws: a
 * recipient is never given a clean page.
 */

const FONT_FAMILY = "SurfboardWatermark";
const FONT_FILE = path.join(
  process.cwd(),
  "public",
  "fonts",
  "BricolageGrotesque-Bold.ttf"
);
const JPEG_QUALITY = 78;

/** More pages than any survey plan or Certificate has; a longer file is refused, not rendered. */
export const MAX_PAGES = 100;

type CanvasLib = typeof import("@napi-rs/canvas");
let loaded: CanvasLib | null = null;

async function canvasLib(): Promise<CanvasLib> {
  if (loaded) return loaded;
  const lib = await import("@napi-rs/canvas");
  // pdfjs draws with these three: they must be the canvas package's own, or a path fill is refused.
  const scope = globalThis as unknown as Record<string, unknown>;
  scope.DOMMatrix ??= lib.DOMMatrix;
  scope.Path2D ??= lib.Path2D;
  scope.ImageData ??= lib.ImageData;
  if (
    !fs.existsSync(FONT_FILE) ||
    !lib.GlobalFonts.registerFromPath(FONT_FILE, FONT_FAMILY)
  ) {
    throw new Error("Watermark font could not be loaded");
  }
  loaded = lib;
  return lib;
}

/** What pdfjs needs from a canvas factory, made from the canvas package. */
function canvasFactory(lib: CanvasLib) {
  return class Factory {
    create(width: number, height: number) {
      const canvas = lib.createCanvas(width, height);
      return { canvas, context: canvas.getContext("2d") };
    }
    reset(
      target: { canvas: { width: number; height: number } },
      width: number,
      height: number
    ) {
      target.canvas.width = width;
      target.canvas.height = height;
    }
    destroy(target: {
      canvas: { width: number; height: number } | null;
      context: unknown;
    }) {
      if (target.canvas) {
        target.canvas.width = 0;
        target.canvas.height = 0;
      }
      target.canvas = null;
      target.context = null;
    }
  };
}

/**
 * pdfjs's standard font files (Foxit and Liberation, with their licences), kept in `public/pdfjs/` and
 * traced for the two page routes in `next.config.mjs`: a PDF may use a font it does not embed, and
 * without these files pdfjs draws that text as nothing at all (no error). They are NOT read from
 * node_modules: a glob through pnpm's links there broke a deploy once (docs/DEPLOYMENT.md).
 */
export const STANDARD_FONTS_DIR = path.join(
  process.cwd(),
  "public",
  "pdfjs",
  "standard_fonts"
);

function standardFonts(): string {
  return `${STANDARD_FONTS_DIR}${path.sep}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function openPdf(bytes: Uint8Array): Promise<any> {
  const lib = await canvasLib();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs looks for its worker file by a path it builds at run time, which is not in the deployed
  // bundle ("Setting up fake worker failed"). Importing the worker here puts it in the bundle, and
  // handing it over as a global is what pdfjs's own "fake worker" reads first (as `pdfUtils.ts` does).
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const scope = globalThis as unknown as Record<string, unknown>;
  scope.pdfjsWorker ??= worker;
  const task = pdfjs.getDocument({
    // pdfjs takes ownership of the buffer it is given, so it is given a copy.
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    standardFontDataUrl: standardFonts(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CanvasFactory: canvasFactory(lib) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  try {
    return await task.promise;
  } catch (error) {
    // What went wrong is logged (never the file or who asked); the caller gets the same words.
    logger.error("protected file: the PDF could not be opened", {}, error);
    throw new ApiError(422, "FILE_NOT_VIEWABLE", "This file can't be opened");
  }
}

const isPdf = (format: string) => format === "pdf";

/** How many pages the file has: a PDF's own count, 1 for a picture. */
export async function countPages(
  bytes: Uint8Array,
  format: string
): Promise<number> {
  if (!isPdf(format)) return 1;
  const doc = await openPdf(bytes);
  try {
    return doc.numPages as number;
  } finally {
    await doc.destroy();
  }
}

type Context = import("@napi-rs/canvas").SKRSContext2D;

/** The watermark words over the whole picture, turned about 30 degrees up to the right. */
function drawWatermark(
  ctx: Context,
  width: number,
  height: number,
  text: string
) {
  const size = Math.max(18, Math.round(Math.max(width, height) / 28));
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = `bold ${size}px ${FONT_FAMILY}`;
  ctx.fillStyle = "rgba(90, 90, 90, 0.30)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const stepX = Math.ceil(ctx.measureText(text).width * 1.25);
  const stepY = Math.ceil(size * 4.2);
  for (const { x, y } of markGrid(width, height, stepX, stepY)) {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

/**
 * One page as a watermarked JPEG (`page` counts from 1). The long side is at most `PAGE_MAX_SIDE`
 * pixels, so a picture stays well under a serverless response limit and still shows small print
 * when zoomed.
 */
export async function renderPage(
  bytes: Uint8Array,
  format: string,
  page: number,
  watermark: string
): Promise<Buffer> {
  const lib = await canvasLib();

  if (!isPdf(format)) {
    if (page !== 1) throw new ApiError(404, "NOT_FOUND", "Page not found");
    let image;
    try {
      image = await lib.loadImage(Buffer.from(bytes));
    } catch (error) {
      logger.error("protected file: the picture could not be read", {}, error);
      throw new ApiError(422, "FILE_NOT_VIEWABLE", "This file can't be opened");
    }
    // A picture is only ever made smaller (a tiny photo is not blown up).
    const scale = Math.min(1, pageScale(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = lib.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    drawWatermark(ctx, width, height, watermark);
    return canvas.encode("jpeg", JPEG_QUALITY);
  }

  const doc = await openPdf(bytes);
  try {
    if (!Number.isInteger(page) || page < 1 || page > doc.numPages) {
      throw new ApiError(404, "NOT_FOUND", "Page not found");
    }
    const pdfPage = await doc.getPage(page);
    const base = pdfPage.getViewport({ scale: 1 });
    const viewport = pdfPage.getViewport({
      scale: pageScale(base.width, base.height),
    });
    const width = Math.min(PAGE_MAX_SIDE * 2, Math.ceil(viewport.width));
    const height = Math.min(PAGE_MAX_SIDE * 2, Math.ceil(viewport.height));
    const canvas = lib.createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    try {
      await pdfPage.render({ canvasContext: ctx, viewport, canvas: null })
        .promise;
    } catch (error) {
      logger.error(
        "protected file: a page could not be drawn",
        { page },
        error
      );
      throw new ApiError(422, "FILE_NOT_VIEWABLE", "This file can't be opened");
    }
    drawWatermark(ctx, width, height, watermark);
    return canvas.encode("jpeg", JPEG_QUALITY);
  } finally {
    await doc.destroy();
  }
}
