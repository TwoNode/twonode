// src/actions/sponsor-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../utils/auth";
import {
  gallerySchema,
  partnerSchema,
  sponsorSchema,
} from "../utils/validations";
import prisma from "@/lib/prisma";
import { deleteFromS3 } from "../utils/aws-s3";

// ============ SPONSORS ============

export async function getSponsors() {
  try {
    const sponsors = await prisma.gBCSponsor.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: sponsors };
  } catch (error) {
    console.error("Get sponsors error:", error);
    return {
      success: false,
      error: "Failed to fetch sponsors",
    };
  }
}

export async function getAllSponsors() {
  try {
    await requireAdmin();

    const sponsors = await prisma.gBCSponsor.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: sponsors };
  } catch (error) {
    console.error("Get all sponsors error:", error);
    return {
      success: false,
      error: "Failed to fetch sponsors",
    };
  }
}

export async function createGBCSponsor(formData: FormData) {
  try {
    await requireAdmin();

    const data = {
      name: formData.get("name") as string,
      logo: formData.get("logo") as string,
      logoS3Key: (formData.get("logoS3Key") as string) || undefined,
      tier: formData.get("tier") as string,
      description: (formData.get("description") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
    };

    const validated = sponsorSchema.parse(data);

    const sponsor = await prisma.gBCSponsor.create({
      data: {
        ...validated,
        logoS3Key: data.logoS3Key,
      },
    });

    revalidatePath("/gbc-restricted/sponsors");
    revalidatePath("/gbc/sponsors");

    return { success: true, data: sponsor };
  } catch (error) {
    console.error("Create sponsor error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create sponsor",
    };
  }
}

export async function updateGBCSponsor(id: string, formData: FormData) {
  try {
    await requireAdmin();

    const logoS3Key = formData.get("logoS3Key") as string | null;

    const data = {
      name: formData.get("name") as string,
      logo: formData.get("logo") as string,
      tier: formData.get("tier") as string,
      description: (formData.get("description") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
    };

    const validated = sponsorSchema.parse(data);

    // If there's a new logo S3 key, we might need to delete the old one
    if (logoS3Key) {
      const currentSponsor = await prisma.gBCSponsor.findUnique({
        where: { id },
        select: { logoS3Key: true },
      });

      if (currentSponsor?.logoS3Key) {
        await deleteFromS3(currentSponsor.logoS3Key);
      }
    }

    const sponsor = await prisma.gBCSponsor.update({
      where: { id },
      data: {
        ...validated,
        ...(logoS3Key ? { logoS3Key } : {}),
      },
    });

    revalidatePath("/gbc-restricted/sponsors");
    revalidatePath("/gbc/sponsors");

    return { success: true, data: sponsor };
  } catch (error) {
    console.error("Update sponsor error:", error);
    return {
      success: false,
      error: "Failed to update sponsor",
    };
  }
}

export async function deleteGBCSponsor(id: string) {
  try {
    await requireAdmin();

    await prisma.gBCSponsor.delete({
      where: { id },
    });

    revalidatePath("/gbc-restricted/sponsors");
    revalidatePath("/gbc/sponsors");

    return { success: true, message: "Sponsor deleted successfully" };
  } catch (error) {
    console.error("Delete sponsor error:", error);
    return {
      success: false,
      error: "Failed to delete sponsor",
    };
  }
}

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
