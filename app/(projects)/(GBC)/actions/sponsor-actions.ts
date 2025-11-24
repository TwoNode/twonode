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

    revalidatePath("/gbc2/restricted/sponsors");
    revalidatePath("/gbc2/sponsors");

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

    const sponsor = await prisma.gBCSponsor.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/gbc2/restricted/sponsors");
    revalidatePath("/gbc2/sponsors");

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

    revalidatePath("/gbc2/restricted/sponsors");
    revalidatePath("/gbc2/sponsors");

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

    revalidatePath("/gbc2/restricted/partners");
    revalidatePath("/gbc2/sponsors");

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

    revalidatePath("/gbc2/restricted/partners");
    revalidatePath("/gbc2/sponsors");

    return { success: true, message: "Partner deleted successfully" };
  } catch (error) {
    console.error("Delete partner error:", error);
    return {
      success: false,
      error: "Failed to delete partner",
    };
  }
}

// ============ GALLERY ============

export async function getGalleryItems(year?: number) {
  try {
    const where: any = { visible: true };
    if (year) {
      where.year = year;
    }

    const items = await prisma.gBCGallery.findMany({
      where,
      orderBy: [{ year: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Get gallery items error:", error);
    return {
      success: false,
      error: "Failed to fetch gallery items",
    };
  }
}

export async function getAllGalleryItems() {
  try {
    await requireAdmin();

    const items = await prisma.gBCGallery.findMany({
      orderBy: [{ year: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Get all gallery items error:", error);
    return {
      success: false,
      error: "Failed to fetch gallery items",
    };
  }
}

export async function createGBCGalleryItem(formData: FormData) {
  try {
    await requireAdmin();

    const data = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      mediaType: formData.get("mediaType") as string,
      mediaUrl: formData.get("mediaUrl") as string,
      mediaS3Key: (formData.get("mediaS3Key") as string) || undefined,
      thumbnailUrl: (formData.get("thumbnailUrl") as string) || undefined,
      thumbnailS3Key: (formData.get("thumbnailS3Key") as string) || undefined,
      year: parseInt(formData.get("year") as string),
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
    };

    const validated = gallerySchema.parse(data);

    const item = await prisma.gBCGallery.create({
      data: {
        ...validated,
        mediaS3Key: data.mediaS3Key,
        thumbnailUrl: data.thumbnailUrl,
        thumbnailS3Key: data.thumbnailS3Key,
      },
    });

    revalidatePath("/gbc2/restricted/gallery");
    revalidatePath("/gbc2/gallery");

    return { success: true, data: item };
  } catch (error) {
    console.error("Create gallery item error:", error);
    return {
      success: false,
      error: "Failed to create gallery item",
    };
  }
}

export async function updateGBCGalleryItem(id: string, formData: FormData) {
  try {
    await requireAdmin();

    const data = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      mediaType: formData.get("mediaType") as string,
      mediaUrl: formData.get("mediaUrl") as string,
      year: parseInt(formData.get("year") as string),
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
    };

    const validated = gallerySchema.parse(data);

    const item = await prisma.gBCGallery.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/gbc2/restricted/gallery");
    revalidatePath("/gbc2/gallery");

    return { success: true, data: item };
  } catch (error) {
    console.error("Update gallery item error:", error);
    return {
      success: false,
      error: "Failed to update gallery item",
    };
  }
}

export async function deleteGBCGalleryItem(id: string) {
  try {
    await requireAdmin();

    // First get the item to access S3 keys before deletion
    const item = await prisma.gBCGallery.findUnique({
      where: { id },
      select: {
        mediaS3Key: true,
        thumbnailS3Key: true,
      },
    });

    if (!item) {
      throw new Error("Gallery item not found");
    }

    // Delete from S3 if keys exist
    const deletePromises = [];
    if (item.mediaS3Key) {
      deletePromises.push(deleteFromS3(item.mediaS3Key));
    }
    if (item.thumbnailS3Key) {
      deletePromises.push(deleteFromS3(item.thumbnailS3Key));
    }

    // Wait for all S3 deletions to complete
    await Promise.all(deletePromises);

    // Then delete from database
    await prisma.gBCGallery.delete({
      where: { id },
    });

    revalidatePath("/gbc2/restricted/gallery");
    revalidatePath("/gbc2/gallery");

    return { success: true, message: "Gallery item deleted successfully" };
  } catch (error) {
    console.error("Delete gallery item error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete gallery item",
    };
  }
}
