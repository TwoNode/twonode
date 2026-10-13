import { planNumberToKeySegment } from "./planNumber";

/**
 * The name a plan file is shown and downloaded under: the plan number with `/`
 * as `_` in capitals, then `_2`, `_3` for further files of the same kind. The
 * extension comes from the stored file. Stored names (timestamps, random
 * strings) are never shown. Falls back to the stored name when the plan has no
 * number.
 */
export function planFileDisplayName(input: {
  planNumber: string | null | undefined;
  filePath: string;
  /** Position among the plan's files of this kind (0 = first). */
  index?: number;
}): string {
  const stored = input.filePath.split(/[?#]/)[0].split("/").pop() || "";
  const dot = stored.lastIndexOf(".");
  const ext = dot > 0 ? stored.slice(dot).toLowerCase() : "";
  const base = planNumberToKeySegment(input.planNumber);
  if (!base) return stored;
  const n = (input.index ?? 0) + 1;
  return `${base}${n > 1 ? `_${n}` : ""}${ext}`;
}
