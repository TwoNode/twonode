import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  surfboardNotification: { create: vi.fn() },
}));
const mockPush = vi.hoisted(() => ({ sendPush: vi.fn() }));
const mockMail = vi.hoisted(() => ({ sendNotificationMail: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/push/pushEvents", () => mockPush);
vi.mock("@/utils/email", () => mockMail);
vi.mock("@/lib/whatsapp", () => ({ sendWhatsAppMessage: vi.fn() }));
vi.mock("@/utils/addBaseUrl", () => ({ addBaseUrl: (p: string) => p }));

const {
  createNotification,
  notifyPlanQueried,
  notifyConsolidatedQueries,
  notifyReadyForPhysicalSubmission,
  notifyPlanShared,
  notifyPlanApproved,
} = await import("@/surfboard/services/notificationService");

const PLAN_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const base = {
  type: "PLAN_QUERIED",
  title: "Plan LA/2026/0412 was queried",
  message: "Reviewer: the boundary overlaps. Please fix.",
  audience: "SPECIFIC_USERS",
  userIds: ["u1"],
} as unknown as Parameters<typeof createNotification>[0];

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.surfboardNotification.create.mockResolvedValue({ id: "n1" });
  mockPush.sendPush.mockResolvedValue(1);
});

describe("createNotification and push", () => {
  it("does not push unless the caller asks", async () => {
    expect(await createNotification(base)).toEqual({ id: "n1" });
    expect(mockPush.sendPush).not.toHaveBeenCalled();
  });

  it("pushes to the people named when the caller asks", async () => {
    await createNotification({
      ...base,
      userIds: ["u1", "u2"],
      push: { kind: "PLAN_QUERIED", planId: PLAN_ID },
    });

    expect(mockPush.sendPush).toHaveBeenCalledTimes(1);
    expect(mockPush.sendPush).toHaveBeenCalledWith(["u1", "u2"], {
      kind: "PLAN_QUERIED",
      planId: PLAN_ID,
    });
  });

  it("hands over only the kind and the plan id, never the notification's own words", async () => {
    await createNotification({
      ...base,
      push: { kind: "PLAN_QUERIED", planId: PLAN_ID },
    });

    const json = JSON.stringify(mockPush.sendPush.mock.calls[0]);
    expect(json).not.toContain("LA/2026/0412");
    expect(json).not.toContain("boundary");
  });

  it.each(["ALL_USERS", "GENERAL_ADMINS", "SUPERADMIN"])(
    "does not push a broadcast (%s), whatever the caller asked",
    async (audience) => {
      await createNotification({
        ...base,
        audience,
        push: { kind: "PLAN_SHARED" },
      } as unknown as Parameters<typeof createNotification>[0]);

      expect(mockPush.sendPush).not.toHaveBeenCalled();
    }
  );

  it("does not push to nobody", async () => {
    await createNotification({
      ...base,
      userIds: [],
      push: { kind: "PLAN_SHARED" },
    });
    await createNotification({
      ...base,
      userIds: undefined,
      push: { kind: "PLAN_SHARED" },
    });

    expect(mockPush.sendPush).not.toHaveBeenCalled();
  });

  it("saves the notification before it pushes", async () => {
    const order: string[] = [];
    mockPrisma.surfboardNotification.create.mockImplementation(async () => {
      order.push("saved");
      return { id: "n1" };
    });
    mockPush.sendPush.mockImplementation(async () => {
      order.push("pushed");
      return 1;
    });

    await createNotification({ ...base, push: { kind: "PLAN_SHARED" } });

    expect(order).toEqual(["saved", "pushed"]);
  });

  it("keeps the notification when no phone could be reached", async () => {
    mockPush.sendPush.mockResolvedValue(0);

    expect(
      await createNotification({ ...base, push: { kind: "PLAN_SHARED" } })
    ).toEqual({ id: "n1" });
  });
});

describe("which events push", () => {
  it("pushes a query as PLAN_QUERIED with the plan id", async () => {
    await notifyPlanQueried({
      userId: "u1",
      planId: PLAN_ID,
      planNumber: "LA/2026/0412",
      queriedBy: "A. Reviewer",
      comment: "The boundary overlaps.",
      sendEmail: false,
    } as Parameters<typeof notifyPlanQueried>[0]);

    expect(mockPush.sendPush).toHaveBeenCalledWith(["u1"], {
      kind: "PLAN_QUERIED",
      planId: PLAN_ID,
    });
  });

  it("pushes a consolidated MDA query as PLAN_QUERIED with the plan id", async () => {
    await notifyConsolidatedQueries({
      userId: "u1",
      planId: PLAN_ID,
      planNumber: "LA/2026/0412",
      queries: [{ department: "Lands", comment: "The boundary overlaps." }],
      sendEmail: false,
    } as unknown as Parameters<typeof notifyConsolidatedQueries>[0]);

    expect(mockPush.sendPush).toHaveBeenCalledWith(["u1"], {
      kind: "PLAN_QUERIED",
      planId: PLAN_ID,
    });
  });

  it("pushes a share to the person it was shared with, as PLAN_SHARED", async () => {
    await notifyPlanShared({
      planId: PLAN_ID,
      planNumber: "LA/2026/0412",
      sharedWithUserId: "u2",
      sharedByUser: { firstName: "Ada", lastName: "Obi" },
      sendEmail: false,
    } as unknown as Parameters<typeof notifyPlanShared>[0]);

    expect(mockPush.sendPush).toHaveBeenCalledWith(["u2"], {
      kind: "PLAN_SHARED",
      planId: PLAN_ID,
    });
  });

  it("pushes a lodged plan to its owner as PLAN_LODGED with the plan id", async () => {
    await notifyPlanApproved({
      userId: "u1",
      planId: PLAN_ID,
      planNumber: "LA/2026/0412",
      batchCode: "B-0007",
      sendEmail: false,
    } as Parameters<typeof notifyPlanApproved>[0]);

    expect(mockPush.sendPush).toHaveBeenCalledTimes(1);
    expect(mockPush.sendPush).toHaveBeenCalledWith(["u1"], {
      kind: "PLAN_LODGED",
      planId: PLAN_ID,
    });
    const json = JSON.stringify(mockPush.sendPush.mock.calls[0]);
    expect(json).not.toContain("LA/2026/0412");
    expect(json).not.toContain("B-0007");
  });

  it("pushes 'ready for physical submission' with the plan id", async () => {
    await notifyReadyForPhysicalSubmission({
      userId: "u1",
      planId: PLAN_ID,
      planNumber: "LA/2026/0412",
      sendEmail: false,
    } as Parameters<typeof notifyReadyForPhysicalSubmission>[0]);

    expect(mockPush.sendPush).toHaveBeenCalledWith(["u1"], {
      kind: "READY_FOR_PHYSICAL",
      planId: PLAN_ID,
    });
  });
});
