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
