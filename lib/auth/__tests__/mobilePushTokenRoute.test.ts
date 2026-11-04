import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSession = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const mockTokens = vi.hoisted(() => ({
  registerDeviceToken: vi.fn(),
  removeDeviceToken: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => mockSession);
// The real token pattern and OS list are kept: the route's checks use them.
vi.mock("@/lib/push/deviceTokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/push/deviceTokens")>()),
  ...mockTokens,
}));

const { POST, DELETE } =
  await import("@/app/api/v1/auth/mobile/push-token/route");

const URL = "http://localhost:3000/api/v1/auth/mobile/push-token";
const TOKEN = "ExponentPushToken[abcdefgh12345678]";
const BEARER = { authorization: "Bearer access-token" };

const request = (
  method: "POST" | "DELETE",
  body: unknown,
  headers: Record<string, string> = BEARER
) =>
  new NextRequest(URL, {
    method,
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const registerBody = (over: Record<string, unknown> = {}) => ({
  deviceId: "device-abcdef01",
  token: TOKEN,
  os: "android",
  appVersion: "1.0.0",
  ...over,
});

const session = (over: Record<string, unknown> = {}) => ({
  sub: "u1",
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});

const call = (
  handler: typeof POST,
  method: "POST" | "DELETE",
  body: unknown,
  headers?: Record<string, string>
) => handler(request(method, body, headers), { params: Promise.resolve({}) });

beforeEach(() => {
  vi.resetAllMocks();
  mockSession.getServerSession.mockResolvedValue(session());
  mockTokens.registerDeviceToken.mockResolvedValue(true);
  mockTokens.removeDeviceToken.mockResolvedValue(1);
});

describe("POST /api/v1/auth/mobile/push-token", () => {
  it("registers the token for the caller's own device and answers nothing but {}", async () => {
    const res = await call(POST, "POST", registerBody());

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ success: true, data: {} });
    // The token is never read back to the client.
    expect(text).not.toContain(TOKEN);
    expect(mockTokens.registerDeviceToken).toHaveBeenCalledWith(
      "u1",
      "surfboard",
      {
        deviceId: "device-abcdef01",
        token: TOKEN,
        os: "android",
        appVersion: "1.0.0",
      }
    );
  });

  it("takes the user from the session, never from the body", async () => {
    await call(POST, "POST", registerBody({ userId: "someone-else" }));

    expect(mockTokens.registerDeviceToken.mock.calls[0][0]).toBe("u1");
    expect(mockTokens.registerDeviceToken.mock.calls[0][2]).not.toHaveProperty(
      "userId"
    );
  });

  it("answers 404 for a device that is not a live session of the caller", async () => {
    mockTokens.registerDeviceToken.mockResolvedValue(false);

    const res = await call(POST, "POST", registerBody());

    expect(res.status).toBe(404);
  });

  it.each([
    ["no body", undefined],
    ["a token that is not an Expo token", registerBody({ token: "fcm:abc" })],
    ["no token", registerBody({ token: undefined })],
    ["an unknown platform", registerBody({ os: "windows" })],
    ["a device id that is too short", registerBody({ deviceId: "short" })],
    ["a device id that is too long", registerBody({ deviceId: "d".repeat(129) })],
    ["an app version that is too long", registerBody({ appVersion: "9".repeat(33) })],
  ])("answers 400 and keeps nothing for %s", async (_name, body) => {
    const res = await call(POST, "POST", body);

    expect(res.status).toBe(400);
    expect(mockTokens.registerDeviceToken).not.toHaveBeenCalled();
  });

  it("takes an install that sends no app version", async () => {
    const res = await call(POST, "POST", registerBody({ appVersion: undefined }));
    expect(res.status).toBe(200);
  });

  it("answers 401 with no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await call(POST, "POST", registerBody());

    expect(res.status).toBe(401);
    expect(mockTokens.registerDeviceToken).not.toHaveBeenCalled();
  });

  it("asks for a Surfboard session, and answers 403 to a role that is not a surveyor's", async () => {
    mockSession.getServerSession.mockResolvedValue(session({ role: "ADMIN" }));

    const res = await call(POST, "POST", registerBody());

    expect(mockSession.getServerSession).toHaveBeenCalledWith("surfboard");
    expect(res.status).toBe(403);
    expect(mockTokens.registerDeviceToken).not.toHaveBeenCalled();
  });

  it("blocks a browser request that came from another site", async () => {
    // Cookies, no bearer header, and an Origin that is not this host.
    const res = await call(POST, "POST", registerBody(), {
      origin: "https://evil.example",
    });

    expect(res.status).toBe(403);
    expect(mockTokens.registerDeviceToken).not.toHaveBeenCalled();
  });

  it("blocks a cookie request that names no origin at all", async () => {
    const res = await call(POST, "POST", registerBody(), {});

    expect(res.status).toBe(403);
    expect(mockTokens.registerDeviceToken).not.toHaveBeenCalled();
  });

  it("holds an unverified account at the gate", async () => {
    mockSession.getServerSession.mockResolvedValue(
      session({ emailVerified: false, mustVerifyNow: true })
    );

    const res = await call(POST, "POST", registerBody());

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect(mockTokens.registerDeviceToken).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/auth/mobile/push-token", () => {
  it("forgets this device's token for the caller", async () => {
    const res = await call(DELETE, "DELETE", { deviceId: "device-abcdef01" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: {} });
    expect(mockTokens.removeDeviceToken).toHaveBeenCalledWith(
      "u1",
      "surfboard",
      "device-abcdef01"
    );
  });

  it("answers success when there was no token to forget", async () => {
    mockTokens.removeDeviceToken.mockResolvedValue(0);

    const res = await call(DELETE, "DELETE", { deviceId: "device-abcdef01" });

    expect(res.status).toBe(200);
  });

  it("works for an account held at the verification gate", async () => {
    mockSession.getServerSession.mockResolvedValue(
      session({ emailVerified: false, mustVerifyNow: true })
    );

    const res = await call(DELETE, "DELETE", { deviceId: "device-abcdef01" });

    expect(res.status).toBe(200);
    expect(mockTokens.removeDeviceToken).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no body", undefined],
    ["a device id that is too short", { deviceId: "short" }],
    ["no device id", {}],
  ])("answers 400 for %s", async (_name, body) => {
    const res = await call(DELETE, "DELETE", body);

    expect(res.status).toBe(400);
    expect(mockTokens.removeDeviceToken).not.toHaveBeenCalled();
  });

  it("answers 401 with no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await call(DELETE, "DELETE", { deviceId: "device-abcdef01" });

    expect(res.status).toBe(401);
    expect(mockTokens.removeDeviceToken).not.toHaveBeenCalled();
  });

  it("blocks a browser request that came from another site", async () => {
    const res = await call(
      DELETE,
      "DELETE",
      { deviceId: "device-abcdef01" },
      { origin: "https://evil.example" }
    );

    expect(res.status).toBe(403);
    expect(mockTokens.removeDeviceToken).not.toHaveBeenCalled();
  });
});
