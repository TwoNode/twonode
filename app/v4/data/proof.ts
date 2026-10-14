/**
 * Hard-coded figures for the home page "numbers so far" block, based on a
 * read-only count of the production database on 2026-10-11:
 *   - 127 Surfboard surveyor accounts (role USER)
 *   - 2,358 survey plans (not deleted)
 *   - 11,493 pillars (survey beacons) on those plans
 *   - plans in Lagos, Ogun, Ondo, Oyo and the FCT
 *   - "Since" is the year on the survey plans (`dateOnSurveyPlan`), not when they
 *     were uploaded: 86 plans dated 2022, 1 dated 2021, 1 dated 1999 (a typo in
 *     the data, ignored). 2022 is the first year with a real number of plans.
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
  since: 2022,
} as const;
