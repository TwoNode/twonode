import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the parts with real behavior: S3 cleanup ordering on
 * delete/update (gallery deletes both media+thumbnail keys, sponsor update
 * only deletes the old logo once a new one is confirmed, speaker delete's
 * S3 failure is non-critical), and the upload validators (type/size limits
 * moved here from upload-actions.ts's per-function duplicated checks).
 */

const mockPrisma = vi.hoisted(() => ({
  gBCGallery: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  gBCSponsor: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  gBCPartner: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
  gBCSpeaker: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  gBCEdition: { findFirst: vi.fn() },
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
  getSpeakers,
  getAllSpeakers,
  getSponsors,
  getAllSponsors,
  getPartners,
  createSpeaker,
  createSponsor,
  createPartner,
  deleteGalleryItem,
  getGalleryItemsPaginated,
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
  mockPrisma.gBCEdition.findFirst.mockResolvedValue(null);
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

const activeEditionRow = {
  key: "3.0",
  name: "GBC 3.0",
  theme: "T",
  subTheme: "S",
  venue: "V",
  startDate: new Date("2027-04-30"),
  endDate: new Date("2027-04-30"),
  status: "ACTIVE",
  ticketPrefix: "GBC3",
};

describe("edition scoping — public lists", () => {
  const cases = [
    ["getSpeakers", getSpeakers, mockPrisma.gBCSpeaker],
    ["getSponsors", getSponsors, mockPrisma.gBCSponsor],
    ["getPartners", getPartners, mockPrisma.gBCPartner],
  ] as const;

  it.each(cases)("%s defaults to the active edition when none is given", async (_name, fn, model) => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(activeEditionRow);
    await fn();
    expect(model.findMany.mock.calls[0][0].where).toEqual({ visible: true, edition: "3.0" });
  });

  it.each(cases)("%s uses an explicit edition and never looks up the active one", async (_name, fn, model) => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(activeEditionRow);
    await fn("1.0");
    expect(model.findMany.mock.calls[0][0].where).toEqual({ visible: true, edition: "1.0" });
    expect(mockPrisma.gBCEdition.findFirst).not.toHaveBeenCalled();
  });

  it.each(cases)("%s applies no edition filter when nothing is active (site must not go blank)", async (_name, fn, model) => {
    await fn();
    expect(model.findMany.mock.calls[0][0].where).toEqual({ visible: true });
  });
});

describe("edition scoping — admin lists", () => {
  const cases = [
    ["getAllSpeakers", getAllSpeakers, mockPrisma.gBCSpeaker],
    ["getAllSponsors", getAllSponsors, mockPrisma.gBCSponsor],
  ] as const;

  it.each(cases)("%s returns every edition by default, even when one is active", async (_name, fn, model) => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(activeEditionRow);
    await fn();
    expect(model.findMany.mock.calls[0][0].where).toEqual({});
    expect(mockPrisma.gBCEdition.findFirst).not.toHaveBeenCalled();
  });

  it.each(cases)("%s filters to one edition when asked", async (_name, fn, model) => {
    await fn("2.0");
    expect(model.findMany.mock.calls[0][0].where).toEqual({ edition: "2.0" });
  });
});

describe("edition scoping — creates", () => {
  const cases = [
    ["createSpeaker", createSpeaker, mockPrisma.gBCSpeaker],
    ["createSponsor", createSponsor, mockPrisma.gBCSponsor],
    ["createPartner", createPartner, mockPrisma.gBCPartner],
  ] as const;

  it.each(cases)("%s defaults a new row to the active edition", async (_name, fn, model) => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(activeEditionRow);
    await fn({ name: "X" } as never);
    expect(model.create.mock.calls[0][0].data).toEqual({ name: "X", edition: "3.0" });
  });

  it.each(cases)("%s keeps an explicitly chosen edition", async (_name, fn, model) => {
    mockPrisma.gBCEdition.findFirst.mockResolvedValue(activeEditionRow);
    await fn({ name: "X", edition: "1.0" } as never);
    expect(model.create.mock.calls[0][0].data).toEqual({ name: "X", edition: "1.0" });
  });

  it.each(cases)("%s leaves edition unset when none is chosen or active (DB default applies)", async (_name, fn, model) => {
    await fn({ name: "X" } as never);
    expect(model.create.mock.calls[0][0].data).toEqual({ name: "X" });
  });
});

describe("getGalleryItemsPaginated", () => {
  it("defaults to display order, year first, with an id tie-breaker for stable pages", async () => {
    mockPrisma.gBCGallery.findMany.mockResolvedValue([]);
    mockPrisma.gBCGallery.count.mockResolvedValue(0);

    await getGalleryItemsPaginated({ page: 1, pageSize: 20 });

    expect(mockPrisma.gBCGallery.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ year: "desc" }, { order: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      skip: 0,
      take: 20,
    });
  });

  it("filters by media type and searches title and description case-insensitively", async () => {
    mockPrisma.gBCGallery.findMany.mockResolvedValue([]);
    mockPrisma.gBCGallery.count.mockResolvedValue(0);

    await getGalleryItemsPaginated({ page: 1, pageSize: 20, mediaType: "VIDEO", search: "keynote" });

    const where = {
      mediaType: "VIDEO",
      OR: [
        { title: { contains: "keynote", mode: "insensitive" } },
        { description: { contains: "keynote", mode: "insensitive" } },
      ],
    };
    expect(mockPrisma.gBCGallery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(mockPrisma.gBCGallery.count).toHaveBeenCalledWith({ where });
  });

  it.each([
    ["newest", [{ year: "desc" }, { createdAt: "desc" }, { id: "asc" }]],
    ["oldest", [{ year: "desc" }, { createdAt: "asc" }, { id: "asc" }]],
    ["name-asc", [{ year: "desc" }, { title: "asc" }, { id: "asc" }]],
    ["name-desc", [{ year: "desc" }, { title: "desc" }, { id: "asc" }]],
  ] as const)("keeps year as the primary key when sorting by %s", async (sort, orderBy) => {
    mockPrisma.gBCGallery.findMany.mockResolvedValue([]);
    mockPrisma.gBCGallery.count.mockResolvedValue(0);

    await getGalleryItemsPaginated({ page: 1, pageSize: 20, sort });

    expect(mockPrisma.gBCGallery.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy }));
  });

  it("pages with skip/take and reports the total matching count", async () => {
    mockPrisma.gBCGallery.findMany.mockResolvedValue([{ id: "g1" }]);
    mockPrisma.gBCGallery.count.mockResolvedValue(53);

    const result = await getGalleryItemsPaginated({ page: 2, pageSize: 20 });

    expect(mockPrisma.gBCGallery.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
    expect(result.pagination).toEqual({ page: 2, pageSize: 20, total: 53, totalPages: 3 });
  });
});
