import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Unlike notificationService.push.test.ts, nothing of the push code is replaced here but the
// things it reaches out to (the token table, the preference and cool-down tables, and the push
// service's fetch), so a failure in any of them goes through the real sendPush and the real
// createNotification.
const mockPrisma = vi.hoisted(() => ({
  surfboardNotification: { create: vi.fn() },
  pushPreference: { findMany: vi.fn() },
  pushCooldown: { createMany: vi.fn() },
}));
const mockTokens = vi.hoisted(() => ({
  tokensForUsers: vi.fn(),
  removeTokens: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/push/deviceTokens", () => mockTokens);
vi.mock("@/utils/email", () => ({ sendNotificationMail: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppMessage: vi.fn() }));
vi.mock("@/utils/addBaseUrl", () => ({ addBaseUrl: (p: string) => p }));

const { createNotification } = await import(
  "@/surfboard/services/notificationService"
);

const input = {
  type: "PLAN_SHARED",
  title: "t",
  message: "m",
  audience: "SPECIFIC_USERS",
  userIds: ["u1"],
  push: { kind: "PLAN_SHARED" },
} as unknown as Parameters<typeof createNotification>[0];

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mockPrisma.surfboardNotification.create.mockResolvedValue({ id: "n1" });
  // Nobody has chosen anything and the window is free.
  mockPrisma.pushPreference.findMany.mockResolvedValue([]);
  mockPrisma.pushCooldown.createMany.mockResolvedValue({ count: 1 });
  mockTokens.removeTokens.mockResolvedValue(0);
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a push that fails does not fail the notification", () => {
  it("when the tokens cannot be read", async () => {
    vi.stubEnv("PUSH_ENABLED", "1");
    mockTokens.tokensForUsers.mockRejectedValue(new Error("db down"));

    await expect(createNotification(input)).resolves.toEqual({ id: "n1" });
  });

  it("when the push service is down", async () => {
    vi.stubEnv("PUSH_ENABLED", "1");
    mockTokens.tokensForUsers.mockResolvedValue([
      { userId: "u1", token: "ExponentPushToken[abcdefgh12345678]" },
    ]);
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(createNotification(input)).resolves.toEqual({ id: "n1" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("with push switched off", () => {
  it("reaches nobody and calls nothing, however the notification is made", async () => {
    // PUSH_ENABLED is not set.
    await expect(createNotification(input)).resolves.toEqual({ id: "n1" });

    expect(mockTokens.tokensForUsers).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not switch on for a value that only looks like yes", async () => {
    vi.stubEnv("PUSH_ENABLED", "true");

    await createNotification(input);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
