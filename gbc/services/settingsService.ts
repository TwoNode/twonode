import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { GBCSettingsData, defaultSettings } from "@/gbc/utils/settings";

/**
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

const SECTIONS: (keyof GBCSettingsData)[] = ["event", "contact", "tickets", "notifications", "gallery", "system"];

function mergeWithDefaults(saved: Partial<GBCSettingsData>): GBCSettingsData {
  return {
    event: { ...defaultSettings.event, ...(saved.event || {}) },
    contact: { ...defaultSettings.contact, ...(saved.contact || {}) },
    tickets: { ...defaultSettings.tickets, ...(saved.tickets || {}) },
    notifications: { ...defaultSettings.notifications, ...(saved.notifications || {}) },
    gallery: { ...defaultSettings.gallery, ...(saved.gallery || {}) },
    system: { ...defaultSettings.system, ...(saved.system || {}) },
    editions: saved.editions ?? defaultSettings.editions,
  };
}

export async function getSettings(): Promise<GBCSettingsData> {
  const record = await prisma.gBCSettings.findFirst();
  if (!record) {
    await prisma.gBCSettings.create({
      data: { settings: defaultSettings as Prisma.InputJsonValue, previousSettings: Prisma.JsonNull as any },
    });
    return defaultSettings;
  }
  return mergeWithDefaults((record.settings || {}) as Partial<GBCSettingsData>);
}

/** Low-level full-replace, mirrors updateAllGBCSettings — writes settings, moves the current row to previousSettings, and audit-logs the action. */
async function replaceSettings(settings: GBCSettingsData, userId: string, action: string): Promise<GBCSettingsData> {
  const existing = await prisma.gBCSettings.findFirst();

  const updated = existing
    ? await prisma.gBCSettings.update({
        where: { id: existing.id },
        data: {
          settings: settings as Prisma.InputJsonValue,
          previousSettings: existing.settings as Prisma.InputJsonValue,
        },
      })
    : await prisma.gBCSettings.create({
        data: { settings: settings as Prisma.InputJsonValue, previousSettings: Prisma.JsonNull as any },
      });

  await prisma.gBCAuditLog.create({
    data: { userId, action, entity: "GBCSettings", entityId: updated.id, changes: JSON.stringify(settings) },
  });

  return updated.settings as GBCSettingsData;
}

export async function updateSettings(patch: SettingsPatch, userId: string): Promise<GBCSettingsData> {
  const invalidSection = Object.keys(patch).find((key) => !SECTIONS.includes(key as keyof GBCSettingsData));
  if (invalidSection) throw new ValidationError({ [invalidSection]: `Invalid settings section: ${invalidSection}` });

  const current = await getSettings();
  const merged: GBCSettingsData = { ...current };
  for (const section of SECTIONS) {
    if (patch[section]) {
      merged[section] = { ...current[section], ...patch[section] } as any;
    }
  }

  return replaceSettings(merged, userId, "UPDATE_SETTINGS");
}

export async function resetToDefaults(userId: string): Promise<GBCSettingsData> {
  return replaceSettings(defaultSettings, userId, "RESET_SETTINGS");
}

/**
 * Dedicated write path for editionService.ts — editions are excluded from
 * the generic updateSettings() patch surface (see updateSettings' comment)
 * since edition CRUD has its own business rules (exactly-one-ACTIVE) that
 * belong there, not here. This just persists+audit-logs, same as any other
 * settings write.
 */
export async function replaceEditions(
  editions: GBCSettingsData["editions"],
  userId: string,
  action: string
): Promise<GBCSettingsData["editions"]> {
  const current = await getSettings();
  const updated = await replaceSettings({ ...current, editions }, userId, action);
  return updated.editions;
}

export async function getPreviousSettings(): Promise<GBCSettingsData | null> {
  const record = await prisma.gBCSettings.findFirst();
  if (!record) throw new NotFoundError("Settings");
  return (record.previousSettings as GBCSettingsData | null) ?? null;
}

export async function rollback(userId: string): Promise<GBCSettingsData> {
  const previous = await getPreviousSettings();
  if (!previous) throw new ValidationError({ rollback: "No previous settings available to rollback to" });

  const current = await getSettings();
  const record = await prisma.gBCSettings.findFirst();
  if (!record) throw new NotFoundError("Settings");

  const rolledBack = await prisma.gBCSettings.update({
    where: { id: record.id },
    data: {
      settings: previous as Prisma.InputJsonValue,
      previousSettings: current as Prisma.InputJsonValue,
    },
  });

  await prisma.gBCAuditLog.create({
    data: {
      userId,
      action: "ROLLBACK_SETTINGS",
      entity: "GBCSettings",
      entityId: rolledBack.id,
      changes: JSON.stringify({ rolledBackFrom: current, rolledBackTo: previous }),
    },
  });

  return rolledBack.settings as GBCSettingsData;
}
