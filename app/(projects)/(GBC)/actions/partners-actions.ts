// src/actions/partner-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../utils/auth";
import { partnerSchema } from "../utils/validations";
import prisma from "@/lib/prisma";

// ============ PARTNERS ============

export async function getPartners() {
  try {
    const partners = await prisma.gBCPartner.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: partners };
  } catch (error) {
    console.error("Get partners error:", error);
    return {
      success: false,
      error: "Failed to fetch partners",
    };
  }
}

export async function createGBCPartner(formData: FormData) {
  try {
    await requireAdmin();

    const data = {
      name: formData.get("name") as string,
      logo: formData.get("logo") as string,
      logoS3Key: (formData.get("logoS3Key") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
    };

    const validated = partnerSchema.parse(data);

    const partner = await prisma.gBCPartner.create({
      data: {
        ...validated,
        logoS3Key: data.logoS3Key,
      },
    });

    revalidatePath("/gbc-restricted/partners");
    revalidatePath("/gbc/sponsors");

    return { success: true, data: partner };
  } catch (error) {
    console.error("Create partner error:", error);
    return {
      success: false,
      error: "Failed to create partner",
    };
  }
}

export async function deleteGBCPartner(id: string) {
  try {
    await requireAdmin();

    await prisma.gBCPartner.delete({
      where: { id },
    });

    revalidatePath("/gbc-restricted/partners");
    revalidatePath("/gbc/sponsors");

    return { success: true, message: "Partner deleted successfully" };
  } catch (error) {
    console.error("Delete partner error:", error);
    return {
      success: false,
      error: "Failed to delete partner",
    };
  }
}
