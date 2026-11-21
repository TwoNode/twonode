import { describe, expect, it } from "vitest";
import { ANDROID_CERT_SHA256, ANDROID_PACKAGE, GET } from "../route";

describe("GET /.well-known/assetlinks.json", () => {
  it("is a JSON list that lets the Surfboard Android app handle this site's links", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.twonode.surfboard",
          sha256_cert_fingerprints: ANDROID_CERT_SHA256,
        },
      },
    ]);
  });

  it("names the same package the iOS file names (the app is one product)", async () => {
    expect(ANDROID_PACKAGE).toBe("com.twonode.surfboard");
  });

  it("gives each fingerprint as 32 uppercase hex bytes joined by colons (what Android reads)", () => {
    expect(ANDROID_CERT_SHA256.length).toBeGreaterThan(0);
    for (const fingerprint of ANDROID_CERT_SHA256) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
    expect(new Set(ANDROID_CERT_SHA256).size).toBe(ANDROID_CERT_SHA256.length);
  });

  it("holds no path rules: which links open the app is the app's own list", async () => {
    const text = JSON.stringify(await GET().json());
    expect(text).not.toMatch(/reset-password|accept-invite|verify-email/);
  });
});
