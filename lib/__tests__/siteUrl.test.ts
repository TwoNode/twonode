import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl, LIVE_SITE_URL } from "@/lib/siteUrl";

const KEYS = [
  "VERCEL_ENV",
  "VERCEL_BRANCH_URL",
  "VERCEL_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "BASE_URL",
];

describe("getSiteUrl", () => {
  beforeEach(() => {
    for (const k of KEYS) vi.stubEnv(k, "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("prefers BASE_URL, which each environment sets to its own URL", () => {
    vi.stubEnv("BASE_URL", "https://staging.example.test/");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", LIVE_SITE_URL);
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "branch.vercel.app");
    expect(getSiteUrl()).toBe("https://staging.example.test");
  });

  it("uses the preview deployment's branch URL when BASE_URL is not set, even if the site URL points at live", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv(
      "VERCEL_BRANCH_URL",
      "twonodetech-git-main-rojitechs-projects.vercel.app"
    );
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", LIVE_SITE_URL);
    expect(getSiteUrl()).toBe(
      "https://twonodetech-git-main-rojitechs-projects.vercel.app"
    );
  });

  it("falls back to the deployment URL on a preview without a branch URL", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "twonodetech-abc123.vercel.app");
    expect(getSiteUrl()).toBe("https://twonodetech-abc123.vercel.app");
  });

  it("ignores the Vercel URLs outside previews", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_BRANCH_URL", "twonodetech-git-main.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("falls back from APP_URL to SITE_URL to the live site", () => {
    expect(getSiteUrl()).toBe(LIVE_SITE_URL);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.test");
    expect(getSiteUrl()).toBe("https://site.test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3001");
    expect(getSiteUrl()).toBe("http://localhost:3001");
  });
});
