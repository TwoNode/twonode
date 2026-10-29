import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";
import {
  boundaryFacts,
  outlineOf,
  type Outline,
} from "@/surfboard/utils/planGeometry";
import {
  computeDisplayStatus,
  PLAN_STATUS_SELECT,
  type DisplayStatus,
  type PlanStatusRow,
} from "@/surfboard/utils/planStatus";

/**
 * The caller's own plans for the mobile app's Home map (TASK-0015 1E.1): where
 * each one is, the outline to draw, and the few facts the details sheet shows,
 * all in one answer so the map is a single GeoJSON source on the phone. There
 * is no spatial index and no viewport filter, which is fine for the hundreds of
 * plans one surveyor has (1E.3 is for anything bigger).
 *
 * What it leaves out on purpose: pillars (the sheet shows the centre, and the
 * plan's own screen has the details), files and links, the share list, reviewer
 * comments, other people's details, and altitude. The outline is simplified for
 * drawing and must not be used to measure anything.
 *
 * The outline and centre are the stored, uncorrected coordinates. The map moves
 * them by the state's display correction (ADR-0004, `settings/coordinate-shifts`)
 * when it draws; the sheet and copied text show them as they are.
 */

export type MapPlan = {
  id: string;
  planNumber: string;
  surveyTitle: string;
  displayStatus: DisplayStatus;
  /** Free text as stored; the display correction is looked up by it, capitals ignored. */
  state: string | null;
  lga: string | null;
  locality: string | null;
  /** Square metres, from the stored boundary. */
  areaSqM: number | null;
  /** Where to fly to, and where a marker goes: the stored boundary's centre. */
  centroid: { lat: number; lng: number };
  simplifiedGeometry: Outline;
};

export type PlanMap = {
  /** The plans that can be drawn, most recently changed first. */
  plans: MapPlan[];
  /** All the caller's plans (not deleted), drawn or not. */
  total: number;
  /** Plans read here whose stored boundary cannot be drawn. They are not in `plans`. */
  withoutOutline: number;
  /** There are more plans than were read; `plans` holds the most recently changed. */
  truncated: boolean;
};

/** A surveyor has hundreds of plans; this bounds the answer, and a larger account is told it is cut. */
export const MAP_PLAN_LIMIT = 2000;

const MAP_SELECT = {
  id: true,
  planNumber: true,
  surveyTitle: true,
  state: true,
  lga: true,
  locality: true,
  geometry: true,
  // The owner's own batch is read for the status, as in their lists.
  ...PLAN_STATUS_SELECT,
} as const satisfies Prisma.SurfboardPlanSelect;

export async function getPlanMap(userId: string): Promise<PlanMap> {
  const where = { userId, deleted: false };
  const [rows, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: MAP_SELECT,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: MAP_PLAN_LIMIT,
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  const plans: MapPlan[] = [];
  let withoutOutline = 0;
  for (const row of rows) {
    const simplifiedGeometry = outlineOf(row.geometry);
    const { areaSqM, centroid } = boundaryFacts(row.geometry);
    // A plan with no centre cannot be found by a search or flown to, so it is
    // counted as undrawable rather than drawn half-way.
    if (!simplifiedGeometry || !centroid) {
      withoutOutline += 1;
      continue;
    }
    plans.push({
      id: row.id,
      planNumber: row.planNumber,
      surveyTitle: row.surveyTitle,
      displayStatus: computeDisplayStatus(row as unknown as PlanStatusRow),
      state: row.state,
      lga: row.lga,
      locality: row.locality,
      areaSqM,
      centroid,
      simplifiedGeometry,
    });
  }

  return { plans, total, withoutOutline, truncated: total > rows.length };
}
