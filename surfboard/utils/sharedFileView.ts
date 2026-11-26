/**
 * What a person a plan was shared with may open, and how (TASK-0015 in the app repo, decisions D1 to
 * D5 of 2026-11-25). Pure: no database, no storage, no canvas, so the rules are tested on their own.
 *
 * The survey plan(s) and the Certificate open only as **watermarked page pictures** that carry the
 * sharing surveyor's SURCON number (`Draft_{SURCON No}`); the original file is never handed to a
 * recipient. Drawings (CAD) and the record copy are not opened by a recipient at all.
 */

export const WATERMARK_PREFIX = "Draft_";

/** Nothing longer than this goes into the watermark: a SURCON number is short. */
const WATERMARK_MAX = 40;

/**
 * The words burned into each page: `Draft_` and the sharing surveyor's SURCON registration number.
 * The number is the surveyor's own and is already a plain code; anything that is not a letter, a
 * digit or one of `_ - . /` is dropped, so a stored value can never put odd characters in the picture.
 * A surveyor with no number on file still gets a mark (`Draft_SURCON`), never a clean page.
 */
export function watermarkText(
  surconRegNumber: string | null | undefined
): string {
  const clean = (surconRegNumber ?? "")
    .replace(/[^A-Za-z0-9_\-./]/g, "")
    .slice(0, WATERMARK_MAX);
  return `${WATERMARK_PREFIX}${clean || "SURCON"}`;
}

/**
 * The longest side, in pixels, of a page picture sent to a phone. Big enough to read the small print
 * of a survey plan when zoomed in; small enough that one JPEG stays far under a serverless response
 * limit (about 4.5 MB).
 */
export const PAGE_MAX_SIDE = 2400;

/** Below this a page would be unreadable, so a tiny PDF page is scaled up to at least this side. */
export const PAGE_MIN_SIDE = 1400;

/** The factor that takes a page of `width` x `height` (any unit) to a picture whose long side is in range. */
export function pageScale(width: number, height: number): number {
  const longSide = Math.max(width, height);
  if (!(longSide > 0) || !Number.isFinite(longSide)) return 1;
  if (longSide > PAGE_MAX_SIDE) return PAGE_MAX_SIDE / longSide;
  if (longSide < PAGE_MIN_SIDE) return PAGE_MIN_SIDE / longSide;
  return 1;
}

export type MarkPlace = { x: number; y: number };

/**
 * Where the watermark words go on a `width` x `height` picture: a staggered grid that covers the whole
 * page, in the coordinates of a canvas that has been moved to the page's centre and turned (the
 * caller draws each mark centred there). `stepX` and `stepY` are the gaps between marks; the grid
 * reaches past the corners by the page's diagonal, so turning it leaves no bare corner.
 */
export function markGrid(
  width: number,
  height: number,
  stepX: number,
  stepY: number
): MarkPlace[] {
  if (!(width > 0 && height > 0 && stepX > 0 && stepY > 0)) return [];
  const reach = Math.ceil(Math.hypot(width, height) / 2) + stepX;
  const places: MarkPlace[] = [];
  let row = 0;
  for (let y = -reach; y <= reach; y += stepY, row += 1) {
    const shift = row % 2 === 0 ? 0 : stepX / 2;
    // One step before the edge, so the shifted rows reach the left side too.
    for (let x = -reach - stepX + shift; x <= reach; x += stepX) {
      places.push({ x, y });
    }
  }
  return places;
}

/** The files of a plan a recipient may open, by their kind. */
export const RECIPIENT_FILE_KINDS = ["SURVEY_PLAN", "CERTIFICATE"] as const;

export function isRecipientKind(kind: string): boolean {
  return (RECIPIENT_FILE_KINDS as readonly string[]).includes(kind);
}
