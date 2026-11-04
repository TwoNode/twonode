/**
 * Cheap checks on the public contact form that a script tends to fail and a
 * person does not (I-057). They are a first layer only: a patient script can
 * wait and leave a field empty, so the rate limits in the route and the
 * fixed-text confirmation mail carry the real weight.
 */

/** A person cannot read and fill four fields faster than this. The script seen on 2026-11-02 submitted 1.7 to 2.3 seconds after loading the page. */
export const MIN_FILL_TIME_MS = 3000;

/** A page left open for a day is not a fill time worth trusting, and a huge number is a forged one. */
export const MAX_FILL_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * What the form reports as its fill time: the milliseconds since the page
 * opened, held at the largest value the server accepts. A visitor who left the
 * tab open for more than a day is still a person, and without the cap the
 * server called their time forged and every retry failed until they reloaded.
 * `openedAt` is 0 until the form has mounted, which reports 0 (too fast) rather
 * than a time since 1970.
 */
export function fillTimeSince(
  openedAt: number,
  now: number = Date.now()
): number {
  if (!openedAt) return 0;
  return Math.min(Math.max(now - openedAt, 0), MAX_FILL_TIME_MS);
}

/** The `action` set on the contact form's Turnstile widget; a token is accepted only if it was minted for it. */
export const CONTACT_TURNSTILE_ACTION = "contact";

export type ContactGuardResult = "ok" | "honeypot" | "too-fast";

/**
 * - `honeypot`: the hidden field was filled. Only a script does that; the
 *   route answers as if it worked so the script learns nothing.
 * - `too-fast`: missing, too short or impossible fill time. The route tells
 *   the sender to try again, because a real person with autofill can land here.
 */
export function checkContactGuard(input: {
  fax?: string;
  fillTimeMs?: number;
}): ContactGuardResult {
  if (input.fax && input.fax.trim() !== "") return "honeypot";
  const t = input.fillTimeMs;
  if (typeof t !== "number" || !Number.isFinite(t)) return "too-fast";
  if (t < MIN_FILL_TIME_MS || t > MAX_FILL_TIME_MS) return "too-fast";
  return "ok";
}
