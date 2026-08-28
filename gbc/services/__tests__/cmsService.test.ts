import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the parts with real behavior: S3 cleanup ordering on
 * delete/update (gallery deletes both media+thumbnail keys, sponsor update
 * only deletes the old logo once a new one is confirmed, speaker delete's
 * S3 failure is non-critical), and the upload validators (type/size limits
 * moved here from upload-actions.ts's per-function duplicated checks).
 */

const mockPrisma = vi.hoisted(() => ({
  gBCGallery: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  gBCSponsor: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  gBCPartner: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
  gBCSpeaker: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

const mockAwsS3 = vi.hoisted(() => ({
  deleteFromS3: vi.fn().mockResolvedValue(undefined),
  deleteMultipleFromS3: vi.fn().mockResolvedValue(undefined),
  uploadLogo: vi.fn().mockResolvedValue({ url: "u", key: "k" }),
  uploadSpeakerPhoto: vi.fn().mockResolvedValue({ url: "u", key: "k" }),
  uploadGalleryMedia: vi.fn().mockResolvedValue({ url: "u", key: "k" }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/utils/aws-s3", () => mockAwsS3);

const {
  deleteGalleryItem,
  updateSponsor,
  deleteSpeaker,
  uploadSponsorLogo,
  uploadGalleryMedia: uploadGalleryMediaSvc,
  deleteFile,
  deleteFiles,
  getUploadLimits,
} = await import("@/gbc/services/cmsService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteGalleryItem", () => {
  it("throws NotFoundError for an unknown id", async () => {
    mockPrisma.gBCGallery.findUnique.mockResolvedValue(null);
    await expect(deleteGalleryItem("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("deletes both the media and thumbnail S3 objects before the DB row", async () => {
    mockPrisma.gBCGallery.findUnique.mockResolvedValue({ mediaS3Key: "media-key", thumbnailS3Key: "thumb-key" });
    await deleteGalleryItem("g1");
    expect(mockAwsS3.deleteFromS3).toHaveBeenCalledWith("media-key");
    expect(mockAwsS3.deleteFromS3).toHaveBeenCalledWith("thumb-key");
    expect(mockPrisma.gBCGallery.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });

  it("skips S3 deletion entirely when neither key is set", async () => {
    mockPrisma.gBCGallery.findUnique.mockResolvedValue({ mediaS3Key: null, thumbnailS3Key: null });
    await deleteGalleryItem("g1");
    expect(mockAwsS3.deleteFromS3).not.toHaveBeenCalled();
  });
});

describe("updateSponsor", () => {
  it("does not touch S3 when no new logo is provided", async () => {
    mockPrisma.gBCSponsor.update.mockResolvedValue({});
    await updateSponsor("s1", { name: "Acme" } as any);
    expect(mockAwsS3.deleteFromS3).not.toHaveBeenCalled();
    expect(mockPrisma.gBCSponsor.findUnique).not.toHaveBeenCalled();
  });

  it("deletes the old logo only after confirming the sponsor exists", async () => {
    mockPrisma.gBCSponsor.findUnique.mockResolvedValue({ logoS3Key: "old-key" });
    mockPrisma.gBCSponsor.update.mockResolvedValue({});
    await updateSponsor("s1", { name: "Acme" } as any, "new-key");
    expect(mockAwsS3.deleteFromS3).toHaveBeenCalledWith("old-key");
    expect(mockPrisma.gBCSponsor.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { name: "Acme", logoS3Key: "new-key" },
    });
  });

  it("throws NotFoundError when a new logo is provided for a nonexistent sponsor", async () => {
    mockPrisma.gBCSponsor.findUnique.mockResolvedValue(null);
    await expect(updateSponsor("nope", { name: "Acme" } as any, "new-key")).rejects.toMatchObject({ status: 404 });
  });
});

describe("deleteSpeaker", () => {
  it("still succeeds if the S3 photo delete fails (non-critical)", async () => {
    mockPrisma.gBCSpeaker.findUnique.mockResolvedValue({ photoS3Key: "photo-key" });
    mockAwsS3.deleteFromS3.mockRejectedValueOnce(new Error("s3 down"));
    await expect(deleteSpeaker("sp1")).resolves.toBeUndefined();
    expect(mockPrisma.gBCSpeaker.delete).toHaveBeenCalledWith({ where: { id: "sp1" } });
  });
});

describe("upload validators", () => {
  it("rejects a non-image sponsor logo", async () => {
    await expect(uploadSponsorLogo(Buffer.from(""), "f.pdf", "application/pdf", 100)).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an oversized sponsor logo (>5MB)", async () => {
    await expect(uploadSponsorLogo(Buffer.from(""), "f.png", "image/png", 6 * 1024 * 1024)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("accepts a valid sponsor logo", async () => {
    const result = await uploadSponsorLogo(Buffer.from(""), "f.png", "image/png", 1024);
    expect(result).toEqual({ url: "u", key: "k" });
  });

  it("rejects gallery media that's neither image nor video", async () => {
    await expect(uploadGalleryMediaSvc(Buffer.from(""), "f.pdf", "application/pdf", 100)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("allows a video up to 100MB but rejects one over", async () => {
    await expect(uploadGalleryMediaSvc(Buffer.from(""), "f.mp4", "video/mp4", 50 * 1024 * 1024)).resolves.toBeDefined();
    await expect(
      uploadGalleryMediaSvc(Buffer.from(""), "f.mp4", "video/mp4", 101 * 1024 * 1024)
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("deleteFile / deleteFiles", () => {
  it("delegates single-key delete to deleteFromS3", async () => {
    await deleteFile("k1");
    expect(mockAwsS3.deleteFromS3).toHaveBeenCalledWith("k1");
  });

  it("delegates multi-key delete to deleteMultipleFromS3", async () => {
    await deleteFiles(["k1", "k2"]);
    expect(mockAwsS3.deleteMultipleFromS3).toHaveBeenCalledWith(["k1", "k2"]);
  });
});

describe("getUploadLimits", () => {
  it("returns the four upload categories", () => {
    const limits = getUploadLimits();
    expect(Object.keys(limits)).toEqual(["logo", "photo", "image", "video"]);
  });
});
