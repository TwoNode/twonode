import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api/errors";
import { uploadFile } from "@/surfboard/services/awsService";

/** Migrated from app/(projects)/(surfboard)/actions/profile.ts. */

export type ProfilePreferences = {
  theme?: "light" | "dark";
  timezone?: string;
};

export type ProfileData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  prefix: string | null;
  suffix: string | null;
  companyName: string | null;
  surconRegNumber: string | null;
  surconRegName: string | null;
  residenceState: string | null;
  logo: string | null;
  signature: string | null;
  phoneNumber: string | null;
  address: string | null;
  payerID: number | null;
  payerIDType: string | null;
  isKycValidated: boolean;
  emailVerified: boolean;
  preferences: ProfilePreferences;
};

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  prefix: true,
  suffix: true,
  companyName: true,
  surconRegNumber: true,
  surconRegName: true,
  residenceState: true,
  logo: true,
  signature: true,
  phoneNumber: true,
  address: true,
  payerID: true,
  payerIDType: true,
  isKycValidated: true,
  emailVerified: true,
  metadata: true,
} as const;

/** metadata is a free-form Json? column — only ever expect a plain object here. */
function readPreferences(metadata: unknown): ProfilePreferences {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return {};
  const preferences = (metadata as Record<string, unknown>).preferences;
  if (
    !preferences ||
    typeof preferences !== "object" ||
    Array.isArray(preferences)
  )
    return {};
  return preferences as ProfilePreferences;
}

export async function getProfile(userId: string) {
  const dbUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });
  if (!dbUser) throw new NotFoundError("User");
  const { metadata, ...rest } = dbUser;
  return { ...rest, preferences: readPreferences(metadata) };
}

export async function updateProfile(userId: string, formData: FormData) {
  const updates: Record<string, any> = {};

  const currentDbUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { isKycValidated: true, metadata: true },
  });
  if (!currentDbUser) throw new NotFoundError("User");
  const isLocked = currentDbUser.isKycValidated === true;

  const theme = formData.get("theme");
  const timezone = formData.get("timezone");
  if (theme !== null || timezone !== null) {
    const currentPreferences = readPreferences(currentDbUser.metadata);
    const currentMetadata =
      currentDbUser.metadata &&
      typeof currentDbUser.metadata === "object" &&
      !Array.isArray(currentDbUser.metadata)
        ? (currentDbUser.metadata as Record<string, unknown>)
        : {};
    updates.metadata = {
      ...currentMetadata,
      preferences: {
        ...currentPreferences,
        ...(theme === "light" || theme === "dark" ? { theme } : {}),
        ...(typeof timezone === "string" && timezone ? { timezone } : {}),
      },
    };
  }

  const textFields = [
    "firstName",
    "lastName",
    "prefix",
    "suffix",
    "companyName",
    "surconRegNumber",
    "surconRegName",
    "residenceState",
    "phoneNumber",
    "address",
    "payerIDType",
  ] as const;

  textFields.forEach((field) => {
    const value = formData.get(field);
    if (value !== null && !isLocked) {
      updates[field] = value === "" ? null : value;
    }
  });

  const payerIDValue = formData.get("payerID");
  if (payerIDValue !== null && !isLocked) {
    updates.payerID =
      payerIDValue === "" ? null : parseInt(payerIDValue as string, 10);
  }

  const fileFields = ["logo", "signature"] as const;
  for (const field of fileFields) {
    if (isLocked && field === "signature") continue;

    const file = formData.get(field) as File | null;
    if (file && file.size > 0) {
      try {
        const { url } = await uploadFile(file, field, userId);
        updates[field] = url;
      } catch (error) {
        console.error(`Error uploading ${field}:`, error);
      }
    } else if (formData.get(`remove-${field}`) === "true") {
      updates[field] = null;
    }
  }

  const updated = await prisma.surfboardUser.update({
    where: { id: userId },
    data: updates,
    select: PROFILE_SELECT,
  });
  const { metadata, ...rest } = updated;
  return { ...rest, preferences: readPreferences(metadata) };
}
