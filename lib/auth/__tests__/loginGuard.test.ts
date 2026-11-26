import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

const mockRate = vi.hoisted(() => ({ countAttempts: vi.fn() }));
vi.mock("@/lib/auth/rateLimit", () => mockRate);

const {
  ACCOUNT_CHALLENGE_AFTER,
  ACCOUNT_FAILURE_CAP,
  ACCOUNT_WINDOW_MS,
  accountFailureKey,
  getAccountGuardState,
  logTag,
  logWebLogin,
} = await import("@/lib/auth/loginGuard");

describe("account guard thresholds (I-058)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the numbers the docs state: a challenge at 2, a block at 20, over 15 minutes", () => {
    expect(ACCOUNT_CHALLENGE_AFTER).toBe(2);
    expect(ACCOUNT_FAILURE_CAP).toBe(20);
    expect(ACCOUNT_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it("keys the account by its lowercased, trimmed address", () => {
    expect(accountFailureKey("  John@Example.COM ")).toBe(
      "web-login-fail:john@example.com"
    );
  });

  it.each([
    [0, "ok"],
    [1, "ok"],
    [2, "challenge"],
    [19, "challenge"],
    [20, "blocked"],
    [500, "blocked"],
  ])("%i failures is %s", async (failures, state) => {
    mockRate.countAttempts.mockResolvedValue(failures);
    const result = await getAccountGuardState("John@Example.com");
    expect(result).toEqual({ failures, state });
    expect(mockRate.countAttempts).toHaveBeenCalledWith(
      "web-login-fail:john@example.com",
      ACCOUNT_WINDOW_MS
    );
  });
});

describe("logTag", () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it("is 12 hex characters, the same for every casing, and does not contain the value", () => {
    const tag = logTag("account", "John@Example.com");
    expect(tag).toMatch(/^[0-9a-f]{12}$/);
    expect(logTag("account", " JOHN@EXAMPLE.COM ")).toBe(tag);
    expect(tag).not.toContain("john");
  });

  it("differs by value, by kind and by server secret, so it cannot be matched without the secret", () => {
    process.env.JWT_SECRET = "secret-one";
    const one = logTag("account", "a@example.com");
    expect(logTag("account", "b@example.com")).not.toBe(one);
    expect(logTag("client", "a@example.com")).not.toBe(one);
    process.env.JWT_SECRET = "secret-two";
    expect(logTag("account", "a@example.com")).not.toBe(one);
  });
});

describe("logWebLogin", () => {
  let warn: MockInstance<typeof console.warn>;
  let log: MockInstance<typeof console.log>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    log.mockRestore();
  });

  it("puts a success at info and every refusal at warn, with the reason when there is one", () => {
    const fields = {
      platform: "reva",
      email: "a@example.com",
      clientIp: "9.9.9.9",
    };
    logWebLogin("ok", { ...fields, userId: "u1" });
    logWebLogin("challenge_failed", { ...fields, reason: "rejected" });

    expect(log).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    const refused = JSON.parse(String(warn.mock.calls[0][0]));
    expect(refused).toMatchObject({
      outcome: "challenge_failed",
      reason: "rejected",
      platform: "reva",
    });
    expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toMatch(
      /a@example\.com|9\.9\.9\.9/
    );
  });
});
