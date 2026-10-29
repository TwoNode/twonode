import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api/errors";
import {
  logAuditAction,
  createChangeLog,
} from "@/app/(projects)/(surfboard)/utils/auditLogger";
import {
  COD_FEES,
  type ZoneFeeRow,
} from "@/app/(projects)/(surfboard)/utils/CoDFees";
import { DEFAULT_COORDINATE_SHIFTS } from "@/lib/constants";
import { sendMail } from "@/utils/email";
import { writeAudit } from "@/lib/audit";
import { Platform } from "@/utils/platform";

/**
 * Migrated from app/(projects)/(surfboard)/actions/settingsActions.ts — a
 * shared-dependency file two other services (remitaVerificationService.ts,
 * batchApprovalService.ts) dynamic-imported directly, plus several
 * page/component consumers. getSurveyorsForKyc/toggleBankVerification
 * already live in qrEarningsService.ts (Phase 1), not duplicated here.
 */

export interface RecordCopyVerificationTolerances {
  tolAnchor: number;
  tolWCB: number;
  tolDist: number;
  tolArea: number;
  tolPass: number;
  tolWarn: number;
}

export interface EmailVerificationSettings {
  enabled: boolean;
  method: "OTP" | "LINK";
  gracePeriodDays: number;
  enforcedSince: string;
}

/**
 * What the server asks of the mobile app (TASK-0015 1B and 1J.3). Changed
 * without a deploy through PATCH /api/v1/surfboard/settings/mobile-app, and
 * only through it: updateSettings() below keeps whatever is stored, so saving
 * the other settings on the admin page cannot switch the gate off by accident.
 * Read through getMobileAppSettings(), which fills anything missing.
 */
export interface MobileAppSettings {
  /** Lowest app version still served, per store, as "major.minor.patch". "" means no minimum: nothing is refused. */
  minimumAndroidVersion: string;
  minimumIosVersion: string;
  /** Where the app's update screen sends the person, per store. "" means the screen only says to update. */
  androidStoreUrl: string;
  iosStoreUrl: string;
  /** The emergency switch: false pauses new sign-ins from the app. Open sessions carry on. */
  signInEnabled: boolean;
}

export interface SurfboardSettingsData {
  zoneFees: ZoneFeeRow[];
  systemChargePercent: number;
  codAcceptanceText: string;
  codPolicyContent: string;
  queryResponseFeePercent: number;
  coordinateShifts?: Record<
    string,
    { eastingShift: number; northingShift: number }
  >;
  recordCopyTolerances?: RecordCopyVerificationTolerances;
  emailVerification?: EmailVerificationSettings;
  mobileApp?: MobileAppSettings;
}

export const DEFAULT_MOBILE_APP_SETTINGS: MobileAppSettings = {
  minimumAndroidVersion: "",
  minimumIosVersion: "",
  androidStoreUrl: "",
  iosStoreUrl: "",
  signInEnabled: true,
};

/**
 * The stored value with every field present and of the right type, whatever
 * an older version, a hand edit or a partial save left there. Anything that is
 * not a string (or, for the switch, a boolean) falls back to the default, so a
 * malformed row can never turn the gate on or stop sign-in by accident.
 */
export function normalizeMobileAppSettings(raw: unknown): MobileAppSettings {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (key: keyof MobileAppSettings): string => {
    const value = source[key];
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    minimumAndroidVersion: text("minimumAndroidVersion"),
    minimumIosVersion: text("minimumIosVersion"),
    androidStoreUrl: text("androidStoreUrl"),
    iosStoreUrl: text("iosStoreUrl"),
    signInEnabled:
      typeof source.signInEnabled === "boolean" ? source.signInEnabled : true,
  };
}

const DEFAULT_SETTINGS: SurfboardSettingsData = {
  zoneFees: COD_FEES,
  systemChargePercent: 10,
  codAcceptanceText:
    "I hereby affirm that the information provided in this submission is true, accurate, and complete to the best of my knowledge.",
  codPolicyContent:
    "Official CoD Submission Policy.\n\nBy clicking 'Submit', you agree to the terms and conditions outlined by the MDA.",
  queryResponseFeePercent: 10,
  coordinateShifts: DEFAULT_COORDINATE_SHIFTS,
  recordCopyTolerances: {
    tolAnchor: 0.05,
    tolWCB: 0.05,
    tolDist: 0.05,
    tolArea: 0.01,
    tolPass: 95,
    tolWarn: 80,
  },
  emailVerification: {
    enabled: false,
    method: "OTP",
    gracePeriodDays: 30,
    enforcedSince: "2026-10-01T00:00:00.000Z",
  },
  mobileApp: DEFAULT_MOBILE_APP_SETTINGS,
};

function mergeSettings(
  dbSettings: any,
  defaults: SurfboardSettingsData
): SurfboardSettingsData {
  if (!dbSettings || typeof dbSettings !== "object") return { ...defaults };

  const result: any = { ...dbSettings };
  for (const key of Object.keys(defaults) as (keyof SurfboardSettingsData)[]) {
    if (result[key] === undefined) {
      result[key] = defaults[key];
    } else if (
      typeof defaults[key] === "object" &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key]) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = { ...defaults[key], ...result[key] };
    }
  }
  return result as SurfboardSettingsData;
}

async function getLatestMergedSettings(): Promise<SurfboardSettingsData> {
  const settings = await prisma.surfboardSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!settings || !settings.settings) return DEFAULT_SETTINGS;
  return mergeSettings(settings.settings, DEFAULT_SETTINGS);
}

export async function getSurfboardSettings(): Promise<SurfboardSettingsData> {
  return getLatestMergedSettings();
}

/** The mobile controls as stored, with defaults filled in (see MobileAppSettings). */
export async function getMobileAppSettings(): Promise<MobileAppSettings> {
  const merged = await getLatestMergedSettings();
  return normalizeMobileAppSettings(merged.mobileApp);
}

export async function getCurrentSettings(
  userId: string
): Promise<SurfboardSettingsData> {
  const settings = await prisma.surfboardSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!settings || !settings.settings) {
    await prisma.surfboardSettings.create({
      data: {
        settings: DEFAULT_SETTINGS as any,
        previousSettings: {},
        updatedById: userId,
      },
    });
    return DEFAULT_SETTINGS;
  }

  return mergeSettings(settings.settings, DEFAULT_SETTINGS);
}

/** Public, no auth gate in the source — used internally by codFeeService/remitaVerificationService. */
export async function getZoneFees(): Promise<ZoneFeeRow[]> {
  const merged = await getLatestMergedSettings();
  return merged.zoneFees;
}

export async function getSystemChargePercent(): Promise<number> {
  const merged = await getLatestMergedSettings();
  return merged.systemChargePercent;
}

/** Public getter for the surveyor CoD-submission modal. */
export async function getCodSubmissionSettings() {
  const s = await getLatestMergedSettings();
  return {
    codAcceptanceText: s.codAcceptanceText,
    codPolicyContent: s.codPolicyContent,
    queryResponseFeePercent: s.queryResponseFeePercent,
  };
}

export async function getCoordinateShifts(): Promise<
  Record<string, { eastingShift: number; northingShift: number }>
> {
  const s = await getLatestMergedSettings();
  return s.coordinateShifts || {};
}

export async function updateSettings(
  userId: string,
  newSettings: SurfboardSettingsData
) {
  const currentSettings = await prisma.surfboardSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const currentMerged = currentSettings?.settings
    ? mergeSettings(currentSettings.settings, DEFAULT_SETTINGS)
    : DEFAULT_SETTINGS;

  // Server is the sole authority for enforcedSince — never trust a
  // client-supplied value, and only stamp it fresh on a genuine
  // false->true enable transition. Otherwise every account created
  // between this feature's deploy date and whenever a superadmin
  // actually enables it would wrongly get zero grace period (the static
  // default's hardcoded date, not the real enable moment).
  if (newSettings.emailVerification) {
    const wasEnabled = currentMerged.emailVerification?.enabled === true;
    const nowEnabled = newSettings.emailVerification.enabled === true;
    newSettings = {
      ...newSettings,
      emailVerification: {
        ...newSettings.emailVerification,
        enforcedSince:
          !wasEnabled && nowEnabled
            ? new Date().toISOString()
            : currentMerged.emailVerification?.enforcedSince ||
              DEFAULT_SETTINGS.emailVerification!.enforcedSince,
      },
    };
  }

  // The mobile controls are written only by updateMobileAppSettings(): a save
  // of the other settings must neither reset them (a page that does not know
  // the key sends none) nor overwrite them with a copy read earlier.
  newSettings = {
    ...newSettings,
    mobileApp: normalizeMobileAppSettings(currentMerged.mobileApp),
  };

  const newSettingsRecord = await prisma.surfboardSettings.create({
    data: {
      settings: newSettings as any,
      previousSettings: currentSettings?.settings || {},
      updatedById: userId,
    },
  });

  await logAuditAction({
    userId,
    action: "UPDATE_SETTINGS",
    entity: "SurfboardSettings",
    entityId: newSettingsRecord.id,
    changes: createChangeLog({
      zoneFees: `${newSettings.zoneFees.length} fee ranges`,
      systemChargePercent: newSettings.systemChargePercent,
      coordinateShifts: newSettings.coordinateShifts
        ? Object.keys(newSettings.coordinateShifts).length +
          " states configured"
        : "None",
    }),
  });

  return { success: true };
}

/**
 * Changes some of the mobile controls and keeps everything else as it is, as a
 * new settings version (so the history and "revert to previous" still work).
 * The route has already validated the patch.
 */
export async function updateMobileAppSettings(
  userId: string,
  patch: Partial<MobileAppSettings>
): Promise<MobileAppSettings> {
  const current = await prisma.surfboardSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const currentMerged = current?.settings
    ? mergeSettings(current.settings, DEFAULT_SETTINGS)
    : DEFAULT_SETTINGS;

  const next = normalizeMobileAppSettings({
    ...normalizeMobileAppSettings(currentMerged.mobileApp),
    ...patch,
  });

  const record = await prisma.surfboardSettings.create({
    data: {
      settings: { ...currentMerged, mobileApp: next } as any,
      previousSettings: current?.settings || {},
      updatedById: userId,
    },
  });

  await logAuditAction({
    userId,
    action: "UPDATE_MOBILE_APP_SETTINGS",
    entity: "SurfboardSettings",
    entityId: record.id,
    changes: createChangeLog({
      minimumAndroidVersion: next.minimumAndroidVersion || "none",
      minimumIosVersion: next.minimumIosVersion || "none",
      signInEnabled: next.signInEnabled,
    }),
  });

  return next;
}

export async function getSettingsHistory() {
  const history = await prisma.surfboardSettings.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      updatedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return history.map((h) => ({
    id: h.id,
    settings: h.settings as any,
    previousSettings: h.previousSettings as any,
    updatedAt: h.updatedAt,
    updatedBy: h.updatedBy,
  }));
}

export async function revertToPreviousSettings(
  userId: string,
  settingsId: string
) {
  const targetSettings = await prisma.surfboardSettings.findUnique({
    where: { id: settingsId },
  });
  if (!targetSettings) throw new NotFoundError("Settings");

  // Going back to an earlier version must not bring back an earlier minimum
  // app version or switch sign-in back on: the mobile controls stay as they are.
  const mobileApp = await getMobileAppSettings();

  const revertedSettings = await prisma.surfboardSettings.create({
    data: {
      settings: {
        ...((targetSettings.previousSettings as object | null) ?? {}),
        mobileApp,
      } as any,
      previousSettings: targetSettings.settings ?? {},
      updatedById: userId,
    },
  });

  await logAuditAction({
    userId,
    action: "REVERT_SETTINGS",
    entity: "SurfboardSettings",
    entityId: revertedSettings.id,
    changes: createChangeLog({
      revertedFrom: settingsId,
      revertedTo: (targetSettings.previousSettings as any) || {},
    }),
  });

  return { success: true };
}

export async function resetToDefaultSettings(userId: string) {
  const currentSettings = await prisma.surfboardSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  // "Reset to default" covers the fees and texts on the settings page, not the
  // mobile controls: a reset must not lift a forced update or re-open sign-in.
  const mobileApp = await getMobileAppSettings();

  const newSettingsRecord = await prisma.surfboardSettings.create({
    data: {
      settings: { ...DEFAULT_SETTINGS, mobileApp } as any,
      previousSettings: currentSettings?.settings || {},
      updatedById: userId,
    },
  });

  await logAuditAction({
    userId,
    action: "RESET_SETTINGS",
    entity: "SurfboardSettings",
    entityId: newSettingsRecord.id,
    changes: createChangeLog({ status: "Reset to default settings" }),
  });

  return { success: true };
}

export async function toggleUserKycValidation(
  userId: string,
  status: boolean,
  actorId?: string
) {
  await prisma.surfboardUser.update({
    where: { id: userId },
    data: { isKycValidated: status },
  });
  await writeAudit(Platform.SURFBOARD, {
    userId: actorId,
    action: status ? "VALIDATE_KYC" : "REVOKE_KYC",
    entity: "SurfboardUser",
    entityId: userId,
    changes: { isKycValidated: status },
  });
  return { success: true };
}

export async function sendAccountUpdateInquiry(
  userId: string,
  details: string
) {
  const dbUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      surconRegNumber: true,
    },
  });
  if (!dbUser) throw new NotFoundError("User");

  const emailHtml = `
    <h3>Surveyor Account Update Request</h3>
    <p><strong>Name:</strong> ${dbUser.firstName} ${dbUser.lastName}</p>
    <p><strong>Email:</strong> ${dbUser.email}</p>
    <p><strong>SURCON Number:</strong> ${dbUser.surconRegNumber}</p>
    <hr />
    <h4>Requested Changes:</h4>
    <p>${details.replace(/\n/g, "<br/>")}</p>
  `;

  await sendMail({
    to: "info@twonodetechnologies.com",
    subject: "Action Required: Surveyor Account Update Request",
    html: emailHtml,
  });

  return { success: true };
}
