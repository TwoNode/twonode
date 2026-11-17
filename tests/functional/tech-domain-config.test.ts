import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config.mjs";

/**
 * The second address https://twonodetechnologies.tech (docs/DEPLOYMENT.md "Domains", issues
 * I-060 and I-061). The maintainer's rule is that www.twonodetechnologies.com must behave
 * exactly as before, so these tests pin: every rule added for .tech matches the .tech host
 * only, and the one rule that existed before is untouched. (Checked on a real dev server with
 * curl and a Host header on 2026-11-17; these tests keep it from drifting.)
 */

const TECH_HOST = { type: "host", value: "twonodetechnologies.tech" };

type Rule = {
  source: string;
  destination?: string;
  permanent?: boolean;
  has?: { type: string; value?: string }[];
  headers?: { key: string; value: string }[];
};

async function rules() {
  const headers = (await nextConfig.headers!()) as Rule[];
  const redirects = (await nextConfig.redirects!()) as Rule[];
  return { headers, redirects };
}

describe("the .tech address: I-061 noindex", () => {
  it("keeps the main site's own X-Robots-Tag rule exactly as it was, first and without a host condition", async () => {
    const { headers } = await rules();
    expect(headers[0]).toEqual({
      source: "/:path*",
      headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
    });
  });

  it("adds noindex for the .tech host only, after the main rule (Next applies the last match)", async () => {
    const { headers } = await rules();
    expect(headers).toHaveLength(2);
    expect(headers[1]).toEqual({
      source: "/:path*",
      has: [TECH_HOST],
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    });
  });
});

describe("the .tech address: I-060 sign-in goes to the main domain", () => {
  it("redirects the four sign-in start points, for the .tech host only, temporarily", async () => {
    const { redirects } = await rules();
    const toMain = redirects.filter((r) =>
      r.destination?.startsWith("https://")
    );
    expect(toMain.map((r) => r.source).sort()).toEqual([
      "/api/auth/login",
      "/api/auth/register",
      "/reva-restricted/login",
      "/reva/login",
    ]);
    for (const r of toMain) {
      expect(r.has).toEqual([TECH_HOST]);
      expect(r.permanent).toBe(false);
      expect(r.destination).toBe(
        `https://www.twonodetechnologies.com${r.source}`
      );
    }
  });

  it("does not redirect the rest of /api/auth: the pages fetch logout_redirect on their own host", async () => {
    const { redirects } = await rules();
    const authSources = redirects
      .map((r) => r.source)
      .filter((s) => s.startsWith("/api/auth"));
    expect(authSources.sort()).toEqual([
      "/api/auth/login",
      "/api/auth/register",
    ]);
    expect(authSources.join(" ")).not.toContain("logout_redirect");
    expect(authSources.join(" ")).not.toContain("kinde_callback");
  });

  it("leaves every redirect that existed before (page renames) without a host condition", async () => {
    const { redirects } = await rules();
    const renames = redirects.filter(
      (r) => !r.destination?.startsWith("https://")
    );
    expect(renames.length).toBeGreaterThanOrEqual(10);
    for (const r of renames) {
      expect(r.has).toBeUndefined();
      expect(r.permanent).toBe(true);
    }
  });
});
