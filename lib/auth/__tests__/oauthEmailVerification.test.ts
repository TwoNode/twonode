import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLookup = vi.hoisted(() => ({
  clearPasswordHash: vi.fn(),
  markEmailVerified: vi.fn(),
}));
const mockSession = vi.hoisted(() => ({ revokeUserSession: vi.fn() }));
const mockEmail = vi.hoisted(() => ({ sendPasswordRemovedNotice: vi.fn() }));
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/utils/email", () => mockEmail);
vi.mock("@/lib/siteUrl", () => ({ getSiteUrl: () => "https://site.test" }));

const { verifyEmailViaOAuth } =
  await import("@/lib/auth/oauthEmailVerification");
const { Platform } = await import("@/utils/platform");

describe("verifyEmailViaOAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("an already verified account is left alone, password and sessions included", async () => {
    await verifyEmailViaOAuth(Platform.SURFBOARD, {
      id: "u1",
      emailVerified: true,
      passwordHash: "hash",
    });
    expect(mockLookup.clearPasswordHash).not.toHaveBeenCalled();
    expect(mockSession.revokeUserSession).not.toHaveBeenCalled();
    expect(mockLookup.markEmailVerified).not.toHaveBeenCalled();
  });

  it("an unverified account WITH a password loses the password and every session, then is marked verified via OAuth", async () => {
    const order: string[] = [];
    mockLookup.clearPasswordHash.mockImplementation(async () => {
      order.push("clear");
    });
    mockSession.revokeUserSession.mockImplementation(async () => {
      order.push("revoke");
    });
    mockLookup.markEmailVerified.mockImplementation(async () => {
      order.push("verify");
    });

    await verifyEmailViaOAuth(Platform.SURFBOARD, {
      id: "u1",
      emailVerified: false,
      passwordHash: "hash",
      email: "owner@example.com",
      firstName: "Ada",
    });

    expect(mockLookup.clearPasswordHash).toHaveBeenCalledWith(
      "surfboard",
      "u1"
    );
    expect(mockSession.revokeUserSession).toHaveBeenCalledWith(
      "surfboard",
      "u1"
    );
    expect(mockLookup.markEmailVerified).toHaveBeenCalledWith(
      "surfboard",
      "u1",
      "OAUTH"
    );
    // The password is gone before the account is trusted as verified.
    expect(order).toEqual(["clear", "revoke", "verify"]);
  });

  it("an unverified account WITHOUT a password (created through Kinde) is just marked verified", async () => {
    await verifyEmailViaOAuth(Platform.REVA, {
      id: "u2",
      emailVerified: false,
      passwordHash: null,
    });
    expect(mockLookup.clearPasswordHash).not.toHaveBeenCalled();
    expect(mockSession.revokeUserSession).not.toHaveBeenCalled();
    expect(mockLookup.markEmailVerified).toHaveBeenCalledWith(
      "reva",
      "u2",
      "OAUTH"
    );
  });

  it("tells the person by email when their password was removed, linking to the platform's sign-in page", async () => {
    await verifyEmailViaOAuth(Platform.SURFBOARD, {
      id: "u1",
      emailVerified: false,
      passwordHash: "hash",
      email: "owner@example.com",
      firstName: "Ada",
    });
    expect(mockEmail.sendPasswordRemovedNotice).toHaveBeenCalledWith({
      to: "owner@example.com",
      firstName: "Ada",
      loginUrl: "https://site.test/surfboard/login",
      platform: "surfboard",
    });
  });

  it("sends no email when no password was removed", async () => {
    await verifyEmailViaOAuth(Platform.REVA, {
      id: "u2",
      emailVerified: false,
      passwordHash: null,
      email: "x@example.com",
    });
    await verifyEmailViaOAuth(Platform.REVA, {
      id: "u3",
      emailVerified: true,
      passwordHash: "hash",
      email: "y@example.com",
    });
    expect(mockEmail.sendPasswordRemovedNotice).not.toHaveBeenCalled();
  });

  it("a failure to send the email never blocks the sign-in", async () => {
    mockEmail.sendPasswordRemovedNotice.mockRejectedValue(
      new Error("smtp down")
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      verifyEmailViaOAuth(Platform.SURFBOARD, {
        id: "u1",
        emailVerified: false,
        passwordHash: "hash",
        email: "owner@example.com",
      })
    ).resolves.toBeUndefined();
    expect(mockLookup.markEmailVerified).toHaveBeenCalled();
    spy.mockRestore();
  });
});
