import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSession = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const mockRate = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockLookup = vi.hoisted(() => ({
  findUserById: vi.fn(),
  markEmailVerified: vi.fn(),
}));
const mockPrisma = vi.hoisted(() => ({
  emailVerificationToken: { findUnique: vi.fn(), update: vi.fn() },
}));
const mockVersionGate = vi.hoisted(() => ({
  assertMobileClientAllowed: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/api/mobileApp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/mobileApp")>()),
  ...mockVersionGate,
}));

const { POST } =
  await import("@/app/api/v1/auth/mobile/verify-email-link/route");

const TOKEN = "raw-token-from-the-email";
const HASH = crypto.createHash("sha256").update(TOKEN).digest("hex");

const post = (body: Record<string, unknown> = {}) =>
  new NextRequest(
    "http://localhost:3000/api/v1/auth/mobile/verify-email-link",
    {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "content-type": "application/json",
        authorization: "Bearer access-token",
      },
      body: JSON.stringify({ platform: "surfboard", token: TOKEN, ...body }),
    }
  );

const blocked = {
  sub: "u1",
  role: "USER",
  platform: "surfboard",
  emailVerified: false,
  mustVerifyNow: true,
};
const user = { id: "u1", isActive: true, emailVerified: false };
const record = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  userId: "u1",
  platform: "surfboard",
  usedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockVersionGate.assertMobileClientAllowed.mockResolvedValue(undefined);
  mockSession.getServerSession.mockResolvedValue(blocked);
  mockRate.consumeRateLimit.mockResolvedValue(true);
  mockLookup.findUserById.mockResolvedValue(user);
  mockLookup.markEmailVerified.mockResolvedValue(undefined);
  mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(record());
  mockPrisma.emailVerificationToken.update.mockResolvedValue({});
});

describe("POST /api/v1/auth/mobile/verify-email-link", () => {
  it("verifies the signed-in surveyor with the emailed token, once", async () => {
    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { verified: true },
    });
    expect(mockPrisma.emailVerificationToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: HASH },
    });
    expect(mockPrisma.emailVerificationToken.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(mockLookup.markEmailVerified).toHaveBeenCalledWith(
      "surfboard",
      "u1",
      "LINK"
    );
  });

  it("sets no cookie and starts no session", async () => {
    const res = await POST(post());
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["an unknown token", null],
    ["a token already used", record({ usedAt: new Date() })],
    ["an expired token", record({ expiresAt: new Date(Date.now() - 1) })],
    ["a token for another account", record({ userId: "someone-else" })],
    ["a token for another product", record({ platform: "reva" })],
  ])("refuses %s the same way, and verifies no one", async (_name, found) => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(found);

    const res = await POST(post());

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VERIFICATION_LINK_INVALID");
    expect(mockPrisma.emailVerificationToken.update).not.toHaveBeenCalled();
    expect(mockLookup.markEmailVerified).not.toHaveBeenCalled();
  });

  it("treats an account that is already verified as done, without looking at the token", async () => {
    mockLookup.findUserById.mockResolvedValue({ ...user, emailVerified: true });

    const res = await POST(post());

    expect(await res.json()).toEqual({
      success: true,
      data: { verified: true },
    });
    expect(mockPrisma.emailVerificationToken.findUnique).not.toHaveBeenCalled();
  });

  it("is a 401 without a session and a 403 for another kind of account", async () => {
    mockSession.getServerSession.mockResolvedValue(null);
    expect((await POST(post())).status).toBe(401);
    mockSession.getServerSession.mockResolvedValue({
      ...blocked,
      role: "ADMIN",
    });
    expect((await POST(post())).status).toBe(403);
    expect(mockPrisma.emailVerificationToken.findUnique).not.toHaveBeenCalled();
  });

  it("is limited per account and answers 429 over the limit, before reading the token", async () => {
    mockRate.consumeRateLimit.mockResolvedValue(false);

    const res = await POST(post());

    expect(res.status).toBe(429);
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "verify-link-user:surfboard:u1",
      "u1"
    );
    expect(mockPrisma.emailVerificationToken.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an empty token or the wrong platform with a 400", async () => {
    expect((await POST(post({ token: "" }))).status).toBe(400);
    expect((await POST(post({ platform: "reva" }))).status).toBe(400);
  });
});
