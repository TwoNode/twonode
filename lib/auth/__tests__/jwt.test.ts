import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  signAccessToken,
  verifyToken,
  verifyTokenAllowExpired,
} from "@/lib/auth/jwt";
import { Platform } from "@/utils/platform";

const payload = {
  sub: "user-1",
  role: "USER",
  platform: Platform.SURFBOARD,
  emailVerified: true,
  mustVerifyNow: false,
};

afterEach(() => vi.useRealTimers());

describe("verifyTokenAllowExpired", () => {
  it("accepts a token we signed", async () => {
    const t = await signAccessToken(payload);
    expect((await verifyTokenAllowExpired(t))?.sub).toBe("user-1");
  });

  it("accepts a token we signed that has since expired (the logout case)", async () => {
    vi.useFakeTimers();
    const t = await signAccessToken(payload);
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);

    expect(await verifyToken(t)).toBeNull();
    expect((await verifyTokenAllowExpired(t))?.sub).toBe("user-1");
  });

  it("rejects a token signed with a key we don't hold — a forged cookie must not identify anyone", async () => {
    const forged = await new SignJWT({ role: "USER", platform: "surfboard" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("victim-id")
      .setExpirationTime("-1h")
      .sign(new TextEncoder().encode("attacker-chosen-secret"));

    expect(await verifyTokenAllowExpired(forged)).toBeNull();
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const b64 = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "victim-id", platform: "surfboard" })}.`;
    expect(await verifyTokenAllowExpired(unsigned)).toBeNull();
  });

  it("still gives up on tokens expired beyond the refresh-token lifetime", async () => {
    vi.useFakeTimers();
    const t = await signAccessToken(payload);
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await verifyTokenAllowExpired(t)).toBeNull();
  });
});
