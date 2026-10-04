import { NextRequest } from "next/server";

export function validateCSRF(req: NextRequest): boolean {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    // Sandboxed iframes and some redirects send the literal string
    // "Origin: null", which isn't a parseable URL — reject it rather than
    // letting new URL() throw into a 500.
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Fallback to Referer if Origin header is missing
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // Reject mutating requests missing both headers
  return false;
}
