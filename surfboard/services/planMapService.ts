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
 * The caller's plans for the mobile app's Home map (TASK-0015 1E.1): their own
 * and the ones other surveyors shared with them (the same two sets as the Plans
 * tab's "mine" and "shared with me"), where each one is, the outline to draw,
 * and the few facts the details sheet shows, all in one answer so the map is a
 * single GeoJSON source on the phone. There is no spatial index and no viewport
 * filter, which is fine for the hundreds of plans one surveyor has (1E.3 is for
 * anything bigger).
 *
 * A plan seen through a share says so (`isOwner: false`) and who shared it
 * (`ownerName`, the owner's name, as on the Plans tab). Its status is worked out
 * without the owner's batch, as the shared list and the plan's own screen do,
 * so a shared viewer does not learn the owner's payment state.
 *
 * What it leaves out on purpose: pillars (the sheet shows the centre, and the
 * plan's own screen has the details; `getMapPillars` sends them, for the caller's
 * own plans and the shared ones alike, for the plans in view once the map is
 * zoomed in), files and links, the share list, reviewer
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
  /** False for a plan another surveyor shared with the caller. */
  isOwner: boolean;
  /** Who shared it, for a plan seen through a share; null for the caller's own. */
  ownerName: string | null;
  /**
   * The date printed on the survey plan (ISO, UTC), or null. The card orders several plans on
   * one spot by it, newest first, as the website's map popup does.
   */
  dateOnSurveyPlan: string | null;
  /** Where to fly to, and where a marker goes: the stored boundary's centre. */
  centroid: { lat: number; lng: number };
  simplifiedGeometry: Outline;
};

export type PlanMap = {
  /** The plans that can be drawn, most recently changed first. */
  plans: MapPlan[];
  /** All the caller's plans and the ones shared with them (not deleted), drawn or not. */
  total: number;
  /** Plans read here whose stored boundary cannot be drawn. They are not in `plans`. */
  withoutOutline: number;
  /** There are more plans than were read; `plans` holds the most recently changed. */
  truncated: boolean;
};

/** A surveyor has hundreds of plans (own and shared); this bounds the answer, and a larger account is told it is cut. */
export const MAP_PLAN_LIMIT = 2000;

const MAP_SELECT = {
  id: true,
  // Who owns it, and the owner's name for a plan seen through a share; neither is sent for the
  // caller's own plans.
  userId: true,
  user: { select: { firstName: true, lastName: true } },
  planNumber: true,
  surveyTitle: true,
  state: true,
  lga: true,
  locality: true,
  geometry: true,
  dateOnSurveyPlan: true,
  // The owner's own batch is read for the status, as in their lists.
  ...PLAN_STATUS_SELECT,
} as const satisfies Prisma.SurfboardPlanSelect;

export async function getPlanMap(userId: string): Promise<PlanMap> {
  const where = {
    OR: [{ userId }, { sharedTo: { has: userId } }],
    deleted: false,
  };
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
    const owner = row.userId === userId;
    plans.push({
      id: row.id,
      planNumber: row.planNumber,
      surveyTitle: row.surveyTitle,
      // A shared viewer must not learn the owner's payment state: no batch goes into the status.
      displayStatus: computeDisplayStatus(
        (owner ? row : { ...row, batch: null }) as unknown as PlanStatusRow
      ),
      state: row.state,
      lga: row.lga,
      locality: row.locality,
      areaSqM,
      isOwner: owner,
      ownerName: owner
        ? null
        : [row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") ||
          null,
      dateOnSurveyPlan: row.dateOnSurveyPlan
        ? row.dateOnSurveyPlan.toISOString()
        : null,
      centroid,
      simplifiedGeometry,
    });
  }

  return { plans, total, withoutOutline, truncated: total > rows.length };
}

export type MapPillar = {
  pillarNumber: string;
  /** Metres in Minna / UTM zone 31N, as stored; the map applies the state's display correction. */
  easting: number;
  northing: number;
  /** Which polygon of the plan the pillar belongs to (0 for a plan with one). */
  polygonIndex: number;
};

export type PlanPillars = { id: string; pillars: MapPillar[] };

export type MapPillars = { plans: PlanPillars[] };

const toNumber = (value: unknown): number | null => {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(number) ? number : null;
};

/**
 * The usable pillars of a stored `pillars` column (a JSON array the website wrote): each needs a
 * number to show and a finite easting and northing; anything else in the column is dropped, so a
 * malformed record cannot reach the map.
 */
export function readPillars(raw: unknown): MapPillar[] {
  if (!Array.isArray(raw)) return [];
  const pillars: MapPillar[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const number =
      typeof record.pillarNumber === "string"
        ? record.pillarNumber.trim()
        : typeof record.pillarNumber === "number"
          ? String(record.pillarNumber)
          : "";
    const easting = toNumber(record.easting);
    const northing = toNumber(record.northing);
    if (!number || easting === null || northing === null) continue;
    const polygon = toNumber(record.polygonIndex);
    pillars.push({
      pillarNumber: number.slice(0, 40),
      easting,
      northing,
      polygonIndex:
        polygon !== null && Number.isInteger(polygon) && polygon >= 0
          ? polygon
          : 0,
    });
  }
  return pillars;
}

/**
 * The pillars of some of the caller's plans, their own and the ones shared with them (TASK-0015
 * 1E.4; a shared viewer sees the pillar numbers, the maintainer's decision of 2026-11-13), in the order the ids were asked
 * for. `getPlanMap` leaves pillars out to keep its answer small; the app asks for the plans in view
 * once the map is zoomed in far enough to number them. A plan that is not the caller's, is deleted
 * or has no usable pillar is left out, the same answer for each, so nobody can probe for plan ids.
 * "Not the caller's" means neither owned by nor shared with them.
 */
export async function getMapPillars(
  userId: string,
  ids: string[]
): Promise<MapPillars> {
  if (ids.length === 0) return { plans: [] };
  const rows = await prisma.surfboardPlan.findMany({
    where: {
      OR: [{ userId }, { sharedTo: { has: userId } }],
      deleted: false,
      id: { in: ids },
    },
    select: { id: true, pillars: true },
  });
  const plans = rows
    .flatMap((row) => {
      const pillars = readPillars(row.pillars);
      return pillars.length > 0 ? [{ id: row.id, pillars }] : [];
    })
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return { plans };
}
