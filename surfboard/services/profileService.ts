import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api/errors";
import { uploadFile } from "@/app/(projects)/(surfboard)/actions/awsActions";

/**
 * Migrated from app/(projects)/(surfboard)/actions/profile.ts. uploadFile
 * stays imported from awsActions.ts (a "use server" file not yet in this
 * phase's migration scope — still works as a plain async function when
 * imported server-side).
 */

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
} as const;

export async function getProfile(userId: string) {
  const dbUser = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  if (!dbUser) throw new NotFoundError("User");
  return dbUser;
}

export async function updateProfile(userId: string, formData: FormData) {
  const updates: Record<string, any> = {};

  const currentDbUser = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { isKycValidated: true } });
  if (!currentDbUser) throw new NotFoundError("User");
  const isLocked = currentDbUser.isKycValidated === true;

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
    updates.payerID = payerIDValue === "" ? null : parseInt(payerIDValue as string, 10);
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
    }
  }

  return prisma.surfboardUser.update({ where: { id: userId }, data: updates, select: PROFILE_SELECT });
}
