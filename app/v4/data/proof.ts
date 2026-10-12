/**
 * Hard-coded figures for the home page "numbers so far" block, based on a
 * read-only count of the production database on 2026-10-11:
 *   - 127 Surfboard surveyor accounts (role USER)
 *   - 2,358 survey plans (not deleted)
 *   - 11,493 pillars (survey beacons) on those plans
 *   - plans in Lagos, Ogun, Ondo, Oyo and the FCT; first plan 2025-07-29
 * They are shown rounded down with a "+", so they stay true as the numbers
 * grow. Update this file by hand; nothing reads the database at runtime.
 */
export const proof = {
  stats: [
    { value: 125, label: "registered surveyors" },
    { value: 2300, label: "survey plans" },
    { value: 11000, label: "survey beacons" },
  ],
  places: ["Lagos", "Ogun", "Ondo", "Oyo", "FCT"],
  since: 2025,
} as const;
