import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import {
  deleteFromS3,
  deleteMultipleFromS3,
  uploadLogo,
  uploadSpeakerPhoto,
  uploadGalleryMedia as uploadGalleryMediaToS3,
} from "@/gbc/utils/aws-s3";
import { getActiveEdition } from "@/gbc/services/editionService";
import { assertSponsorTierExists } from "@/gbc/services/sponsorTierService";
import { paginateQuery } from "@/lib/api/pagination";
import type { GallerySort } from "@/gbc/types/gallery";

/** Resolves a caller-supplied edition key, falling back to the currently
 * active edition, and finally to undefined (no filter / DB default) if
 * neither is set — e.g. before any edition has been activated yet. */
async function resolveEdition(edition?: string): Promise<string | undefined> {
  if (edition) return edition;
  const active = await getActiveEdition();
  return active?.key;
}

/**
 * Migrated from gallery-actions.ts + sponsor-actions.ts + speaker-actions.ts
 * + upload-actions.ts (minus dead partners-actions.ts — sponsor-actions.ts's
 * partner functions are the canonical, live copy). Pure Prisma/S3, throws
 * typed errors instead of {success:false}. See phase-4-gbc.md's cmsService
 * section for the source-file mapping.
 */

// ============ GALLERY ============

// Every gallery screen groups items by edition, so the newest edition leads
// every ordering — a page can then never straddle an edition in a different
// order than the grid draws it.
const NEWEST_EDITION_FIRST: Prisma.GBCGalleryOrderByWithRelationInput = { editionRef: { startDate: "desc" } };

export async function getGalleryItems(year?: number, edition?: string) {
  const where: Prisma.GBCGalleryWhereInput = { visible: true };
  if (year) where.year = year;
  if (edition) where.edition = edition;
  return prisma.gBCGallery.findMany({
    where,
    orderBy: [NEWEST_EDITION_FIRST, { order: "asc" }, { createdAt: "desc" }],
  });
}

export async function getAllGalleryItems(edition?: string) {
  return prisma.gBCGallery.findMany({
    where: edition ? { edition } : {},
    orderBy: [NEWEST_EDITION_FIRST, { order: "asc" }, { createdAt: "desc" }],
  });
}

// `id` is a tie-breaker so offset pages stay stable between requests.
const GALLERY_ORDER_BY: Record<GallerySort, Prisma.GBCGalleryOrderByWithRelationInput[]> = {
  order: [NEWEST_EDITION_FIRST, { order: "asc" }, { createdAt: "desc" }, { id: "asc" }],
  newest: [NEWEST_EDITION_FIRST, { createdAt: "desc" }, { id: "asc" }],
  oldest: [NEWEST_EDITION_FIRST, { createdAt: "asc" }, { id: "asc" }],
  "name-asc": [NEWEST_EDITION_FIRST, { title: "asc" }, { id: "asc" }],
  "name-desc": [NEWEST_EDITION_FIRST, { title: "desc" }, { id: "asc" }],
};

export interface GalleryListParams {
  page: number;
  pageSize: number;
  search?: string;
  mediaType?: "IMAGE" | "VIDEO";
  edition?: string;
  sort?: GallerySort;
}

/** Paginated/searchable/filterable sibling of getAllGalleryItems() — the admin Gallery page. */
export async function getGalleryItemsPaginated(params: GalleryListParams) {
  const { page, pageSize, search, mediaType, edition, sort = "order" } = params;

  const where: Prisma.GBCGalleryWhereInput = {};
  if (mediaType) where.mediaType = mediaType;
  if (edition) where.edition = edition;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return paginateQuery(
    (skip, take) => prisma.gBCGallery.findMany({ where, orderBy: GALLERY_ORDER_BY[sort], skip, take }),
    () => prisma.gBCGallery.count({ where }),
    page,
    pageSize
  );
}

export type GalleryItemInput = Omit<Prisma.GBCGalleryUncheckedCreateInput, "id" | "createdAt" | "updatedAt" | "year"> & {
  /** Omitted, it's derived from the edition's start date. */
  year?: number;
};

/**
 * Picks the edition an item belongs to (supplied, else the active one, else
 * the schema default) and the calendar year that goes with it. The lookup
 * doubles as validation: an unknown key becomes a 400 instead of a raw
 * foreign-key error.
 */
async function resolveGalleryEdition(input: { edition?: string; year?: number }): Promise<{ edition: string; year: number }> {
  const key = (await resolveEdition(input.edition)) ?? "2.0";
  const row = await prisma.gBCEdition.findUnique({ where: { key }, select: { startDate: true } });
  if (!row) throw new ValidationError({ edition: `Unknown edition "${key}"` });
  return { edition: key, year: input.year ?? row.startDate.getUTCFullYear() };
}

export async function createGalleryItem(data: GalleryItemInput) {
  const { edition, year } = await resolveGalleryEdition(data);
  return prisma.gBCGallery.create({ data: { ...data, edition, year } });
}

export async function updateGalleryItem(id: string, data: Partial<GalleryItemInput>) {
  // Only re-derive when the edition is actually being changed — an edit that
  // leaves it alone must not silently move the item to the active edition.
  if (!data.edition) return prisma.gBCGallery.update({ where: { id }, data });

  const { edition, year } = await resolveGalleryEdition({ edition: data.edition, year: data.year });
  return prisma.gBCGallery.update({ where: { id }, data: { ...data, edition, year } });
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

/** Public-facing — defaults to the active edition when none is given, so the
 * live site only ever shows the current event's sponsors by default. */
export async function getSponsors(edition?: string) {
  const resolvedEdition = await resolveEdition(edition);
  const where: Prisma.GBCSponsorWhereInput = { visible: true };
  if (resolvedEdition) where.edition = resolvedEdition;
  return prisma.gBCSponsor.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

/** Admin-facing — includes hidden rows; no active-edition default, since an
 * admin browsing "all sponsors" should see every edition unless they
 * explicitly filter down via the edition selector. */
export async function getAllSponsors(edition?: string) {
  const where: Prisma.GBCSponsorWhereInput = {};
  if (edition) where.edition = edition;
  return prisma.gBCSponsor.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export type SponsorInput = Omit<Prisma.GBCSponsorUncheckedCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createSponsor(data: SponsorInput) {
  await assertSponsorTierExists(data.tier);
  const edition = await resolveEdition((data as { edition?: string }).edition);
  return prisma.gBCSponsor.create({ data: edition ? { ...data, edition } : data });
}

/** If a new logo was uploaded (newLogoS3Key set), the old S3 object is deleted after the DB write succeeds. */
export async function updateSponsor(id: string, data: SponsorInput, newLogoS3Key?: string) {
  if (data.tier !== undefined) await assertSponsorTierExists(data.tier);
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

export async function getPartners(edition?: string) {
  const resolvedEdition = await resolveEdition(edition);
  const where: Prisma.GBCPartnerWhereInput = { visible: true };
  if (resolvedEdition) where.edition = resolvedEdition;
  return prisma.gBCPartner.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export type PartnerInput = Omit<Prisma.GBCPartnerUncheckedCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createPartner(data: PartnerInput) {
  const edition = await resolveEdition((data as { edition?: string }).edition);
  return prisma.gBCPartner.create({ data: edition ? { ...data, edition } : data });
}

export async function deletePartner(id: string) {
  await prisma.gBCPartner.delete({ where: { id } });
}

// ============ SPEAKERS ============

/** Public-facing — defaults to the active edition when none is given, so the
 * live site only ever shows the current event's speakers by default. */
export async function getSpeakers(edition?: string) {
  const resolvedEdition = await resolveEdition(edition);
  const where: Prisma.GBCSpeakerWhereInput = { visible: true };
  if (resolvedEdition) where.edition = resolvedEdition;
  return prisma.gBCSpeaker.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

/** Admin-facing — includes hidden rows; no active-edition default, since an
 * admin browsing "all speakers" should see every edition unless they
 * explicitly filter down via the edition selector. */
export async function getAllSpeakers(edition?: string) {
  const where: Prisma.GBCSpeakerWhereInput = {};
  if (edition) where.edition = edition;
  return prisma.gBCSpeaker.findMany({ where, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export type SpeakerInput = Omit<Prisma.GBCSpeakerUncheckedCreateInput, "id" | "createdAt" | "updatedAt">;

export async function createSpeaker(data: SpeakerInput) {
  const edition = await resolveEdition((data as { edition?: string }).edition);
  return prisma.gBCSpeaker.create({ data: edition ? { ...data, edition } : data });
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
