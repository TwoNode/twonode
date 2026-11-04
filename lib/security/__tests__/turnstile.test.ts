import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTurnstileEnabled, verifyTurnstile } from "@/lib/security/turnstile";

const SECRET = "test-secret-value-not-a-real-key";
const TOKEN = "XXXX.test-token.XXXX";

const mockFetch = vi.fn();

const answer = (body: unknown, init: { status?: number } = {}) =>
  Promise.resolve({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    json: async () => body,
  });

const good = (over: Record<string, unknown> = {}) =>
  answer({
    success: true,
    action: "contact",
    hostname: "www.example.com",
    "error-codes": [],
    ...over,
  });

const verify = (over: Record<string, unknown> = {}) =>
  verifyTurnstile({
    token: TOKEN,
    action: "contact",
    remoteIp: "203.0.113.7",
    requestHost: "www.example.com",
    ...over,
  } as Parameters<typeof verifyTurnstile>[0]);

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("TURNSTILE_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0xTESTSITEKEY");
  vi.stubEnv("TURNSTILE_HOSTNAMES", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isTurnstileEnabled", () => {
  it("is on only when both the secret and the site key are set", () => {
    expect(isTurnstileEnabled()).toBe(true);

    vi.stubEnv("TURNSTILE_SECRET", "");
    expect(isTurnstileEnabled()).toBe(false);

    vi.stubEnv("TURNSTILE_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(isTurnstileEnabled()).toBe(false);
  });
});

describe("verifyTurnstile: the token itself", () => {
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a number", 12345],
    ["an object", { token: TOKEN }],
    ["an empty string", ""],
    ["a string over 2048 characters", "x".repeat(2049)],
  ])("refuses %s without calling Cloudflare", async (_label, token) => {
    const r = await verify({ token });

    expect(r).toEqual({ ok: false, reason: "missing-token" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts a token of exactly 2048 characters (it is Cloudflare's limit, not ours)", async () => {
    mockFetch.mockReturnValue(good());
    const r = await verify({ token: "x".repeat(2048) });

    expect(r.ok).toBe(true);
  });
});

describe("verifyTurnstile: what is sent to Cloudflare", () => {
  it("posts the secret, the token and the visitor's address, form encoded, with a timeout", async () => {
    mockFetch.mockReturnValue(good());
    await verify();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    );
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe(SECRET);
    expect(body.get("response")).toBe(TOKEN);
    expect(body.get("remoteip")).toBe("203.0.113.7");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("leaves remoteip out when the address is not known", async () => {
    mockFetch.mockReturnValue(good());
    await verify({ remoteIp: undefined });

    expect(
      (mockFetch.mock.calls[0][1].body as URLSearchParams).has("remoteip")
    ).toBe(false);
  });
});

describe("verifyTurnstile: the answer", () => {
  it("accepts success for the right action on the right hostname", async () => {
    mockFetch.mockReturnValue(good());

    expect(await verify()).toEqual({ ok: true });
  });

  it("refuses success:false and passes Cloudflare's error codes on", async () => {
    mockFetch.mockReturnValue(
      answer({ success: false, "error-codes": ["invalid-input-response"] })
    );

    expect(await verify()).toEqual({
      ok: false,
      reason: "rejected",
      codes: ["invalid-input-response"],
    });
  });

  it("refuses a token used twice (Cloudflare answers timeout-or-duplicate)", async () => {
    mockFetch.mockReturnValue(
      answer({ success: false, "error-codes": ["timeout-or-duplicate"] })
    );

    const r = await verify();
    expect(r).toMatchObject({ ok: false, reason: "rejected" });
  });

  it("treats anything but exactly success:true as a refusal", async () => {
    for (const success of ["true", 1, null, undefined]) {
      mockFetch.mockReturnValue(good({ success }));
      expect(await verify()).toMatchObject({ ok: false, reason: "rejected" });
    }
  });

  it("refuses a token minted for another form", async () => {
    mockFetch.mockReturnValue(good({ action: "login" }));

    expect(await verify()).toEqual({ ok: false, reason: "wrong-action" });
  });

  it("refuses a token with no action at all", async () => {
    mockFetch.mockReturnValue(good({ action: undefined }));

    expect(await verify()).toEqual({ ok: false, reason: "wrong-action" });
  });

  it("refuses a token solved on a different hostname", async () => {
    mockFetch.mockReturnValue(good({ hostname: "evil.example" }));

    expect(await verify()).toEqual({ ok: false, reason: "wrong-hostname" });
  });

  it("refuses an answer with no hostname", async () => {
    mockFetch.mockReturnValue(good({ hostname: undefined }));

    expect(await verify()).toEqual({ ok: false, reason: "wrong-hostname" });
  });

  it("shouts when the secret key itself is refused, because that blocks every visitor", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockReturnValue(
      answer({ success: false, "error-codes": ["invalid-input-secret"] })
    );

    const r = await verify();

    expect(r).toMatchObject({ ok: false, reason: "rejected" });
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("TURNSTILE_SECRET"),
      ["invalid-input-secret"]
    );
  });

  it("calls an internal-error answer 'unavailable': Cloudflare's trouble, not the visitor's", async () => {
    mockFetch.mockReturnValue(
      answer({ success: false, "error-codes": ["internal-error"] })
    );

    expect(await verify()).toMatchObject({ ok: false, reason: "unavailable" });
  });
});

describe("verifyTurnstile: fails closed", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses when Cloudflare answers with an error status", async () => {
    mockFetch.mockReturnValue(answer({ success: true }, { status: 500 }));

    expect(await verify()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("refuses when the request fails or times out", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    expect(await verify()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("refuses when the answer is not JSON", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      })
    );

    expect(await verify()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("refuses when the secret is not set (the route checks isTurnstileEnabled first)", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "");

    expect(await verify()).toEqual({ ok: false, reason: "unavailable" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("never writes the token or the secret to the log", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("boom"));
    await verify();
    mockFetch.mockReturnValueOnce(
      answer({ success: false, "error-codes": ["invalid-input-secret"] })
    );
    await verify();

    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(SECRET);
  });
});

describe("verifyTurnstile: which hostnames are expected", () => {
  it("falls back to the request's own host, without its port", async () => {
    mockFetch.mockReturnValue(good({ hostname: "localhost" }));

    expect(await verify({ requestHost: "localhost:3000" })).toEqual({
      ok: true,
    });
  });

  it("uses the first host of a forwarded list and ignores letter case", async () => {
    mockFetch.mockReturnValue(good({ hostname: "WWW.Example.com" }));

    expect(
      await verify({ requestHost: "www.example.com, proxy.internal" })
    ).toEqual({ ok: true });
  });

  it("refuses without calling Cloudflare when there is no host to compare against", async () => {
    expect(await verify({ requestHost: null })).toEqual({
      ok: false,
      reason: "wrong-hostname",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("TURNSTILE_HOSTNAMES replaces the request host, and may list several", async () => {
    vi.stubEnv("TURNSTILE_HOSTNAMES", " www.example.com , example.com ");

    mockFetch.mockReturnValueOnce(good({ hostname: "example.com" }));
    expect(await verify({ requestHost: "unrelated.test" })).toEqual({
      ok: true,
    });

    // The request's own host no longer counts once the list is set.
    mockFetch.mockReturnValueOnce(good({ hostname: "unrelated.test" }));
    expect(await verify({ requestHost: "unrelated.test" })).toEqual({
      ok: false,
      reason: "wrong-hostname",
    });
  });
});
