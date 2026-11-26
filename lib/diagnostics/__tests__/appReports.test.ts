import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));
const log = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardAppReport: db },
}));
vi.mock("@/lib/observability/logger", () => ({ logger: log }));

const {
  appReportSchema,
  appReportsEnabled,
  listAppReports,
  getAppReportFilterOptions,
  purgeOldAppReports,
  scrubAppReport,
  storeAppReport,
} = await import("@/lib/diagnostics/appReports");

const valid = {
  v: 1 as const,
  kind: "unexpected-close" as const,
  appVersion: "1.0.0",
  platform: "ios" as const,
  osVersion: "18.3",
  screen: "Home",
  at: "2026-11-26T13:51:54.000Z",
  aliveAt: "2026-11-26T13:51:50.000Z",
  memoryWarnings: 2,
  error: { name: "TypeError", message: "boom", fatal: false },
  trail: [
    "13:51:54.100 map tap, zoom 18",
    "13:51:54.140 map tap found 5 plans",
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.create.mockResolvedValue({});
  db.deleteMany.mockResolvedValue({ count: 0 });
});

describe("appReportsEnabled", () => {
  it("is on only for exactly 1", () => {
    expect(appReportsEnabled({ APP_REPORTS_ENABLED: "1" })).toBe(true);
    expect(appReportsEnabled({ APP_REPORTS_ENABLED: "true" })).toBe(false);
    expect(appReportsEnabled({})).toBe(false);
  });
});

describe("appReportSchema", () => {
  it("accepts the documented report and one with only the required fields", () => {
    expect(appReportSchema.safeParse(valid).success).toBe(true);
    expect(
      appReportSchema.safeParse({
        v: 1,
        kind: "caught-error",
        appVersion: "1",
        platform: "android",
        screen: "",
        at: "2026-11-26T13:51:54Z",
        trail: [],
      }).success
    ).toBe(true);
  });

  it("refuses an unknown key, at the top and inside error", () => {
    expect(appReportSchema.safeParse({ ...valid, userId: "u1" }).success).toBe(
      false
    );
    expect(
      appReportSchema.safeParse({
        ...valid,
        error: { ...valid.error, stack: "at x" },
      }).success
    ).toBe(false);
  });

  it("refuses over-long and out-of-range values", () => {
    const bad = [
      { appVersion: "x".repeat(33) },
      { screen: "x".repeat(61) },
      { trail: Array.from({ length: 25 }, () => "a") },
      { trail: ["x".repeat(91)] },
      { memoryWarnings: 1001 },
      { memoryWarnings: -1 },
      { at: "not a date" },
      { v: 2 },
    ];
    for (const over of bad)
      expect(
        appReportSchema.safeParse({ ...valid, ...over }).success,
        JSON.stringify(over).slice(0, 40)
      ).toBe(false);
  });
});

describe("storeAppReport", () => {
  it("scrubs again and stores the row without any account id", async () => {
    await storeAppReport(
      {
        ...valid,
        error: {
          name: "Error",
          message:
            "failed for a@b.co plan 3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c",
          fatal: true,
        },
        trail: ["opened 3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c at 6.123456"],
      },
      () => 0.99
    );
    expect(db.create).toHaveBeenCalledTimes(1);
    const { data } = db.create.mock.calls[0][0];
    expect(data.errorMessage).toBe("failed for … plan …");
    expect(data.trail).toEqual(["opened … at …"]);
    expect(data.occurredAt).toBeInstanceOf(Date);
    expect(JSON.stringify(data)).not.toMatch(/userId|accountId|sub|email/i);
    expect(Object.keys(data)).not.toContain("userId");
  });

  it("drops trail steps the scrub empties, and keeps the rest in order", () => {
    const out = scrubAppReport({
      ...valid,
      trail: ["first", "\u0000\u0001", "third"],
    });
    expect(out.trail).toEqual(["first", "third"]);
  });

  it("logs one app-report line with the same fields and no account id", async () => {
    await storeAppReport(valid, () => 0.99);
    expect(log.warn).toHaveBeenCalledTimes(1);
    const [message, context] = log.warn.mock.calls[0];
    expect(message).toBe("app-report");
    expect(context.screen).toBe("Home");
    expect(context.occurredAt).toBe("2026-11-26T13:51:54.000Z");
    expect(JSON.stringify(context)).not.toMatch(/userId|accountId/i);
  });

  it("purges about one write in twenty, and not the others", async () => {
    await storeAppReport(valid, () => 0.5);
    expect(db.deleteMany).not.toHaveBeenCalled();
    await storeAppReport(valid, () => 0.01);
    expect(db.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("does not fail a report because the purge failed", async () => {
    db.deleteMany.mockRejectedValue(new Error("db down"));
    await expect(storeAppReport(valid, () => 0)).resolves.toBeUndefined();
  });
});

describe("purgeOldAppReports", () => {
  it("deletes what is older than 30 days", async () => {
    const now = new Date("2026-12-01T00:00:00.000Z");
    await purgeOldAppReports(now);
    const { where } = db.deleteMany.mock.calls[0][0];
    expect(where.receivedAt.lt.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("listAppReports", () => {
  const row = {
    id: "r1",
    receivedAt: new Date("2026-11-26T14:00:00.000Z"),
    kind: "caught-error",
    appVersion: "1.0.0",
    platform: "android",
    osVersion: null,
    screen: "Plans",
    occurredAt: new Date("2026-11-26T13:59:00.000Z"),
    aliveAt: null,
    memoryWarnings: null,
    errorName: "Error",
    errorMessage: "boom",
    fatal: false,
    trail: ["a", 5, "b"],
  };

  it("lists newest first with the filters, and reads the JSON trail as strings", async () => {
    db.findMany.mockResolvedValue([row]);
    db.count.mockResolvedValue(1);
    const out = await listAppReports({
      kind: "caught-error",
      platform: "android",
      appVersion: "1.0.0",
      search: "boom",
      page: 1,
      pageSize: 10,
    });
    const args = db.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ receivedAt: "desc" });
    expect(args.where).toMatchObject({
      kind: "caught-error",
      platform: "android",
      appVersion: "1.0.0",
    });
    expect(args.where.OR).toHaveLength(3);
    expect(out.data[0]).toMatchObject({
      id: "r1",
      receivedAt: "2026-11-26T14:00:00.000Z",
      trail: ["a", "b"],
    });
    expect(out.pagination.total).toBe(1);
    expect(JSON.stringify(out)).not.toMatch(/userId/);
  });
});

describe("getAppReportFilterOptions", () => {
  it("offers the fixed kinds and platforms and the versions seen", async () => {
    db.findMany.mockResolvedValue([
      { appVersion: "1.1.0" },
      { appVersion: "1.0.0" },
    ]);
    expect(await getAppReportFilterOptions()).toEqual({
      kinds: ["unexpected-close", "caught-error"],
      platforms: ["ios", "android"],
      appVersions: ["1.1.0", "1.0.0"],
    });
  });
});
