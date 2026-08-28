import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import {
  deleteFromS3,
  deleteMultipleFromS3,
  uploadLogo,
  uploadSpeakerPhoto,
  uploadGalleryMedia as uploadGalleryMediaToS3,
} from "@/app/(projects)/(GBC)/utils/aws-s3";

/**
 * Migrated from gallery-actions.ts + sponsor-actions.ts + speaker-actions.ts
 * + upload-actions.ts (minus dead partners-actions.ts — sponsor-actions.ts's
 * partner functions are the canonical, live copy). Pure Prisma/S3, throws
 * typed errors instead of {success:false}. See phase-4-gbc.md's cmsService
 * section for the source-file mapping.
 */

// ============ GALLERY ============

export async function getGalleryItems(year?: number) {
  const where: Prisma.GBCGalleryWhereInput = { visible: true };
  if (year) where.year = year;
  return prisma.gBCGallery.findMany({ where, orderBy: [{ year: "desc" }, { order: "asc" }, { createdAt: "desc" }] });
}

export async function getAllGalleryItems() {
  return prisma.gBCGallery.findMany({ orderBy: [{ year: "desc" }, { order: "asc" }, { createdAt: "desc" }] });
}

export type GalleryItemInput = Omit<Prisma.GBCGalleryCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createGalleryItem(data: GalleryItemInput) {
  return prisma.gBCGallery.create({ data });
}

export async function updateGalleryItem(id: string, data: GalleryItemInput) {
  return prisma.gBCGallery.update({ where: { id }, data });
}

export async function deleteGalleryItem(id: string) {
  const item = await prisma.gBCGallery.findUnique({ where: { id }, select: { mediaS3Key: true, thumbnailS3Key: true } });
  if (!item) throw new NotFoundError("Gallery item");

  await Promise.all(
    [item.mediaS3Key, item.thumbnailS3Key].filter((key): key is string => !!key).map((key) => deleteFromS3(key))
  );
  await prisma.gBCGallery.delete({ where: { id } });
}

// ============ SPONSORS ============

export async function getSponsors() {
  return prisma.gBCSponsor.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function getAllSponsors() {
  return prisma.gBCSponsor.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export type SponsorInput = Omit<Prisma.GBCSponsorCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createSponsor(data: SponsorInput) {
  return prisma.gBCSponsor.create({ data });
}

/** If a new logo was uploaded (newLogoS3Key set), the old S3 object is deleted after the DB write succeeds. */
export async function updateSponsor(id: string, data: SponsorInput, newLogoS3Key?: string) {
  if (newLogoS3Key) {
    const current = await prisma.gBCSponsor.findUnique({ where: { id }, select: { logoS3Key: true } });
    if (!current) throw new NotFoundError("Sponsor");
    if (current.logoS3Key) await deleteFromS3(current.logoS3Key);
  }
  return prisma.gBCSponsor.update({
    where: { id },
    data: { ...data, ...(newLogoS3Key ? { logoS3Key: newLogoS3Key } : {}) },
  });
}

export async function deleteSponsor(id: string) {
  await prisma.gBCSponsor.delete({ where: { id } });
}

// ============ PARTNERS ============
// No admin-list/update routes exist in the source — not invented here either;
// partner management works off the same public-visible list, create+delete only.

export async function getPartners() {
  return prisma.gBCPartner.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export type PartnerInput = Omit<Prisma.GBCPartnerCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createPartner(data: PartnerInput) {
  return prisma.gBCPartner.create({ data });
}

export async function deletePartner(id: string) {
  await prisma.gBCPartner.delete({ where: { id } });
}

// ============ SPEAKERS ============

export async function getSpeakers() {
  return prisma.gBCSpeaker.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function getAllSpeakers() {
  return prisma.gBCSpeaker.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export type SpeakerInput = Omit<Prisma.GBCSpeakerCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createSpeaker(data: SpeakerInput) {
  return prisma.gBCSpeaker.create({ data });
}

export async function updateSpeaker(id: string, data: SpeakerInput) {
  return prisma.gBCSpeaker.update({ where: { id }, data });
}

export async function deleteSpeaker(id: string) {
  const speaker = await prisma.gBCSpeaker.findUnique({ where: { id } });
  if (!speaker) throw new NotFoundError("Speaker");

  await prisma.gBCSpeaker.delete({ where: { id } });

  if (speaker.photoS3Key) {
    try {
      await deleteFromS3(speaker.photoS3Key);
    } catch (error) {
      // Non-critical — the database record is already gone, an orphaned S3 object isn't worth failing the request over.
      console.error("Failed to delete speaker photo from S3:", error);
    }
  }
}

// ============ UPLOADS ============

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const LOGO_MAX_SIZE = 5 * 1024 * 1024;
const GALLERY_IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const GALLERY_VIDEO_MAX_SIZE = 100 * 1024 * 1024;

function assertUploadValid(contentType: string, size: number, allowedTypes: string[], maxSize: number, maxLabel: string) {
  if (!allowedTypes.some((t) => contentType.startsWith(t.split("/")[0] + "/"))) {
    throw new ValidationError({ file: "Unsupported file type" });
  }
  if (size > maxSize) {
    throw new ValidationError({ file: `File size must be less than ${maxLabel}` });
  }
}

export async function uploadSponsorLogo(file: Buffer, fileName: string, contentType: string, size: number) {
  assertUploadValid(contentType, size, IMAGE_TYPES, LOGO_MAX_SIZE, "5MB");
  return uploadLogo(file, fileName, "sponsor");
}

export async function uploadPartnerLogo(file: Buffer, fileName: string, contentType: string, size: number) {
  assertUploadValid(contentType, size, IMAGE_TYPES, LOGO_MAX_SIZE, "5MB");
  return uploadLogo(file, fileName, "partner");
}

export async function uploadSpeakerPhotoFile(file: Buffer, fileName: string, contentType: string, size: number) {
  assertUploadValid(contentType, size, IMAGE_TYPES, LOGO_MAX_SIZE, "5MB");
  return uploadSpeakerPhoto(file, fileName);
}

export async function uploadGalleryMedia(file: Buffer, fileName: string, contentType: string, size: number) {
  const isVideo = contentType.startsWith("video/");
  if (!contentType.startsWith("image/") && !isVideo) {
    throw new ValidationError({ file: "Only images and videos are allowed" });
  }
  const maxSize = isVideo ? GALLERY_VIDEO_MAX_SIZE : GALLERY_IMAGE_MAX_SIZE;
  if (size > maxSize) {
    throw new ValidationError({ file: `File size must be less than ${isVideo ? "100MB" : "10MB"}` });
  }
  return uploadGalleryMediaToS3(file, fileName, contentType);
}

export async function deleteFile(key: string) {
  await deleteFromS3(key);
}

export async function deleteFiles(keys: string[]) {
  await deleteMultipleFromS3(keys);
}

export function getUploadLimits() {
  return {
    logo: { maxSize: LOGO_MAX_SIZE, allowedTypes: IMAGE_TYPES },
    photo: { maxSize: LOGO_MAX_SIZE, allowedTypes: IMAGE_TYPES },
    image: { maxSize: GALLERY_IMAGE_MAX_SIZE, allowedTypes: IMAGE_TYPES },
    video: { maxSize: GALLERY_VIDEO_MAX_SIZE, allowedTypes: VIDEO_TYPES },
  };
}
