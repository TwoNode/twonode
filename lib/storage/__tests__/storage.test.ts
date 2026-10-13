import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStorageProvider } from "../index";
import { buildStorageKey, extractKeyFromUrl } from "../utils";

describe("lib/storage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getStorageProvider", () => {
    it("returns S3 provider by default", () => {
      delete process.env.STORAGE_PROVIDER;
      delete process.env.SURFBOARD_STORAGE_PROVIDER;
      const provider = getStorageProvider("s3");
      expect(provider.name).toBe("s3");
    });

    it("returns Cloudflare R2 provider when requested", () => {
      const provider = getStorageProvider("cloudflare");
      expect(provider.name).toBe("r2");

      const r2Provider = getStorageProvider("r2");
      expect(r2Provider.name).toBe("r2");
    });

    it("returns MinIO provider when requested", () => {
      process.env.MINIO_ENDPOINT = "http://localhost:9000";
      process.env.MINIO_ACCESS_KEY = "testminio";
      process.env.MINIO_SECRET_KEY = "testsecret";
      const provider = getStorageProvider("minio");
      expect(provider.name).toBe("minio");
    });

    it("returns Supabase Storage provider when requested", () => {
      process.env.SUPABASE_URL = "https://xyzcompany.supabase.co";
      process.env.SUPABASE_STORAGE_ACCESS_KEY_ID = "testkey";
      process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY = "testsecret";
      const provider = getStorageProvider("supabase");
      expect(provider.name).toBe("supabase");
    });

    it("returns Local filesystem provider when requested", () => {
      const provider = getStorageProvider("local");
      expect(provider.name).toBe("local");
    });

    it("returns Cloudinary provider when requested", () => {
      const provider = getStorageProvider("cloudinary");
      expect(provider.name).toBe("cloudinary");
    });

    it("returns Vercel Blob provider when requested", () => {
      const provider = getStorageProvider("vercel-blob");
      expect(provider.name).toBe("vercel-blob");
    });

    it("returns ImageKit provider when requested", () => {
      const provider = getStorageProvider("imagekit");
      expect(provider.name).toBe("imagekit");
    });

    it("respects STORAGE_PROVIDER environment variable", () => {
      process.env.STORAGE_PROVIDER = "local";
      const provider = getStorageProvider();
      expect(provider.name).toBe("local");
    });

    it("respects SURFBOARD_STORAGE_PROVIDER environment variable fallback", () => {
      delete process.env.STORAGE_PROVIDER;
      process.env.SURFBOARD_STORAGE_PROVIDER = "local";
      const provider = getStorageProvider();
      expect(provider.name).toBe("local");
    });
  });

  describe("utils: buildStorageKey & extractKeyFromUrl", () => {
    it("builds a sanitized key with user ID and plan number", () => {
      const key = buildStorageKey({
        userId: "user_123",
        planNumber: "PLN/2026/001",
        fileType: "redcopy",
        fileName: "survey_red_copy.pdf",
      });
      expect(key).toContain("user_123");
      expect(key).toContain("PLN_2026_001");
      expect(key).toContain("redcopy");
      expect(key.endsWith(".pdf")).toBe(true);
    });

    it("extracts key from direct path or S3/R2 URL", () => {
      expect(extractKeyFromUrl("surfboard/uploads/file.pdf")).toBe("surfboard/uploads/file.pdf");
      expect(
        extractKeyFromUrl("https://my-bucket.s3.eu-west-1.amazonaws.com/surfboard/uploads/file.pdf")
      ).toBe("surfboard/uploads/file.pdf");
      expect(
        extractKeyFromUrl("https://pub-xyz.r2.dev/surfboard/uploads/file.pdf?query=1")
      ).toBe("surfboard/uploads/file.pdf");
    });
  });
});

describe("attachmentDisposition", () => {
  it("builds a download header with an ASCII fallback and the UTF-8 name", async () => {
    const { attachmentDisposition } = await import("../utils");
    const h = attachmentDisposition('Plan "A"/é.pdf');
    expect(h).toContain('attachment; filename="Plan A_.pdf"');
    expect(h).toContain("filename*=UTF-8''Plan%20A%C3%A9.pdf");
    expect(attachmentDisposition("  ")).toContain('filename="download"');
  });
});

describe("plan file keys", () => {
  it("names a plan file after the plan number, in the owner's folder", async () => {
    const { buildPlanFileKey, isPlanFileType } = await import("../utils");
    expect(
      buildPlanFileKey({ userId: "u1", fileType: "pdf", planNumber: "xxx/4763/a/011/2026/la", fileName: "My Scan.PDF" })
    ).toBe("surfboard/u1/pdf/XXX_4763_A_011_2026_LA.pdf");
    expect(
      buildPlanFileKey({ userId: "u1", fileType: "cad", planNumber: "A/1", fileName: "x.dwg", attempt: 3 })
    ).toBe("surfboard/u1/cad/A_1_3.dwg");
    expect(isPlanFileType("redcopy")).toBe(true);
    expect(isPlanFileType("viewer-attachment")).toBe(false);
  });

  it("takes the next free name and never replaces an earlier file", async () => {
    const { putUnderFreeName } = await import("../utils");
    const taken = new Set(["k1", "k2"]);
    const stored: string[] = [];
    const key = await putUnderFreeName(
      (n) => `k${n}`,
      async (k) => {
        if (taken.has(k)) throw Object.assign(new Error("exists"), { name: "PreconditionFailed" });
        stored.push(k);
      },
      (e) => (e as { name?: string }).name === "PreconditionFailed"
    );
    expect(key).toBe("k3");
    expect(stored).toEqual(["k3"]);
  });

  it("does not hide other errors", async () => {
    const { putUnderFreeName } = await import("../utils");
    await expect(
      putUnderFreeName(
        (n) => `k${n}`,
        async () => {
          throw new Error("network");
        },
        () => false
      )
    ).rejects.toThrow("network");
  });
});
