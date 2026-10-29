import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  subscription: { findMany: vi.fn(), update: vi.fn() },
}));
const mockMail = vi.hoisted(() => ({ sendMail: vi.fn() }));
const mockWhatsApp = vi.hoisted(() => ({
  sendWhatsAppSubscriptionExpiryReminder: vi.fn(),
}));
const mockPush = vi.hoisted(() => ({ sendPush: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/email", () => mockMail);
vi.mock("@/lib/whatsapp", () => mockWhatsApp);
vi.mock("@/lib/push/pushEvents", () => mockPush);
vi.mock("@/lib/siteUrl", () => ({ getSiteUrl: () => "https://example.test" }));
vi.mock("@/surfboard/utils/subscriptionEmails", () => ({
  expiryReminderEmail: () => ({ subject: "s", text: "t", html: "h" }),
}));

const { sendExpiringSubscriptionReminders } = await import(
  "@/surfboard/services/subscriptionReminderService"
);

const DAY = 24 * 60 * 60 * 1000;
const subscription = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  userId: "u1",
  planName: "Surfboard Pro",
  currentEnd: new Date(Date.now() + 2 * DAY),
  expiryReminderSentAt: null,
  user: { email: "a@example.test", firstName: "Ada", phoneNumber: "0800" },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mockPrisma.subscription.findMany.mockResolvedValue([subscription()]);
  mockPrisma.subscription.update.mockResolvedValue({});
  mockMail.sendMail.mockResolvedValue(undefined);
  mockWhatsApp.sendWhatsAppSubscriptionExpiryReminder.mockResolvedValue(
    undefined
  );
  mockPush.sendPush.mockResolvedValue(1);
});

describe("the expiry reminder and push", () => {
  it("pushes the subscriber once, with the kind alone and no plan", async () => {
    const result = await sendExpiringSubscriptionReminders();

    expect(result).toEqual({ checked: 1, reminded: 1, failed: 0 });
    expect(mockPush.sendPush).toHaveBeenCalledTimes(1);
    expect(mockPush.sendPush).toHaveBeenCalledWith(["u1"], {
      kind: "SUBSCRIPTION_ENDING",
    });
  });

  it("pushes after the email went and the reminder was stamped, never before", async () => {
    const order: string[] = [];
    mockMail.sendMail.mockImplementation(async () => void order.push("email"));
    mockPrisma.subscription.update.mockImplementation(
      async () => void order.push("stamped")
    );
    mockPush.sendPush.mockImplementation(async () => {
      order.push("pushed");
      return 1;
    });

    await sendExpiringSubscriptionReminders();

    expect(order).toEqual(["email", "stamped", "pushed"]);
  });

  it("does not push again on a later day of the same window", async () => {
    const currentEnd = new Date(Date.now() + 1 * DAY);
    mockPrisma.subscription.findMany.mockResolvedValue([
      // Reminded (and pushed) yesterday, two days before the end.
      subscription({
        currentEnd,
        expiryReminderSentAt: new Date(Date.now() - 1 * DAY),
      }),
    ]);

    await sendExpiringSubscriptionReminders();

    expect(mockPush.sendPush).not.toHaveBeenCalled();
  });

  it("does not push a subscriber whose reminder is stamped at or after the end", async () => {
    const currentEnd = new Date(Date.now() + 2 * DAY);
    mockPrisma.subscription.findMany.mockResolvedValue([
      subscription({ currentEnd, expiryReminderSentAt: currentEnd }),
    ]);

    await sendExpiringSubscriptionReminders();

    expect(mockPush.sendPush).not.toHaveBeenCalled();
  });

  it("treats a stamp on the very day the window opened as this cycle's, and one before it as the last cycle's", async () => {
    const currentEnd = new Date(Date.now() + 2 * DAY);
    const windowStart = new Date(currentEnd.getTime() - 3 * DAY);

    mockPrisma.subscription.findMany.mockResolvedValue([
      subscription({ currentEnd, expiryReminderSentAt: windowStart }),
    ]);
    await sendExpiringSubscriptionReminders();
    expect(mockPush.sendPush).not.toHaveBeenCalled();

    mockPrisma.subscription.findMany.mockResolvedValue([
      subscription({
        currentEnd,
        expiryReminderSentAt: new Date(windowStart.getTime() - 1),
      }),
    ]);
    await sendExpiringSubscriptionReminders();
    expect(mockPush.sendPush).toHaveBeenCalledTimes(1);
  });

  it("pushes a renewed subscriber again for the new expiry", async () => {
    const currentEnd = new Date(Date.now() + 2 * DAY);
    mockPrisma.subscription.findMany.mockResolvedValue([
      subscription({
        currentEnd,
        // Reminded for the old expiry, a month ago.
        expiryReminderSentAt: new Date(currentEnd.getTime() - 30 * DAY),
      }),
    ]);

    await sendExpiringSubscriptionReminders();

    expect(mockPush.sendPush).toHaveBeenCalledTimes(1);
  });

  it("pushes on the day after a failed email, when the first reminder finally goes", async () => {
    // The first day's email failed, so nothing was stamped and nothing was pushed.
    mockMail.sendMail.mockRejectedValueOnce(new Error("smtp down"));
    await sendExpiringSubscriptionReminders();
    expect(mockPush.sendPush).not.toHaveBeenCalled();

    await sendExpiringSubscriptionReminders();
    expect(mockPush.sendPush).toHaveBeenCalledTimes(1);
  });

  it("does not push, and does not stamp, when the email could not be sent", async () => {
    mockMail.sendMail.mockRejectedValue(new Error("smtp down"));

    const result = await sendExpiringSubscriptionReminders();

    expect(result).toEqual({ checked: 1, reminded: 0, failed: 1 });
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    expect(mockPush.sendPush).not.toHaveBeenCalled();
  });

  it("does not push when the reminder could not be stamped, so a retry cannot push twice", async () => {
    mockPrisma.subscription.update.mockRejectedValue(new Error("db down"));

    const result = await sendExpiringSubscriptionReminders();

    expect(result.failed).toBe(1);
    expect(mockPush.sendPush).not.toHaveBeenCalled();
  });

  it("still pushes when WhatsApp fails and for a person with no phone number", async () => {
    mockWhatsApp.sendWhatsAppSubscriptionExpiryReminder.mockRejectedValue(
      new Error("whatsapp down")
    );
    mockPrisma.subscription.findMany.mockResolvedValue([
      subscription(),
      subscription({
        id: "s2",
        userId: "u2",
        user: { email: "b@example.test", firstName: "Bayo", phoneNumber: null },
      }),
    ]);

    const result = await sendExpiringSubscriptionReminders();

    expect(result).toEqual({ checked: 2, reminded: 2, failed: 0 });
    expect(mockPush.sendPush.mock.calls.map((c) => c[0])).toEqual([
      ["u1"],
      ["u2"],
    ]);
  });

  it("counts a reminder as sent whether or not any phone was reached", async () => {
    mockPush.sendPush.mockResolvedValue(0);

    const result = await sendExpiringSubscriptionReminders();

    expect(result).toEqual({ checked: 1, reminded: 1, failed: 0 });
  });
});
