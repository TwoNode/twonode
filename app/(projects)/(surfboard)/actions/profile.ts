"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/surfboard/utils/surfAuth";
import { uploadFile } from "./awsActions";

// Types
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

export async function getProfile(): Promise<{
  data?: ProfileData;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.email) {
      return { error: "Unauthorized" };
    }

    const dbUser = await prisma.surfboardUser.findUnique({
      where: { email: user.email as string },
      select: {
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
      },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    return { data: dbUser };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { error: "Failed to fetch profile" };
  }
}

export async function updateProfile(
  formData: FormData
): Promise<{ data?: ProfileData; error?: string }> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user || !user.email) {
      return { error: "Unauthorized" };
    }

    const updates: Record<string, any> = {};

    const currentDbUser = await prisma.surfboardUser.findUnique({
      where: { email: user.email as string },
      select: { isKycValidated: true },
    });

    const isLocked = currentDbUser?.isKycValidated === true;

    // Handle text fields
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

    // Handle payerID (integer)
    const payerIDValue = formData.get("payerID");
    if (payerIDValue !== null && !isLocked) {
      updates.payerID =
        payerIDValue === "" ? null : parseInt(payerIDValue as string, 10);
    }

    // Handle file uploads
    const fileFields = ["logo", "signature"] as const;

    for (const field of fileFields) {
      // Signature is locked if validated, Logo is always editable
      if (isLocked && field === "signature") continue;

      // In profile.ts, replace the file upload section with:
      const file = formData.get(field) as File | null;
      if (file && file.size > 0) {
        try {
          const { url } = await uploadFile(
            file,
            field, // 'logo' or 'signature'
            user.id
          );
          updates[field] = url;
        } catch (error) {
          console.error(`Error uploading ${field}:`, error);
          // Handle error appropriately
        }
      }
    }

    // Update user in database
    const updatedUser = await prisma.surfboardUser.update({
      where: { email: user.email as string },
      data: updates,
      select: {
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
      },
    });

    // Revalidate the settings page to show updated data
    revalidatePath("/surfboard/dashboard/settings");

    return { data: updatedUser };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}
