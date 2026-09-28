import { cookies } from "next/headers";

export const GBC_EDITION_COOKIE = "gbc-admin-edition";

/**
 * Server-side read of the navbar GBCEditionSwitcher's last selection
 * (gbc/components/admin/GBCEditionSwitcher.tsx writes this cookie on
 * change, alongside the `?edition=` query param it updates on whatever
 * page it's rendered on). Used as the fallback default on pages reached by
 * a plain sidebar link — those links don't carry query params, so without
 * this the navbar's selection was effectively page-local, not global.
 *
 * A page's own explicit `?edition=` (its own local filter, when it has
 * one) always takes precedence over this when present — callers should
 * only fall back to this value when their own searchParams.edition is
 * absent, e.g. `firstParam(raw.edition) || (await getEditionCookieValue()) || "all"`.
 * That's what makes a per-page override work: changing a page's own local
 * filter never touches this cookie, so it only affects that page.
 *
 * Normalizes the "all editions" sentinel to `undefined` — every consuming
 * page already has its own "no filter" representation (some use the
 * literal string "all", some "ALL", some plain `undefined`), and passing
 * the raw string "all" straight into a `where.edition = "all"` filter
 * would silently match zero rows instead of meaning "don't filter".
 * Callers fold this `undefined` back into their own convention via their
 * existing `|| "all"` / `|| "ALL"` fallback.
 */
export async function getEditionCookieValue(): Promise<string | undefined> {
  const store = await cookies();
  const value = store.get(GBC_EDITION_COOKIE)?.value;
  if (!value || value.toLowerCase() === "all") return undefined;
  return value;
}
