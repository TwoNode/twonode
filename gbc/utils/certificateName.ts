import widthTable from "@/gbc/pdf-worker/name-widths.json";

/**
 * Fits a holder's name on the certificate. The PDF worker
 * (gbc/pdf-worker/certificate.render.cjs) carries a CommonJS copy of this
 * function and reads the same width table, so the page and the PDF break and
 * size a name identically. Change them together.
 *
 * Widths are the real advance widths of the certificate's name font
 * (Bricolage Grotesque ExtraBold), in em, so the size is calculated from the
 * text and not guessed from its length.
 */
export const NAME_MAX_WIDTH_PT = 640; // inside the border and the name's side padding
export const NAME_MAX_SIZE = 34;
export const NAME_TWO_LINE_MAX_SIZE = 28;
export const NAME_MIN_ONE_LINE_SIZE = 22;
export const NAME_MIN_SIZE = 12;

const widths = widthTable.widths as Record<string, number>;
const FALLBACK = widthTable.fallback;

export function nameWidthEm(text: string): number {
  let total = 0;
  for (const ch of text) total += widths[ch] ?? FALLBACK;
  return total;
}

const floorHalf = (n: number) => Math.floor(n * 2) / 2;

export type NameFit = { size: number; lines: string[] };

export function fitName(rawName: string): NameFit {
  // Collapse whitespace and close up stray spaces inside brackets, so a break
  // can never leave a lone "(" at the end of a line.
  const name = (rawName || "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
  const em = nameWidthEm(name);
  if (!em) return { size: NAME_MAX_SIZE, lines: [name] };

  const oneLine = NAME_MAX_WIDTH_PT / em;
  if (oneLine >= NAME_MIN_ONE_LINE_SIZE) {
    return { size: floorHalf(Math.min(NAME_MAX_SIZE, oneLine)), lines: [name] };
  }

  // Too long for one line at a readable size: split at the word break that
  // makes the two lines most even.
  const words = name.split(" ");
  let best: { lines: string[]; widest: number } | null = null;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const widest = Math.max(...lines.map(nameWidthEm));
    if (!best || widest < best.widest) best = { lines, widest };
  }
  if (best) {
    const size = NAME_MAX_WIDTH_PT / best.widest;
    return {
      size: floorHalf(
        Math.max(NAME_MIN_SIZE, Math.min(NAME_TWO_LINE_MAX_SIZE, size))
      ),
      lines: best.lines,
    };
  }
  // One very long word with no break point: shrink it to fit.
  return {
    size: floorHalf(Math.max(NAME_MIN_SIZE, oneLine)),
    lines: [name],
  };
}
