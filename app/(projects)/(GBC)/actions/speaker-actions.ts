// src/actions/speaker-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../utils/auth";
import { speakerSchema } from "../utils/validations";
import prisma from "@/lib/prisma";
import { deleteFromS3 } from "../utils/aws-s3";

// ============ SPEAKERS ============

export async function getSpeakers() {
  try {
    const speakers = await prisma.gBCSpeaker.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: speakers };
  } catch (error) {
    console.error("Get speakers error:", error);
    return {
      success: false,
      error: "Failed to fetch speakers",
    };
  }
}

export async function getAllSpeakers() {
  try {
    await requireAdmin();

    const speakers = await prisma.gBCSpeaker.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: speakers };
  } catch (error) {
    console.error("Get all speakers error:", error);
    return {
      success: false,
      error: "Failed to fetch speakers",
    };
  }
}

export async function createGBCSpeaker(formData: FormData) {
  try {
    await requireAdmin();

    const data = {
      name: formData.get("name") as string,
      title: formData.get("title") as string,
      bio: formData.get("bio") as string,
      photo: formData.get("photo") as string,
      photoS3Key: (formData.get("photoS3Key") as string) || undefined,
      tier: formData.get("tier") as string,
      company: (formData.get("company") as string) || undefined,
      linkedin: (formData.get("linkedin") as string) || undefined,
      twitter: (formData.get("twitter") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
      featured: formData.get("featured") === "true",
    };

    const validated = speakerSchema.parse(data);

    const speaker = await prisma.gBCSpeaker.create({
      data: {
        ...validated,
        photoS3Key: data.photoS3Key,
      },
    });

    revalidatePath("/gbc/restricted/speakers");
    revalidatePath("/gbc/speakers");

    return { success: true, data: speaker };
  } catch (error) {
    console.error("Create speaker error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create speaker",
    };
  }
}

export async function updateGBCSpeaker(id: string, formData: FormData) {
  try {
    await requireAdmin();

    const data = {
      name: formData.get("name") as string,
      title: formData.get("title") as string,
      bio: formData.get("bio") as string,
      photo: formData.get("photo") as string,
      tier: formData.get("tier") as string,
      company: (formData.get("company") as string) || undefined,
      linkedin: (formData.get("linkedin") as string) || undefined,
      twitter: (formData.get("twitter") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
      visible: formData.get("visible") === "true",
      featured: formData.get("featured") === "true",
    };

    const validated = speakerSchema.parse(data);

    const speaker = await prisma.gBCSpeaker.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/gbc/restricted/speakers");
    revalidatePath("/gbc/speakers");

    return { success: true, data: speaker };
  } catch (error) {
    console.error("Update speaker error:", error);
    return {
      success: false,
      error: "Failed to update speaker",
    };
  }
}

export async function deleteGBCSpeaker(id: string) {
  try {
    await requireAdmin();

    // Get speaker to find S3 key for cleanup
    const speaker = await prisma.gBCSpeaker.findUnique({
      where: { id },
    });

    // Delete from database
    await prisma.gBCSpeaker.delete({
      where: { id },
    });

    // Delete photo from S3 if it exists
    if (speaker?.photoS3Key) {
      try {
        await deleteFromS3(speaker.photoS3Key);
      } catch (error) {
        console.error("Failed to delete S3 file:", error);
        // Continue anyway, as the database record is already deleted
      }
    }

    revalidatePath("/gbc/restricted/speakers");
    revalidatePath("/gbc/speakers");

    return { success: true, message: "Speaker deleted successfully" };
  } catch (error) {
    console.error("Delete speaker error:", error);
    return {
      success: false,
      error: "Failed to delete speaker",
    };
  }
}
