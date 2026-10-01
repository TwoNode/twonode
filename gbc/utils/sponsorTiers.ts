/**
 * Sponsor tiers: how a tier's key is derived from its name, and how sponsors
 * are grouped under tiers (public sponsors page and the admin list both use
 * this, so they cannot disagree about order).
 */

export const TIER_SIZES = ["FEATURED", "STANDARD", "COMPACT"] as const;
export type TierSize = (typeof TIER_SIZES)[number];

export const TIER_SIZE_LABELS: Record<TierSize, string> = {
  FEATURED: "Featured (large cards)",
  STANDARD: "Standard",
  COMPACT: "Compact (small logos)",
};

export interface SponsorTierLike {
  key: string;
  name: string;
  description?: string | null;
  size: string;
  order: number;
}

/**
 * The stable identifier for a tier, made once from its name: "Gold Partner" ->
 * "GOLD_PARTNER". Accents are dropped ("Café" -> "CAFE"), anything that isn't
 * a letter or digit becomes one underscore. Returns "" if nothing usable is
 * left (e.g. a name of only symbols).
 */
export function tierKeyFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
}

export function isTierSize(value: string): value is TierSize {
  return (TIER_SIZES as readonly string[]).includes(value);
}

/** Tiers in display order: `order` ascending, then name so equal orders are stable. */
export function sortTiers<T extends SponsorTierLike>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export interface TierGroup<S, T extends SponsorTierLike = SponsorTierLike> {
  tier: T;
  sponsors: S[];
}

/**
 * Sponsors under their tier, tiers in display order. Tiers with no sponsors
 * are left out unless `includeEmpty`. A sponsor whose tier is not in `tiers`
 * (should not happen — the database enforces it) still appears, under a
 * trailing group named after its key, rather than silently vanishing.
 */
export function groupSponsorsByTier<S extends { tier: string }, T extends SponsorTierLike>(
  tiers: T[],
  sponsors: S[],
  { includeEmpty = false }: { includeEmpty?: boolean } = {}
): TierGroup<S, T | SponsorTierLike>[] {
  const known = new Set(tiers.map((t) => t.key));
  const groups: TierGroup<S, T | SponsorTierLike>[] = sortTiers(tiers).map((tier) => ({
    tier,
    sponsors: sponsors.filter((s) => s.tier === tier.key),
  }));

  const orphanKeys = [...new Set(sponsors.filter((s) => !known.has(s.tier)).map((s) => s.tier))];
  for (const key of orphanKeys) {
    groups.push({
      tier: { key, name: key, size: "STANDARD", order: Number.MAX_SAFE_INTEGER },
      sponsors: sponsors.filter((s) => s.tier === key),
    });
  }

  return includeEmpty ? groups : groups.filter((g) => g.sponsors.length > 0);
}
