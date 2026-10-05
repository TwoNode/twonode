/**
 * The state a CSV uploaded into the plans map viewer is drawn as.
 *
 * The map correction (see applyVisualizationShift) is chosen by a plan's
 * state. A CSV only has one if it carries a `state` column, so without this
 * fallback an uploaded CSV was drawn uncorrected while the same plan, once
 * saved, was drawn corrected. Surfboard plans are Lagos plans, and Lagos is
 * the state the correction is configured for, so a CSV with no state is
 * treated as Lagos. A CSV that names a state keeps it.
 */
export const DEFAULT_CSV_STATE = "Lagos";

export function resolveCsvState(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_CSV_STATE;
}
