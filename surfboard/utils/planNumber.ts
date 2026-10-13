// One definition of "the same plan number" (I-024). Plan numbers are typed by
// hand, so the stored value keeps what was typed (certificates print it) and
// every comparison, lookup and file key goes through these functions.

/**
 * The canonical form: trimmed, upper case, runs of spaces collapsed, trailing
 * `_` and `.` dropped. `/` and `-` are kept, because `D/012` and `D012` can be
 * different plans.
 */
export function normalizePlanNumber(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[_.\s]+$/, "");
}

/** True when two typed plan numbers mean the same plan. Empty never matches. */
export function samePlanNumber(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = normalizePlanNumber(a);
  return left !== "" && left === normalizePlanNumber(b);
}

/** The canonical plan number as one safe file-name segment (`/` becomes `_`). */
export function planNumberToKeySegment(
  value: string | null | undefined
): string {
  return normalizePlanNumber(value).replace(/\//g, "_").replace(/\s/g, "-");
}
