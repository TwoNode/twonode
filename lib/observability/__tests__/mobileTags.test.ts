import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deviceHash,
  logMobileAuthEvent,
  mobileRequestContext,
  mobileTags,
} from "@/lib/observability/mobileTags";

const headers = (init: Record<string, string>) => ({
  get: (name: string) => init[name.toLowerCase()] ?? null,
});

afterEach(() => vi.restoreAllMocks());

describe("mobileTags", () => {
  it("names the store and the version the app sent", () => {
    expect(
      mobileTags({
        headers: headers({
          "x-app-platform": "android",
          "x-app-version": "1.4.2",
        }),
      })
    ).toEqual({ appPlatform: "android", appVersion: "1.4.2" });
  });

  it("reads the store whatever its capitals or spaces", () => {
    expect(
      mobileTags({ headers: headers({ "x-app-platform": " iOS " }) })
    ).toEqual({ appPlatform: "ios" });
  });

  it("says nothing for a website request (neither header)", () => {
    expect(mobileTags({ headers: headers({}) })).toEqual({});
  });

  it("does not repeat a store it does not know, or a version that is not one", () => {
    expect(
      mobileTags({
        headers: headers({
          "x-app-platform": "<script>",
          "x-app-version": '1.0"}\nINJECTED',
        }),
      })
    ).toEqual({ appPlatform: "unknown", appVersion: "invalid" });
  });

  it("does not let a long value fill the log", () => {
    expect(
      mobileTags({ headers: headers({ "x-app-version": "9".repeat(500) }) })
    ).toEqual({ appVersion: "invalid" });
    expect(
      mobileTags({ headers: headers({ "x-app-version": "9".repeat(32) }) })
    ).toEqual({ appVersion: "9".repeat(32) });
  });

  it("keeps a pre-release or build suffix a person might see in a beta", () => {
    expect(
      mobileTags({ headers: headers({ "x-app-version": "1.5.0-beta.2" }) })
    ).toEqual({ appVersion: "1.5.0-beta.2" });
  });
});

describe("mobileRequestContext", () => {
  it("is where the request went and which build asked", () => {
    expect(
      mobileRequestContext({
        method: "POST",
        nextUrl: { pathname: "/api/v1/auth/mobile/login" },
        headers: headers({ "x-app-platform": "ios", "x-app-version": "2.0.0" }),
      })
    ).toEqual({
      route: "/api/v1/auth/mobile/login",
      method: "POST",
      appPlatform: "ios",
      appVersion: "2.0.0",
    });
  });
});

describe("deviceHash", () => {
  it("is twelve hex characters, the same for the same device and not the id", () => {
    const hash = deviceHash("device-12345678");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(deviceHash("device-12345678")).toBe(hash);
    expect(deviceHash("device-12345679")).not.toBe(hash);
    expect(hash).not.toContain("device");
  });
});

describe("logMobileAuthEvent", () => {
  const line = (spy: ReturnType<typeof vi.spyOn>) =>
    JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;

  it("logs a success at info and a refusal at warn, one JSON line each", () => {
    const info = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    logMobileAuthEvent("mobile.login", "ok", { appVersion: "1.0.0" });
    logMobileAuthEvent("mobile.login", "invalid_credentials", {
      appVersion: "1.0.0",
    });

    expect(line(info)).toMatchObject({
      level: "info",
      event: "mobile.login",
      outcome: "ok",
      appVersion: "1.0.0",
    });
    expect(line(warn)).toMatchObject({
      level: "warn",
      event: "mobile.login",
      outcome: "invalid_credentials",
    });
  });
});
