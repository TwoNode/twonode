import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  surfboardPlan: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: prisma }));

const { getUniqueQueryReasons, REVIEWER_ROLE_BY_QUERY_ROLE } =
  await import("@/surfboard/services/mdaRemarkService");
const { SurfboardRole } = await import("@/utils/platform");

beforeEach(() => vi.clearAllMocks());

describe("getUniqueQueryReasons", () => {
  it.each([
    "__proto__",
    "constructor",
    "toString",
    "hasOwnProperty",
    "nope",
    "",
  ])("refuses %j as a stage without touching the database", async (role) => {
    await expect(getUniqueQueryReasons(role as never)).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    expect(prisma.surfboardPlan.findMany).not.toHaveBeenCalled();
  });

  it("reads the stage's own comment column, newest distinct first, at most 50, dropping blanks", async () => {
    prisma.surfboardPlan.findMany.mockResolvedValue([
      { intakeComment: "Wrong plan type" },
      { intakeComment: "   " },
      { intakeComment: "Missing page" },
    ]);
    expect(await getUniqueQueryReasons("intake")).toEqual([
      "Wrong plan type",
      "Missing page",
    ]);
    expect(prisma.surfboardPlan.findMany).toHaveBeenCalledWith({
      where: { intakeComment: { not: "" }, NOT: { intakeComment: null } },
      select: { intakeComment: true },
      distinct: ["intakeComment"],
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
});

describe("REVIEWER_ROLE_BY_QUERY_ROLE", () => {
  it("names the reviewer role of each of the six stages", () => {
    expect(REVIEWER_ROLE_BY_QUERY_ROLE).toEqual({
      accounts: SurfboardRole.ACCOUNTS,
      charting: SurfboardRole.CHARTING,
      surcon: SurfboardRole.SURCON,
      "records-i": SurfboardRole.RECORDS_I,
      "records-ii": SurfboardRole.RECORDS_II,
      intake: SurfboardRole.INTAKE,
    });
  });
});
