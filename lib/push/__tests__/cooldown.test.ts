import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  pushCooldown: { createMany: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const {
  COOLDOWN_KEEP_MS,
  COOLDOWN_WINDOW_MS,
  claimPushWindow,
  cooldownId,
  prunePushCooldowns,
} = await import("@/lib/push/cooldown");

const T0 = new Date("2026-10-29T12:00:00.000Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("cooldownId", () => {
  it("is the same for one person and kind anywhere in a 5 minute window", () => {
    expect(COOLDOWN_WINDOW_MS).toBe(5 * 60 * 1000);
    expect(cooldownId("u1", "PLAN_QUERIED", T0)).toBe(
      cooldownId("u1", "PLAN_QUERIED", later(4 * 60 * 1000 + 59_000))
    );
  });

  it("changes in the next window", () => {
    expect(cooldownId("u1", "PLAN_QUERIED", T0)).not.toBe(
      cooldownId("u1", "PLAN_QUERIED", later(COOLDOWN_WINDOW_MS))
    );
  });

  it("differs by person and by kind", () => {
    const base = cooldownId("u1", "PLAN_QUERIED", T0);
    expect(cooldownId("u2", "PLAN_QUERIED", T0)).not.toBe(base);
    expect(cooldownId("u1", "PLAN_LODGED", T0)).not.toBe(base);
  });
});

describe("claimPushWindow", () => {
  it("claims the window for each person, with a write that skips one already taken", async () => {
    mockPrisma.pushCooldown.createMany.mockResolvedValue({ count: 1 });

    const claimed = await claimPushWindow(["u1", "u2"], "PLAN_QUERIED", T0);

    expect([...claimed].sort()).toEqual(["u1", "u2"]);
    expect(mockPrisma.pushCooldown.createMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.pushCooldown.createMany).toHaveBeenCalledWith({
      data: [{ id: cooldownId("u1", "PLAN_QUERIED", T0), sentAt: T0 }],
      skipDuplicates: true,
    });
  });

  it("does not hand back a person whose window was already taken", async () => {
    mockPrisma.pushCooldown.createMany.mockImplementation(
      async ({ data }: { data: { id: string }[] }) => ({
        count: data[0].id.startsWith("u1:") ? 0 : 1,
      })
    );

    const claimed = await claimPushWindow(["u1", "u2"], "PLAN_QUERIED", T0);

    expect([...claimed]).toEqual(["u2"]);
  });

  it("claims nothing for nobody", async () => {
    expect((await claimPushWindow([], "PLAN_QUERIED", T0)).size).toBe(0);
    expect(mockPrisma.pushCooldown.createMany).not.toHaveBeenCalled();
  });

  it("lets the error through, so a send that cannot check does not guess", async () => {
    mockPrisma.pushCooldown.createMany.mockRejectedValue(new Error("db down"));

    await expect(
      claimPushWindow(["u1"], "PLAN_QUERIED", T0)
    ).rejects.toThrow("db down");
  });
});

describe("prunePushCooldowns", () => {
  it("deletes windows older than a day and says how many", async () => {
    mockPrisma.pushCooldown.deleteMany.mockResolvedValue({ count: 7 });

    expect(await prunePushCooldowns(T0)).toBe(7);

    expect(COOLDOWN_KEEP_MS).toBe(24 * 60 * 60 * 1000);
    expect(mockPrisma.pushCooldown.deleteMany).toHaveBeenCalledWith({
      where: { sentAt: { lt: new Date(T0.getTime() - COOLDOWN_KEEP_MS) } },
    });
  });
});
