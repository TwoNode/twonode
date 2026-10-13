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

/**
 * Prisma `where` clauses that match a search term against a plan's number: as
 * typed (any case), and by canonical key, so `abc/1/la_` finds `ABC/1/LA`.
 * `planNumberKey` is empty until the backfill has run, so the typed match stays.
 */
export function planNumberSearchClauses(
  term: string
): Array<Record<string, unknown>> {
  const clauses: Array<Record<string, unknown>> = [
    { planNumber: { contains: term, mode: "insensitive" } },
  ];
  const key = normalizePlanNumber(term);
  if (key) clauses.push({ planNumberKey: { contains: key } });
  return clauses;
}

