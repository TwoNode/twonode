import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  pushPreference: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const {
  CATEGORY_OF_KIND,
  PUSH_CATEGORIES,
  applyPatch,
  formatMinutes,
  getPushPreferences,
  inQuietHours,
  pushPreferencesPatch,
  toPreferences,
  updatePushPreferences,
  usersWhoWant,
} = await import("@/lib/push/preferences");
const { buildPushMessage } = await import("@/lib/push/pushEvents");

const row = (over: Record<string, unknown> = {}) => ({
  categoriesOff: [] as string[],
  quietEnabled: false,
  quietStart: 22 * 60,
  quietEnd: 7 * 60,
  timeZone: "Africa/Lagos",
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.pushPreference.findUnique.mockResolvedValue(null);
  mockPrisma.pushPreference.findMany.mockResolvedValue([]);
  mockPrisma.pushPreference.upsert.mockResolvedValue({});
});

describe("the switches", () => {
  it("cover every kind of push, each with words of its own", () => {
    for (const kind of Object.keys(CATEGORY_OF_KIND)) {
      const message = buildPushMessage("ExponentPushToken[token0000000001]", {
        kind,
      } as Parameters<typeof buildPushMessage>[1]);
      expect(message.body, kind).toBeTruthy();
    }
  });

  it("are the five the app lists, and each controls at least one kind", () => {
    expect([...PUSH_CATEGORIES]).toEqual([
      "PLANS_NEED_YOU",
      "PLAN_LODGED",
      "PLAN_SHARED",
      "SUBSCRIPTION",
      "WITHDRAWALS",
    ]);
    const used = new Set(Object.values(CATEGORY_OF_KIND));
    for (const category of PUSH_CATEGORIES) expect(used).toContain(category);
  });

  it("put a queried plan and a plan ready for physical submission on one switch", () => {
    expect(CATEGORY_OF_KIND.PLAN_QUERIED).toBe("PLANS_NEED_YOU");
    expect(CATEGORY_OF_KIND.READY_FOR_PHYSICAL).toBe("PLANS_NEED_YOU");
  });
});

describe("toPreferences", () => {
  it("is everything on, quiet hours off, 22:00 to 07:00 in Lagos, for a person who never chose", () => {
    expect(toPreferences(null)).toEqual({
      categories: {
        PLANS_NEED_YOU: true,
        PLAN_LODGED: true,
        PLAN_SHARED: true,
        SUBSCRIPTION: true,
        WITHDRAWALS: true,
      },
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
        timeZone: "Africa/Lagos",
      },
    });
  });

  it("shows what is switched off, and the times as HH:MM", () => {
    const prefs = toPreferences(
      row({
        categoriesOff: ["PLAN_SHARED", "WITHDRAWALS"],
        quietEnabled: true,
        quietStart: 23 * 60 + 30,
        quietEnd: 6 * 60 + 5,
        timeZone: "Europe/London",
      })
    );

    expect(prefs.categories).toEqual({
      PLANS_NEED_YOU: true,
      PLAN_LODGED: true,
      PLAN_SHARED: false,
      SUBSCRIPTION: true,
      WITHDRAWALS: false,
    });
    expect(prefs.quietHours).toEqual({
      enabled: true,
      start: "23:30",
      end: "06:05",
      timeZone: "Europe/London",
    });
  });

  it("ignores an off category it does not know (one a later version removed)", () => {
    expect(
      toPreferences(row({ categoriesOff: ["GONE"] })).categories
    ).toEqual(toPreferences(null).categories);
  });

  it("formats minutes after midnight with two digits each", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(9 * 60 + 5)).toBe("09:05");
    expect(formatMinutes(23 * 60 + 59)).toBe("23:59");
  });
});

describe("pushPreferencesPatch", () => {
  const ok = (value: unknown) => pushPreferencesPatch.safeParse(value).success;

  it.each([
    ["one switch", { categories: { PLAN_SHARED: false } }],
    ["every switch", { categories: Object.fromEntries(PUSH_CATEGORIES.map((c) => [c, true])) }],
    ["quiet hours on", { quietHours: { enabled: true } }],
    ["a start only", { quietHours: { start: "21:30" } }],
    ["all of quiet hours", { quietHours: { enabled: true, start: "22:00", end: "07:00", timeZone: "Africa/Lagos" } }],
    ["both parts", { categories: { SUBSCRIPTION: false }, quietHours: { enabled: false } }],
    ["a zone that is an offset or UTC", { quietHours: { timeZone: "UTC" } }],
  ])("takes %s", (_name, body) => {
    expect(ok(body)).toBe(true);
  });

  it.each([
    ["nothing", {}],
    ["empty parts", { categories: {}, quietHours: {} }],
    ["a switch the app has not got", { categories: { SOMETHING_ELSE: true } }],
    ["a key of its own", { other: 1 }],
    ["a quiet-hours key of its own", { quietHours: { enabled: true, loud: true } }],
    ["a switch that is not a boolean", { categories: { PLAN_SHARED: "no" } }],
    ["an enabled that is not a boolean", { quietHours: { enabled: "yes" } }],
    ["a time without its leading zero", { quietHours: { start: "7:00" } }],
    ["an hour of 24", { quietHours: { start: "24:00" } }],
    ["a minute of 60", { quietHours: { end: "07:60" } }],
    ["a time with seconds", { quietHours: { end: "07:00:00" } }],
    ["a time as a number", { quietHours: { start: 2200 } }],
    ["a time zone that does not exist", { quietHours: { timeZone: "Mars/Olympus" } }],
    ["an empty time zone", { quietHours: { timeZone: "" } }],
    ["a time zone that is too long", { quietHours: { timeZone: "A".repeat(65) } }],
    ["a body that is not an object", "categories"],
    ["null", null],
  ])("refuses %s", (_name, body) => {
    expect(ok(body)).toBe(false);
  });
});

describe("applyPatch", () => {
  it("switches one kind off without touching the others", () => {
    const next = applyPatch(null, { categories: { PLAN_SHARED: false } });
    expect(next.categoriesOff).toEqual(["PLAN_SHARED"]);
    expect(next.quietEnabled).toBe(false);
  });

  it("switches a kind back on", () => {
    const next = applyPatch(row({ categoriesOff: ["PLAN_SHARED", "WITHDRAWALS"] }), {
      categories: { PLAN_SHARED: true },
    });
    expect(next.categoriesOff).toEqual(["WITHDRAWALS"]);
  });

  it("keeps the off list in the order the app shows the switches, whatever order they were changed in", () => {
    const a = applyPatch(applyPatch(null, { categories: { WITHDRAWALS: false } }), {
      categories: { PLANS_NEED_YOU: false },
    });
    expect(a.categoriesOff).toEqual(["PLANS_NEED_YOU", "WITHDRAWALS"]);
  });

  it("does not turn a switch off twice", () => {
    const next = applyPatch(row({ categoriesOff: ["PLAN_LODGED"] }), {
      categories: { PLAN_LODGED: false },
    });
    expect(next.categoriesOff).toEqual(["PLAN_LODGED"]);
  });

  it("changes the quiet-hours fields that are sent and keeps the rest", () => {
    const base = row({ quietEnabled: true, timeZone: "Europe/London" });
    const next = applyPatch(base, { quietHours: { start: "21:30" } });
    expect(next).toEqual({ ...base, quietStart: 21 * 60 + 30 });
  });

  it("changes nothing in the row it was given", () => {
    const base = row({ categoriesOff: ["PLAN_LODGED"] });
    applyPatch(base, { categories: { PLAN_SHARED: false } });
    expect(base.categoriesOff).toEqual(["PLAN_LODGED"]);
  });
});

describe("getPushPreferences", () => {
  it("reads the person's own row, for this platform", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue(
      row({ categoriesOff: ["SUBSCRIPTION"] })
    );

    const prefs = await getPushPreferences("u1", "surfboard" as never);

    expect(mockPrisma.pushPreference.findUnique).toHaveBeenCalledWith({
      where: { userId_platform: { userId: "u1", platform: "surfboard" } },
    });
    expect(prefs.categories.SUBSCRIPTION).toBe(false);
  });

  it("answers the defaults when there is no row", async () => {
    expect(await getPushPreferences("u1", "surfboard" as never)).toEqual(
      toPreferences(null)
    );
  });
});

describe("updatePushPreferences", () => {
  it("writes the merged row, creating it the first time, and answers with everything", async () => {
    const prefs = await updatePushPreferences("u1", "surfboard" as never, {
      categories: { PLAN_SHARED: false },
    });

    const call = mockPrisma.pushPreference.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      userId_platform: { userId: "u1", platform: "surfboard" },
    });
    expect(call.create).toMatchObject({
      userId: "u1",
      platform: "surfboard",
      categoriesOff: ["PLAN_SHARED"],
    });
    expect(call.update).toMatchObject({ categoriesOff: ["PLAN_SHARED"] });
    expect(call.update).not.toHaveProperty("userId");
    expect(prefs.categories.PLAN_SHARED).toBe(false);
    expect(prefs.categories.PLAN_LODGED).toBe(true);
  });

  it("builds on what the person already chose", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue(
      row({ categoriesOff: ["WITHDRAWALS"], quietEnabled: true })
    );

    const prefs = await updatePushPreferences("u1", "surfboard" as never, {
      categories: { PLAN_LODGED: false },
    });

    expect(prefs.categories.WITHDRAWALS).toBe(false);
    expect(prefs.categories.PLAN_LODGED).toBe(false);
    expect(prefs.quietHours.enabled).toBe(true);
  });

  it("refuses quiet hours that start and end together, and writes nothing", async () => {
    await expect(
      updatePushPreferences("u1", "surfboard" as never, {
        quietHours: { start: "08:00", end: "08:00" },
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.pushPreference.upsert).not.toHaveBeenCalled();
  });

  it("refuses a start equal to the end that is already saved", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue(row());

    await expect(
      updatePushPreferences("u1", "surfboard" as never, {
        quietHours: { start: "07:00" },
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.pushPreference.upsert).not.toHaveBeenCalled();
  });
});

describe("inQuietHours", () => {
  // Lagos is UTC+1 all year, so 21:30Z is 22:30 there.
  const quiet = (over: Record<string, unknown> = {}) =>
    row({ quietEnabled: true, ...over });
  const at = (iso: string) => new Date(iso);

  it("is quiet inside hours that run through midnight, on both sides of it", () => {
    expect(inQuietHours(at("2026-10-29T21:30:00Z"), quiet())).toBe(true); // 22:30
    expect(inQuietHours(at("2026-10-29T23:30:00Z"), quiet())).toBe(true); // 00:30
    expect(inQuietHours(at("2026-10-30T05:59:00Z"), quiet())).toBe(true); // 06:59
  });

  it("starts at the start minute and ends before the end minute", () => {
    expect(inQuietHours(at("2026-10-29T20:59:00Z"), quiet())).toBe(false); // 21:59
    expect(inQuietHours(at("2026-10-29T21:00:00Z"), quiet())).toBe(true); // 22:00
    expect(inQuietHours(at("2026-10-30T06:00:00Z"), quiet())).toBe(false); // 07:00
  });

  it("is not quiet in the day", () => {
    expect(inQuietHours(at("2026-10-29T12:00:00Z"), quiet())).toBe(false);
  });

  it("works for hours inside one day", () => {
    const lunch = quiet({ quietStart: 13 * 60, quietEnd: 15 * 60 });
    expect(inQuietHours(at("2026-10-29T11:59:00Z"), lunch)).toBe(false); // 12:59 Lagos
    expect(inQuietHours(at("2026-10-29T12:00:00Z"), lunch)).toBe(true); // 13:00
    expect(inQuietHours(at("2026-10-29T13:59:00Z"), lunch)).toBe(true); // 14:59
    expect(inQuietHours(at("2026-10-29T14:00:00Z"), lunch)).toBe(false); // 15:00
  });

  it("reads the hours in the person's own time zone", () => {
    const instant = at("2026-10-29T21:30:00Z");
    expect(inQuietHours(instant, quiet({ timeZone: "Africa/Lagos" }))).toBe(true); // 22:30
    expect(inQuietHours(instant, quiet({ timeZone: "Asia/Tokyo" }))).toBe(true); // 06:30 next day
    expect(inQuietHours(instant, quiet({ timeZone: "America/New_York" }))).toBe(false); // 17:30
  });

  it("counts midnight as 00:00, not 24:00", () => {
    const night = quiet({ quietStart: 0, quietEnd: 60, timeZone: "UTC" });
    expect(inQuietHours(at("2026-10-29T00:00:00Z"), night)).toBe(true);
    expect(inQuietHours(at("2026-10-29T01:00:00Z"), night)).toBe(false);
  });

  it("is never quiet when it is switched off", () => {
    expect(
      inQuietHours(at("2026-10-29T21:30:00Z"), quiet({ quietEnabled: false }))
    ).toBe(false);
  });

  it("is never quiet when the start and the end are the same minute", () => {
    expect(
      inQuietHours(at("2026-10-29T21:30:00Z"), quiet({ quietStart: 600, quietEnd: 600 }))
    ).toBe(false);
  });

  it("is not quiet for a time zone this server cannot read", () => {
    expect(
      inQuietHours(at("2026-10-29T21:30:00Z"), quiet({ timeZone: "Mars/Olympus" }))
    ).toBe(false);
  });
});

describe("usersWhoWant", () => {
  const NIGHT = new Date("2026-10-29T22:00:00Z"); // 23:00 in Lagos
  const DAY = new Date("2026-10-29T12:00:00Z");

  it("asks nothing for nobody", async () => {
    expect(await usersWhoWant([], "PLAN_SHARED", "surfboard" as never, DAY)).toEqual([]);
    expect(mockPrisma.pushPreference.findMany).not.toHaveBeenCalled();
  });

  it("wants everything from a person who never chose (no row)", async () => {
    expect(
      await usersWhoWant(["u1", "u2"], "PLAN_LODGED", "surfboard" as never, NIGHT)
    ).toEqual(["u1", "u2"]);
  });

  it("looks only at the people asked about, on this platform, in one query", async () => {
    await usersWhoWant(["u1", "u2"], "PLAN_LODGED", "surfboard" as never, DAY);

    expect(mockPrisma.pushPreference.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.pushPreference.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["u1", "u2"] }, platform: "surfboard" },
    });
  });

  it("leaves out whoever switched this kind off, and only for that kind", async () => {
    mockPrisma.pushPreference.findMany.mockResolvedValue([
      { userId: "u1", ...row({ categoriesOff: ["PLAN_SHARED"] }) },
    ]);

    expect(
      await usersWhoWant(["u1", "u2"], "PLAN_SHARED", "surfboard" as never, DAY)
    ).toEqual(["u2"]);
    expect(
      await usersWhoWant(["u1", "u2"], "PLAN_LODGED", "surfboard" as never, DAY)
    ).toEqual(["u1", "u2"]);
  });

  it("treats a queried plan and one ready for physical submission as the same switch", async () => {
    mockPrisma.pushPreference.findMany.mockResolvedValue([
      { userId: "u1", ...row({ categoriesOff: ["PLANS_NEED_YOU"] }) },
    ]);

    for (const kind of ["PLAN_QUERIED", "READY_FOR_PHYSICAL"] as const) {
      expect(await usersWhoWant(["u1"], kind, "surfboard" as never, DAY)).toEqual([]);
    }
  });

  it("leaves out whoever is in quiet hours, at every kind, and only while they last", async () => {
    mockPrisma.pushPreference.findMany.mockResolvedValue([
      { userId: "u1", ...row({ quietEnabled: true }) },
    ]);

    expect(
      await usersWhoWant(["u1", "u2"], "WITHDRAWAL_UPDATED", "surfboard" as never, NIGHT)
    ).toEqual(["u2"]);
    expect(
      await usersWhoWant(["u1", "u2"], "WITHDRAWAL_UPDATED", "surfboard" as never, DAY)
    ).toEqual(["u1", "u2"]);
  });

  it("keeps a person whose quiet hours are saved but switched off", async () => {
    mockPrisma.pushPreference.findMany.mockResolvedValue([
      { userId: "u1", ...row({ quietEnabled: false }) },
    ]);

    expect(
      await usersWhoWant(["u1"], "PLAN_QUERIED", "surfboard" as never, NIGHT)
    ).toEqual(["u1"]);
  });
});
