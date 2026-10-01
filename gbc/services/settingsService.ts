import prisma from "@/lib/prisma";
import { Prisma, type GBCEdition as GBCEditionRow } from "@/prisma/generated";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { GBCSettingsData, defaultSettings } from "@/gbc/utils/settings";
import { writeAudit } from "@/lib/audit";
import { Platform } from "@/utils/platform";

/**
 * Settings are one row per edition (gbc_settings.edition is unique): each
 * conference has its own event details, ticket prices and capacity,
 * notification toggles and so on. An edition with no row yet reads as defaults
 * (its own name/theme/venue/date filled in) until its first save creates one;
 * reads never write.
 *
 * Every function takes an optional `edition` key. Left out, it means "the
 * edition the public site shows" — see resolveSettingsEdition().
 *
 * Migrated from settings-actions.ts. checkAuthorization() is superseded
 * entirely by withAuth<GBCRole> at the route layer (ADMIN for reads/writes,
 * SUPERADMIN for reset/rollback, matching the source's requireSuperAdmin
 * flag) — service functions take userId only, for audit logging.
 *
 * The source's updateGBCSettingsSection/updateGBCSetting/
 * updateMultipleGBCSettings/bulkUpdateSettings were four wrappers around the
 * same path-navigation logic, duplicated three different ways. Collapsed
 * here into one updateSettings(patch) doing a real per-section merge — the
 * schema is exactly two levels deep (section -> flat keys), so a shallow
 * merge per provided section is sufficient, no general deep-merge needed.
 */

export type SettingsPatch = { [K in keyof GBCSettingsData]?: Partial<GBCSettingsData[K]> };

const SECTIONS: (keyof GBCSettingsData)[] = ["event", "contact", "tickets", "notifications", "gallery", "system", "emailVerification"];

/**
 * The edition whose settings apply when none is asked for: the ACTIVE
 * edition, else the most recent PAST one, else the earliest UPCOMING one.
 * Production currently has no ACTIVE edition, so the fallback is what keeps the
 * public site showing real event details instead of blank/default ones. The
 * migration that introduced per-edition rows uses the same order.
 *
 * A supplied key must be an existing, non-deleted edition.
 */
export async function resolveSettingsEdition(supplied?: string): Promise<GBCEditionRow | null> {
  if (supplied) {
    const edition = await prisma.gBCEdition.findFirst({ where: { key: supplied, deletedAt: null } });
    if (!edition) throw new NotFoundError("Edition");
    return edition;
  }

  const active = await prisma.gBCEdition.findFirst({ where: { status: "ACTIVE", deletedAt: null } });
  if (active) return active;
  const past = await prisma.gBCEdition.findFirst({
    where: { status: "PAST", deletedAt: null },
    orderBy: { startDate: "desc" },
  });
  if (past) return past;
  return prisma.gBCEdition.findFirst({ where: { deletedAt: null }, orderBy: { startDate: "asc" } });
}

async function requireEdition(supplied?: string): Promise<GBCEditionRow> {
  const edition = await resolveSettingsEdition(supplied);
  if (!edition) throw new ValidationError({ edition: "Create an edition before saving settings" });
  return edition;
}

/** Defaults for an edition with nothing saved: the generic defaults, with the event section taken from the edition itself. */
function defaultsFor(edition: GBCEditionRow | null): GBCSettingsData {
  if (!edition) return defaultSettings;
  return {
    ...defaultSettings,
    event: {
      ...defaultSettings.event,
      name: edition.name,
      theme: edition.theme,
      subTheme: edition.subTheme,
      venue: edition.venue,
      date: edition.startDate.toISOString().slice(0, 10),
    },
  };
}

function mergeWithDefaults(saved: Partial<GBCSettingsData>, base: GBCSettingsData): GBCSettingsData {
  return {
    event: { ...base.event, ...(saved.event || {}) },
    contact: { ...base.contact, ...(saved.contact || {}) },
    tickets: { ...base.tickets, ...(saved.tickets || {}) },
    notifications: { ...base.notifications, ...(saved.notifications || {}) },
    gallery: { ...base.gallery, ...(saved.gallery || {}) },
    system: { ...base.system, ...(saved.system || {}) },
    emailVerification: { ...base.emailVerification, ...(saved.emailVerification || {}) },
  };
}

/** The settings plus which edition they belong to and whether they have been saved yet (false = showing defaults). */
export async function getEditionSettings(
  supplied?: string
): Promise<{ edition: string | null; settings: GBCSettingsData; saved: boolean }> {
  const edition = await resolveSettingsEdition(supplied);
  const defaults = defaultsFor(edition);
  if (!edition) return { edition: null, settings: defaults, saved: false };

  const record = await prisma.gBCSettings.findUnique({ where: { edition: edition.key } });
  if (!record) return { edition: edition.key, settings: defaults, saved: false };
  return {
    edition: edition.key,
    settings: mergeWithDefaults((record.settings || {}) as Partial<GBCSettingsData>, defaults),
    saved: true,
  };
}

export async function getSettings(edition?: string): Promise<GBCSettingsData> {
  return (await getEditionSettings(edition)).settings;
}

/** Low-level full-replace, mirrors updateAllGBCSettings — writes the edition's row (creating it on first save), moves the old value to previousSettings, and audit-logs the action. */
async function replaceSettings(
  edition: string,
  settings: GBCSettingsData,
  userId: string,
  action: string
): Promise<GBCSettingsData> {
  const existing = await prisma.gBCSettings.findUnique({ where: { edition } });

  const saved = await prisma.gBCSettings.upsert({
    where: { edition },
    update: {
      settings: settings as Prisma.InputJsonValue,
      previousSettings: existing ? (existing.settings as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
    create: { edition, settings: settings as Prisma.InputJsonValue },
  });

  await writeAudit(Platform.GBC, {
    userId,
    action,
    entity: "GBCSettings",
    entityId: saved.id,
    changes: { edition, settings },
  });

  return saved.settings as GBCSettingsData;
}

export async function updateSettings(patch: SettingsPatch, userId: string, edition?: string): Promise<GBCSettingsData> {
  const invalidSection = Object.keys(patch).find((key) => !SECTIONS.includes(key as keyof GBCSettingsData));
  if (invalidSection) throw new ValidationError({ [invalidSection]: `Invalid settings section: ${invalidSection}` });

  const target = await requireEdition(edition);
  const current = await getSettings(target.key);
  const merged: GBCSettingsData = { ...current };
  for (const section of SECTIONS) {
    if (patch[section]) {
      merged[section] = { ...current[section], ...patch[section] } as any;
    }
  }

  // Server is the sole authority for enforcedSince — never trust a
  // caller-supplied value, and only stamp it fresh on a genuine
  // false->true enable transition. Otherwise every account created
  // between this feature's deploy date and whenever a superadmin
  // actually enables it would wrongly get zero grace period (the static
  // default's hardcoded date, not the real enable moment).
  if (patch.emailVerification) {
    const wasEnabled = current.emailVerification.enabled === true;
    const nowEnabled = merged.emailVerification.enabled === true;
    merged.emailVerification.enforcedSince =
      !wasEnabled && nowEnabled
        ? new Date().toISOString()
        : current.emailVerification.enforcedSince;
  }

  return replaceSettings(target.key, merged, userId, "UPDATE_SETTINGS");
}

export async function resetToDefaults(userId: string, edition?: string): Promise<GBCSettingsData> {
  const target = await requireEdition(edition);
  return replaceSettings(target.key, defaultsFor(target), userId, "RESET_SETTINGS");
}

/** The settings this edition had before its last change, or null if it has never been changed. */
export async function getPreviousSettings(edition?: string): Promise<GBCSettingsData | null> {
  const target = await requireEdition(edition);
  const record = await prisma.gBCSettings.findUnique({ where: { edition: target.key } });
  return (record?.previousSettings as GBCSettingsData | null | undefined) ?? null;
}

export async function rollback(userId: string, edition?: string): Promise<GBCSettingsData> {
  const target = await requireEdition(edition);
  const previous = await getPreviousSettings(target.key);
  if (!previous) throw new ValidationError({ rollback: "No previous settings available to rollback to" });

  const current = await getSettings(target.key);
  const rolledBack = await prisma.gBCSettings.update({
    where: { edition: target.key },
    data: {
      settings: previous as Prisma.InputJsonValue,
      previousSettings: current as Prisma.InputJsonValue,
    },
  });

  await writeAudit(Platform.GBC, {
    userId,
    action: "ROLLBACK_SETTINGS",
    entity: "GBCSettings",
    entityId: rolledBack.id,
    changes: { edition: target.key, rolledBackFrom: current, rolledBackTo: previous },
  });

  return rolledBack.settings as GBCSettingsData;
}
