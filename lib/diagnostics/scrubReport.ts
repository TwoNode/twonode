/**
 * The server scrubs a crash report's text again before it is stored or logged (ADR-0014): the app
 * scrubs first, but the server never trusts it. A report is meant to carry words and counts only, so
 * anything that looks like a person, a plan, a place or a credential is replaced by "…".
 *
 * Pure functions, no I/O. Replacing never lengthens a string, so the field limits still hold after.
 */

const ELLIPSIS = "…";

// Order matters: a URL can hold an email or a token, so the wider shapes go first.
const PATTERNS: RegExp[] = [
  // A URL with a query string (the query is where ids and tokens live).
  /https?:\/\/[^\s?#]+\?\S*/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  // A JWT: three base64url parts, the first of which is a JSON header ("eyJ" is `{"`).
  /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  /[^\s@<>()[\]{},;:"']+@[^\s@<>()[\]{},;:"']+\.[^\s@<>()[\]{},;:"']+/g,
  // A coordinate: a decimal with four or more places.
  /-?\d+\.\d{4,}/g,
  // A phone number, an account number, any long run of digits.
  /\d{7,}/g,
];

// Control characters (C0, DEL, C1) and the Unicode line/paragraph separators.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

/** Drops a lone high surrogate a cut may have left at the end. */
function cut(text: string, limit: number): string {
  if (text.length <= limit) return text;
  let out = text.slice(0, limit);
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  return out;
}

/** One string, scrubbed and cut to `limit` characters. Never throws. */
export function scrubReportText(input: unknown, limit: number): string {
  if (typeof input !== "string") return "";
  let text = input.replace(CONTROL, " ");
  for (const pattern of PATTERNS) text = text.replace(pattern, ELLIPSIS);
  return cut(text.replace(/\s{2,}/g, " ").trim(), limit);
}

/** Like `scrubReportText`, for a field that may be absent: absent stays absent, an emptied one too. */
export function scrubOptional(
  input: string | undefined,
  limit: number
): string | null {
  if (input === undefined) return null;
  return scrubReportText(input, limit);
}
