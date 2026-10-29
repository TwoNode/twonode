import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The admin routes that end a person's app sign-ins (TASK-0015 1J.3): who may
 * call them, the cross-origin check for the two that change something, and
 * that the service's answers come out unchanged.
 */

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  listUserDevices: vi.fn(),
  revokeUserDevice: vi.fn(),
  revokeAllUserDevices: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getServerSession: mocks.session }));
vi.mock("@/surfboard/services/adminUserService", () => ({
  listUserDevices: mocks.listUserDevices,
  revokeUserDevice: mocks.revokeUserDevice,
  revokeAllUserDevices: mocks.revokeAllUserDevices,
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { GET: list, DELETE: revokeAll } =
  await import("@/app/api/v1/surfboard/admin/users/[id]/devices/route");
const { DELETE: revokeOne } =
  await import("@/app/api/v1/surfboard/admin/users/[id]/devices/[familyId]/route");
const { NotFoundError, ForbiddenError } = await import("@/lib/api/errors");

const BASE =
  "http://localhost:3000/api/v1/surfboard/admin/users/target-1/devices";
const ctx = { params: Promise.resolve({ id: "target-1", familyId: "fam1" }) };

/** A browser call from the admin page: cookies, with an Origin that matches the host. */
const browser = (method: string, path = "", origin = "http://localhost:3000") =>
  new NextRequest(`${BASE}${path}`, {
    method,
    headers: { host: "localhost:3000", origin },
  });

const session = (role: string) => ({
  sub: "admin-1",
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue(session("ADMIN"));
  mocks.listUserDevices.mockResolvedValue([]);
  mocks.revokeUserDevice.mockResolvedValue({ ended: 1 });
  mocks.revokeAllUserDevices.mockResolvedValue({ ended: 2 });
});

const routes = [
  ["GET devices", () => list(browser("GET"), ctx)],
  ["DELETE devices", () => revokeAll(browser("DELETE"), ctx)],
  [
    "DELETE devices/{familyId}",
    () => revokeOne(browser("DELETE", "/fam1"), ctx),
  ],
] as const;

describe.each(routes)("%s", (_name, call) => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it.each(["USER", "CHARTING", "ACCOUNTS"])(
    "is refused to a %s",
    async (role) => {
      mocks.session.mockResolvedValue(session(role));
      expect((await call()).status).toBe(403);
      expect(mocks.listUserDevices).not.toHaveBeenCalled();
      expect(mocks.revokeUserDevice).not.toHaveBeenCalled();
      expect(mocks.revokeAllUserDevices).not.toHaveBeenCalled();
    }
  );

  it.each(["ADMIN", "SUPERADMIN"])("is open to a %s", async (role) => {
    mocks.session.mockResolvedValue(session(role));
    expect((await call()).status).toBe(200);
  });

  it("hands the service the signed-in admin and the person, never taken from the request", async () => {
    mocks.session.mockResolvedValue(session("SUPERADMIN"));
    await call();
    const service = [
      mocks.listUserDevices,
      mocks.revokeAllUserDevices,
      mocks.revokeUserDevice,
    ].find((fn) => fn.mock.calls.length > 0)!;
    expect(service.mock.calls[0].slice(0, 2)).toEqual([
      { id: "admin-1", role: "SUPERADMIN" },
      "target-1",
    ]);
  });

  it("passes on the service's refusal (an ADMIN acting on an admin) as a 403", async () => {
    for (const fn of [
      mocks.listUserDevices,
      mocks.revokeUserDevice,
      mocks.revokeAllUserDevices,
    ]) {
      fn.mockRejectedValue(new ForbiddenError());
    }
    expect((await call()).status).toBe(403);
  });
});

describe("the two that change something", () => {
  it("refuse a call from another site (cookie session, wrong origin)", async () => {
    const other = "https://evil.example";
    expect((await revokeAll(browser("DELETE", "", other), ctx)).status).toBe(
      403
    );
    expect(
      (await revokeOne(browser("DELETE", "/fam1", other), ctx)).status
    ).toBe(403);
    expect(mocks.revokeUserDevice).not.toHaveBeenCalled();
    expect(mocks.revokeAllUserDevices).not.toHaveBeenCalled();
  });
});

describe("answers", () => {
  it("the list is the service's list, in the shared envelope", async () => {
    mocks.listUserDevices.mockResolvedValue([
      { id: "fam1", deviceLabel: "Pixel 8" },
    ]);
    const res = await list(browser("GET"), ctx);
    expect(await res.json()).toEqual({
      success: true,
      data: [{ id: "fam1", deviceLabel: "Pixel 8" }],
    });
  });

  it("revoking one that is not that person's is a 404", async () => {
    mocks.revokeUserDevice.mockRejectedValue(
      new NotFoundError("Device session")
    );
    const res = await revokeOne(browser("DELETE", "/fam9"), {
      params: Promise.resolve({ id: "target-1", familyId: "fam9" }),
    });
    expect(res.status).toBe(404);
  });

  it("revoking all says how many were ended", async () => {
    const res = await revokeAll(browser("DELETE"), ctx);
    expect(await res.json()).toEqual({ success: true, data: { ended: 2 } });
  });
});
