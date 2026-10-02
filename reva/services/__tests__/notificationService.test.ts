import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward notifyReportReady's OneTimeUserProperty branch — the
 * resolved open question from the Phase 3 spec. The source had this
 * entirely commented out; these cases assert the real implementation
 * creates an email-keyed Notification (not user-id-keyed, since a guest
 * has no account) and echoes to admins via notifySystemAlert.
 */

const mockPrisma = vi.hoisted(() => ({
  notification: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  revaUser: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/email", () => ({
  sendEmailToAdmin: vi.fn(),
  sendEmailToAllAdmins: vi.fn(),
}));

const { notifyReportReady, notifySystemAlert, createNotification } =
  await import("@/reva/services/notificationService");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.notification.create.mockResolvedValue({});
});

describe("notifyReportReady", () => {
  it("regular Property (userId, no requester field): notifies the user by id, no guest branch", async () => {
    await notifyReportReady(
      { reference: "R1", address: "1 Test St" },
      "user-1"
    );

    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    const call = mockPrisma.notification.create.mock.calls[0][0];
    expect(call.data.userIds).toEqual(["user-1"]);
    expect(call.data.title).toBe("Report Ready");
  });

  it("OneTimeUserProperty (has requester + email, no userId): creates an email-keyed notification AND echoes to admins", async () => {
    await notifyReportReady(
      {
        reference: "R1",
        address: "1 Test St",
        requester: "Guest",
        email: "guest@test.com",
      },
      undefined
    );

    // notification.create called twice: the guest-facing one + notifySystemAlert's admin echo
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);

    const guestCall = mockPrisma.notification.create.mock.calls[0][0];
    expect(guestCall.data.userIds).toEqual(["guest@test.com"]);
    expect(guestCall.data.audience).toBe("SPECIFIC_USERS");
    expect(guestCall.data.link).toContain("reference=R1");
    expect(guestCall.data.link).toContain("email=guest%40test.com");

    const adminEchoCall = mockPrisma.notification.create.mock.calls[1][0];
    expect(adminEchoCall.data.type).toBe("SYSTEM");
    expect(adminEchoCall.data.message).toContain("R1");
  });

  it("a OneTime request with no email does nothing (can't be keyed to anything) rather than throwing", async () => {
    await notifyReportReady(
      { reference: "R1", address: "1 Test St", requester: "Guest" },
      undefined
    );
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });
});

describe("notifySystemAlert", () => {
  it("uses SPECIFIC_USERS audience when userIds are given, ALL_USERS otherwise", async () => {
    await notifySystemAlert("Title", "Message", ["u1"]);
    expect(mockPrisma.notification.create.mock.calls[0][0].data.audience).toBe(
      "SPECIFIC_USERS"
    );

    vi.clearAllMocks();
    mockPrisma.notification.create.mockResolvedValue({});
    await notifySystemAlert("Title", "Message");
    expect(mockPrisma.notification.create.mock.calls[0][0].data.audience).toBe(
      "ALL_USERS"
    );
  });
});

describe("createNotification", () => {
  it("defaults to SPECIFIC_USERS audience and an empty userIds array", async () => {
    await createNotification({ type: "INFO" as any, title: "t", message: "m" });
    const call = mockPrisma.notification.create.mock.calls[0][0];
    expect(call.data.audience).toBe("SPECIFIC_USERS");
    expect(call.data.userIds).toEqual([]);
  });
});
