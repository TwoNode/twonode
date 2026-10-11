/**
 * Hard-coded figures for the home page "numbers so far" block, as supplied by
 * the maintainer (the prototype's values). They are deliberately not read from
 * the database. For reference, a read-only count of the production Surfboard
 * database on 2026-10-11 showed 2,358 plans and 11,493 pillars (first plan
 * 2025-07-29), so these figures presumably include records from outside it.
 */
export const proof = {
  plans: 9567,
  beacons: 38431,
  regions: 4,
  regionsLabel: "states in Southwestern Nigeria",
  places: ["Lagos", "Ondo", "Ogun", "Oyo"],
  since: 2023,
} as const;
