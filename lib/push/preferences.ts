import { z } from "zod";
import prisma from "@/lib/prisma";
import { ValidationError } from "@/lib/api/errors";
import type { PushKind } from "@/lib/push/pushEvents";
import { Platform } from "@/utils/platform";

/**
 * What a person wants pushed to the app (TASK-0015 1I.4, 1I.5): which kinds of
 * event, and quiet hours. It is the account's choice and applies on every phone
 * they are signed in on. No row means the defaults (everything on, no quiet
 * hours), so nothing changes for anyone until they change something.
 */

export const PUSH_CATEGORIES = [
  "PLANS_NEED_YOU",
  "PLAN_LODGED",
  "PLAN_SHARED",
  "SUBSCRIPTION",
  "WITHDRAWALS",
] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

/**
 * The switch a kind of push belongs to. A record over every `PushKind`, so a
 * new kind cannot be added without deciding which switch controls it.
 */
export const CATEGORY_OF_KIND: Record<PushKind, PushCategory> = {
  PLAN_QUERIED: "PLANS_NEED_YOU",
  READY_FOR_PHYSICAL: "PLANS_NEED_YOU",
  PLAN_LODGED: "PLAN_LODGED",
  PLAN_SHARED: "PLAN_SHARED",
  SUBSCRIPTION_ENDING: "SUBSCRIPTION",
  WITHDRAWAL_UPDATED: "WITHDRAWALS",
};

export const DEFAULT_TIME_ZONE = "Africa/Lagos";
const DEFAULT_QUIET_START = 22 * 60;
const DEFAULT_QUIET_END = 7 * 60;

/** What the API sends and takes. Times are "HH:MM" on a 24 hour clock. */
export type PushPreferences = {
  categories: Record<PushCategory, boolean>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timeZone: string;
  };
};

/** The columns of a `PushPreference` row that mean something. */
type PreferenceRow = {
  categoriesOff: string[];
  quietEnabled: boolean;
  quietStart: number;
  quietEnd: number;
  timeZone: string;
};

const DEFAULT_ROW: PreferenceRow = {
  categoriesOff: [],
  quietEnabled: false,
  quietStart: DEFAULT_QUIET_START,
  quietEnd: DEFAULT_QUIET_END,
  timeZone: DEFAULT_TIME_ZONE,
};

export function formatMinutes(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Minutes after midnight for an already validated "HH:MM". */
function parseMinutes(text: string): number {
  const [hh, mm] = text.split(":").map(Number);
  return hh * 60 + mm;
}

export function toPreferences(row: PreferenceRow | null): PushPreferences {
  const r = row ?? DEFAULT_ROW;
  return {
    categories: Object.fromEntries(
      PUSH_CATEGORIES.map((c) => [c, !r.categoriesOff.includes(c)])
    ) as Record<PushCategory, boolean>,
    quietHours: {
      enabled: r.quietEnabled,
      start: formatMinutes(r.quietStart),
      end: formatMinutes(r.quietEnd),
      timeZone: r.timeZone,
    },
  };
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Whether a part of a change names at least one thing to change. */
const sent = (part?: Record<string, unknown>) =>
  part !== undefined && Object.values(part).some((v) => v !== undefined);

/**
 * A change to the preferences: only what is sent changes, so two phones
 * changing two different switches do not undo each other. Unknown keys are
 * refused rather than ignored, so a typo does not look like it worked.
 */
export const pushPreferencesPatch = z
  .object({
    categories: z
      .object({
        PLANS_NEED_YOU: z.boolean().optional(),
        PLAN_LODGED: z.boolean().optional(),
        PLAN_SHARED: z.boolean().optional(),
        SUBSCRIPTION: z.boolean().optional(),
        WITHDRAWALS: z.boolean().optional(),
      })
      .strict()
      .optional(),
    quietHours: z
      .object({
        enabled: z.boolean().optional(),
        start: z.string().regex(TIME).optional(),
        end: z.string().regex(TIME).optional(),
        timeZone: z
          .string()
          .min(1)
          .max(64)
          .refine(isTimeZone, "Not a time zone")
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (patch) => sent(patch.categories) || sent(patch.quietHours),
    "Nothing to change"
  );
export type PushPreferencesPatch = z.infer<typeof pushPreferencesPatch>;

/** The row after a change. Pure, so the merge is tested without a database. */
export function applyPatch(
  current: PreferenceRow | null,
  patch: PushPreferencesPatch
): PreferenceRow {
  const base = current ?? DEFAULT_ROW;
  const off = new Set(base.categoriesOff);
  for (const [category, on] of Object.entries(patch.categories ?? {})) {
    if (on === undefined) continue;
    if (on) off.delete(category);
    else off.add(category);
  }
  const quiet = patch.quietHours ?? {};
  return {
    // In the order the API lists them, so the stored array does not depend on the order of changes.
    categoriesOff: PUSH_CATEGORIES.filter((c) => off.has(c)),
    quietEnabled: quiet.enabled ?? base.quietEnabled,
    quietStart:
      quiet.start !== undefined ? parseMinutes(quiet.start) : base.quietStart,
    quietEnd: quiet.end !== undefined ? parseMinutes(quiet.end) : base.quietEnd,
    timeZone: quiet.timeZone ?? base.timeZone,
  };
}

export async function getPushPreferences(
  userId: string,
  platform: Platform
): Promise<PushPreferences> {
  const row = await prisma.pushPreference.findUnique({
    where: { userId_platform: { userId, platform } },
  });
  return toPreferences(row);
}

/**
 * Applies a change and returns everything as it now stands. Quiet hours that
 * start and end at the same minute mean nothing (is that never, or all day?),
 * so they are refused instead of guessed at.
 */
export async function updatePushPreferences(
  userId: string,
  platform: Platform,
  patch: PushPreferencesPatch
): Promise<PushPreferences> {
  const current = await prisma.pushPreference.findUnique({
    where: { userId_platform: { userId, platform } },
  });
  const next = applyPatch(current, patch);
  if (next.quietStart === next.quietEnd) {
    throw new ValidationError(
      "Quiet hours must start and end at different times"
    );
  }
  await prisma.pushPreference.upsert({
    where: { userId_platform: { userId, platform } },
    create: { userId, platform, ...next },
    update: next,
  });
  return toPreferences(next);
}

/** Minutes after local midnight in a time zone, or null for a zone this server does not know. */
function localMinutes(now: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const at = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    const minutes = (at("hour") % 24) * 60 + at("minute");
    return Number.isNaN(minutes) ? null : minutes;
  } catch {
    return null;
  }
}

/**
 * Whether `now` falls in this person's quiet hours. They may run through
 * midnight (22:00 to 07:00). A zone that cannot be read counts as not quiet: a
 * push the person asked to be spared is better than a push never sent for a
 * reason they cannot see.
 */
export function inQuietHours(
  now: Date,
  quiet: Pick<
    PreferenceRow,
    "quietEnabled" | "quietStart" | "quietEnd" | "timeZone"
  >
): boolean {
  if (!quiet.quietEnabled || quiet.quietStart === quiet.quietEnd) return false;
  const minutes = localMinutes(now, quiet.timeZone);
  if (minutes === null) return false;
  return quiet.quietStart < quiet.quietEnd
    ? minutes >= quiet.quietStart && minutes < quiet.quietEnd
    : minutes >= quiet.quietStart || minutes < quiet.quietEnd;
}

/**
 * Of these people, the ones who should be pushed this kind of event now: not
 * switched off, not in quiet hours. A person with no row wants everything.
 */
export async function usersWhoWant(
  userIds: string[],
  kind: PushKind,
  platform: Platform,
  now: Date = new Date()
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.pushPreference.findMany({
    where: { userId: { in: userIds }, platform },
  });
  const byUser = new Map(rows.map((row) => [row.userId, row]));
  const category = CATEGORY_OF_KIND[kind];
  return userIds.filter((userId) => {
    const row = byUser.get(userId);
    if (!row) return true;
    if (row.categoriesOff.includes(category)) return false;
    return !inQuietHours(now, row);
  });
}
