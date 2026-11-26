import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { NextRequest } from "next/server";

const mockRate = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  countAttempts: vi.fn(async () => 0),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockTurnstile = vi.hoisted(() => ({
  isTurnstileEnabled: vi.fn(() => false),
  verifyTurnstile: vi.fn(),
}));
const mockLookup = vi.hoisted(() => ({ findUserByEmail: vi.fn() }));

vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/security/turnstile", () => mockTurnstile);
const mockSession = vi.hoisted(() => ({ issueSession: vi.fn() }));
vi.mock("@/lib/auth/session", () => mockSession);
// These tests are about the rate-limit key, not the password check: do not pay a real bcrypt hash per call.
const mockVerify = vi.hoisted(() => ({ verifyPassword: vi.fn() }));
vi.mock("@/lib/auth/passwordCheck", () => mockVerify);

const { POST: login } = await import("@/app/api/v1/auth/login/route");

const post = (email: string, extra: Record<string, unknown> = {}) =>
  new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      platform: "surfboard",
      email,
      password: "x",
      ...extra,
    }),
  });

describe("POST /login rate-limit key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.checkRateLimit.mockResolvedValue(true);
    mockLookup.findUserByEmail.mockResolvedValue(null);
    mockVerify.verifyPassword.mockResolvedValue(false);
  });

  it("is the same for every casing of one address, so changing case can't reset the limit", async () => {
    await login(post("John@Example.com"));
    await login(post("JOHN@EXAMPLE.COM"));
    await login(post("john@example.com"));

    const keys = mockRate.checkRateLimit.mock.calls.map((c) => c[0]);
    expect(keys).toHaveLength(3);
    expect(new Set(keys)).toEqual(new Set(["1.2.3.4:john@example.com"]));
    expect(mockRate.recordAttempt).toHaveBeenCalledWith(
      "1.2.3.4:john@example.com",
      undefined
    );
  });

  it("looks the account up with the address as typed (the lookup itself is case-insensitive)", async () => {
    await login(post("John@Example.com"));
    expect(mockLookup.findUserByEmail).toHaveBeenCalledWith(
      "surfboard",
      "John@Example.com"
    );
  });
});

describe("POST /login password check (I-054)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.checkRateLimit.mockResolvedValue(true);
    mockVerify.verifyPassword.mockResolvedValue(false);
  });

  it("checks the password once whether the email is unknown, has no password, or is a real account", async () => {
    mockLookup.findUserByEmail.mockResolvedValueOnce(null);
    const unknown = await login(post("a@example.com"));
    mockLookup.findUserByEmail.mockResolvedValueOnce({
      id: "u2",
      passwordHash: null,
    });
    const kindeOnly = await login(post("b@example.com"));
    mockLookup.findUserByEmail.mockResolvedValueOnce({
      id: "u3",
      passwordHash: "stored-hash",
    });
    const wrong = await login(post("c@example.com"));

    expect(mockVerify.verifyPassword.mock.calls).toEqual([
      ["x", undefined],
      ["x", null],
      ["x", "stored-hash"],
    ]);
    for (const res of [unknown, kindeOnly, wrong]) {
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        success: false,
        error: "Invalid email or password",
      });
    }
  });
});

describe("POST /login account guard (I-058)", () => {
  const ACCOUNT_KEY = "web-login-fail:john@example.com";
  const challengeResponse = {
    success: false,
    error: "Please confirm you are not a robot, then sign in again.",
    code: "CHALLENGE_REQUIRED",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.checkRateLimit.mockResolvedValue(true);
    mockRate.countAttempts.mockResolvedValue(0);
    mockTurnstile.isTurnstileEnabled.mockReturnValue(false);
    mockLookup.findUserByEmail.mockResolvedValue(null);
    mockVerify.verifyPassword.mockResolvedValue(false);
  });

  it("counts a failure against the account itself, for a real account and an unknown address alike", async () => {
    mockLookup.findUserByEmail.mockResolvedValueOnce({
      id: "u1",
      passwordHash: "h",
    });
    await login(post("John@Example.com"));
    mockLookup.findUserByEmail.mockResolvedValueOnce(null);
    await login(post("john@example.com"));

    expect(mockRate.recordAttempt).toHaveBeenCalledWith(ACCOUNT_KEY, "u1");
    expect(mockRate.recordAttempt).toHaveBeenCalledWith(ACCOUNT_KEY, undefined);
  });

  it("reads the account's failures over 15 minutes, from every address", async () => {
    await login(post("John@Example.com"));
    expect(mockRate.countAttempts).toHaveBeenCalledWith(
      ACCOUNT_KEY,
      15 * 60 * 1000
    );
  });

  it("asks for nothing while the account has under two failures, even with the keys set", async () => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(true);
    mockRate.countAttempts.mockResolvedValue(1);
    const res = await login(post("john@example.com"));
    expect(res.status).toBe(401);
    expect(mockTurnstile.verifyTurnstile).not.toHaveBeenCalled();
    expect(mockVerify.verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("asks for the challenge at two failures and does not look at the password or the account without it", async () => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(true);
    mockRate.countAttempts.mockResolvedValue(2);
    mockTurnstile.verifyTurnstile.mockResolvedValue({
      ok: false,
      reason: "missing-token",
    });

    const res = await login(post("john@example.com"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(challengeResponse);
    expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
    expect(mockVerify.verifyPassword).not.toHaveBeenCalled();
    expect(mockRate.recordAttempt).not.toHaveBeenCalled();
  });

  it("hands Cloudflare the token, the sign-in's own action and the caller's address", async () => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(true);
    mockRate.countAttempts.mockResolvedValue(3);
    mockTurnstile.verifyTurnstile.mockResolvedValue({ ok: true });

    const res = await login(
      post("john@example.com", { turnstileToken: "tok" })
    );
    expect(mockTurnstile.verifyTurnstile).toHaveBeenCalledWith({
      token: "tok",
      action: "login",
      remoteIp: "1.2.3.4",
      requestHost: "localhost:3000",
    });
    // It went on to the password check (wrong here), not straight to a refusal.
    expect(mockVerify.verifyPassword).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
  });

  it("lets a solved challenge through to a correct sign-in", async () => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(true);
    mockRate.countAttempts.mockResolvedValue(2);
    mockTurnstile.verifyTurnstile.mockResolvedValue({ ok: true });
    mockLookup.findUserByEmail.mockResolvedValue({
      id: "u1",
      email: "john@example.com",
      role: "SURFBOARD_USER",
      isActive: true,
      passwordHash: "h",
    });
    mockVerify.verifyPassword.mockResolvedValue(true);

    const res = await login(
      post("john@example.com", { turnstileToken: "tok" })
    );
    expect(res.status).toBe(200);
    expect(mockSession.issueSession).toHaveBeenCalledTimes(1);
  });

  it("answers a refused token the same way as a missing one, and Cloudflare being unreachable with a 503", async () => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(true);
    mockRate.countAttempts.mockResolvedValue(2);

    mockTurnstile.verifyTurnstile.mockResolvedValueOnce({
      ok: false,
      reason: "rejected",
    });
    const rejected = await login(
      post("john@example.com", { turnstileToken: "x" })
    );
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toEqual(challengeResponse);

    mockTurnstile.verifyTurnstile.mockResolvedValueOnce({
      ok: false,
      reason: "unavailable",
    });
    const down = await login(post("john@example.com", { turnstileToken: "x" }));
    expect(down.status).toBe(503);
    expect(mockVerify.verifyPassword).not.toHaveBeenCalled();
  });

  it("asks for no challenge while the Turnstile keys are not set, however many failures", async () => {
    mockRate.countAttempts.mockResolvedValue(19);
    const res = await login(post("john@example.com"));
    expect(res.status).toBe(401);
    expect(mockTurnstile.verifyTurnstile).not.toHaveBeenCalled();
    expect(mockVerify.verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("refuses at twenty failures, challenge or not, without checking the password or recording more", async () => {
    mockRate.countAttempts.mockResolvedValue(20);
    for (const keys of [false, true]) {
      mockTurnstile.isTurnstileEnabled.mockReturnValue(keys);
      const res = await login(
        post("john@example.com", { turnstileToken: "tok" })
      );
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({
        success: false,
        error: "Too many attempts. Try again later.",
      });
    }
    expect(mockTurnstile.verifyTurnstile).not.toHaveBeenCalled();
    expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
    expect(mockVerify.verifyPassword).not.toHaveBeenCalled();
    expect(mockRate.recordAttempt).not.toHaveBeenCalled();
  });

  it("does not count a correct password as a failure", async () => {
    mockLookup.findUserByEmail.mockResolvedValue({
      id: "u1",
      email: "john@example.com",
      role: "SURFBOARD_USER",
      isActive: true,
      passwordHash: "h",
    });
    mockVerify.verifyPassword.mockResolvedValue(true);
    const res = await login(post("john@example.com"));
    expect(res.status).toBe(200);
    expect(mockRate.recordAttempt).not.toHaveBeenCalled();
  });
});

describe("POST /login log lines (I-058)", () => {
  let warn: MockInstance<typeof console.warn>;
  let info: MockInstance<typeof console.log>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.checkRateLimit.mockResolvedValue(true);
    mockRate.countAttempts.mockResolvedValue(0);
    mockTurnstile.isTurnstileEnabled.mockReturnValue(false);
    mockLookup.findUserByEmail.mockResolvedValue(null);
    mockVerify.verifyPassword.mockResolvedValue(false);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    info = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    info.mockRestore();
  });

  it("writes one warn line per failed sign-in that names the account only by a tag", async () => {
    await login(post("John@Example.com", { password: "hunter2-secret" }));
    await login(post("john@example.com"));

    expect(warn).toHaveBeenCalledTimes(2);
    const [first, second] = warn.mock.calls.map((c) =>
      JSON.parse(String(c[0]))
    );
    expect(first).toMatchObject({
      level: "warn",
      message: "Web sign-in",
      event: "web.login",
      outcome: "invalid_credentials",
      platform: "surfboard",
    });
    expect(first.accountTag).toMatch(/^[0-9a-f]{12}$/);
    expect(first.clientTag).toMatch(/^[0-9a-f]{12}$/);
    // The same account is the same tag, whatever the casing.
    expect(second.accountTag).toBe(first.accountTag);

    const text = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(text).not.toContain("example.com");
    expect(text).not.toContain("hunter2-secret");
    expect(text).not.toContain("1.2.3.4");
  });

  it("logs the refusals by their own names, and a success as info with the account id", async () => {
    mockRate.checkRateLimit.mockResolvedValueOnce(false);
    await login(post("john@example.com"));
    mockRate.countAttempts.mockResolvedValueOnce(20);
    await login(post("john@example.com"));

    mockLookup.findUserByEmail.mockResolvedValue({
      id: "u1",
      email: "john@example.com",
      role: "SURFBOARD_USER",
      isActive: true,
      passwordHash: "h",
    });
    mockVerify.verifyPassword.mockResolvedValue(true);
    await login(post("john@example.com"));

    const outcomes = warn.mock.calls.map(
      (c) => JSON.parse(String(c[0])).outcome
    );
    expect(outcomes).toEqual(["rate_limited", "account_limited"]);
    const ok = info.mock.calls
      .map((c) => JSON.parse(String(c[0])))
      .find((l) => l.event === "web.login");
    expect(ok).toMatchObject({ level: "info", outcome: "ok", userId: "u1" });
  });
});
