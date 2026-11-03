import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  charting: vi.fn(),
  reasons: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => false,
  assertMobileClientAllowed: vi.fn(),
}));
vi.mock("@/surfboard/services/mdaRemarkService", async (original) => ({
  ...(await original<typeof import("@/surfboard/services/mdaRemarkService")>()),
  getUniqueChartingRemarks: mocks.charting,
  getUniqueQueryReasons: mocks.reasons,
}));

const { GET: charting } =
  await import("@/app/api/v1/surfboard/mda/remarks/charting/route");
const { GET: reasons } =
  await import("@/app/api/v1/surfboard/mda/remarks/query-reasons/route");
const { SurfboardRole } = await import("@/utils/platform");

/**
 * The suggestion lists for the reviewers' comment boxes hold comments written on any plan (I-056).
 * A surveyor must not read them; a reviewer reads the list for their own stage; staff may open
 * every review page.
 */
const as = (role: string) => ({
  sub: "u1",
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});
const get = (path: string) =>
  new NextRequest(`http://localhost/api/v1/surfboard/mda/remarks/${path}`, {
    headers: { authorization: "Bearer test-token" },
  });

const STAGES = [
  ["accounts", SurfboardRole.ACCOUNTS],
  ["charting", SurfboardRole.CHARTING],
  ["surcon", SurfboardRole.SURCON],
  ["records-i", SurfboardRole.RECORDS_I],
  ["records-ii", SurfboardRole.RECORDS_II],
  ["intake", SurfboardRole.INTAKE],
] as const;
const ANY_STAGE = [
  SurfboardRole.ADMIN,
  SurfboardRole.SUPERADMIN,
  SurfboardRole.MDA_SUPERADMIN,
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as(SurfboardRole.CHARTING));
  mocks.charting.mockResolvedValue(["Boundary does not close"]);
  mocks.reasons.mockResolvedValue(["Pay the balance"]);
});

describe("GET mda/remarks/charting", () => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await charting(get("charting"))).status).toBe(401);
    expect(mocks.charting).not.toHaveBeenCalled();
  });

  it.each([
    SurfboardRole.USER,
    SurfboardRole.ACCOUNTS,
    SurfboardRole.SURCON,
    SurfboardRole.RECORDS_I,
    SurfboardRole.RECORDS_II,
    SurfboardRole.INTAKE,
    SurfboardRole.ARCHIVE,
  ])("is not for a %s account", async (role) => {
    mocks.session.mockResolvedValue(as(role));
    expect((await charting(get("charting"))).status).toBe(403);
    expect(mocks.charting).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.CHARTING, ...ANY_STAGE])(
    "answers a %s",
    async (role) => {
      mocks.session.mockResolvedValue(as(role));
      const res = await charting(get("charting"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        success: true,
        data: ["Boundary does not close"],
      });
    }
  );
});

describe("GET mda/remarks/query-reasons", () => {
  it("needs a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await reasons(get("query-reasons?role=charting"))).status).toBe(
      401
    );
    expect(mocks.reasons).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.USER, SurfboardRole.ARCHIVE])(
    "is not for a %s account, for any stage",
    async (role) => {
      mocks.session.mockResolvedValue(as(role));
      for (const [stage] of STAGES) {
        expect((await reasons(get(`query-reasons?role=${stage}`))).status).toBe(
          403
        );
      }
      expect(mocks.reasons).not.toHaveBeenCalled();
    }
  );

  it.each(STAGES)(
    "gives the %s list to that stage's own reviewer",
    async (stage, role) => {
      mocks.session.mockResolvedValue(as(role));
      const res = await reasons(get(`query-reasons?role=${stage}`));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        success: true,
        data: ["Pay the balance"],
      });
      expect(mocks.reasons).toHaveBeenCalledWith(stage);
    }
  );

  it("refuses a reviewer another stage's list", async () => {
    for (const [stage, role] of STAGES) {
      for (const [other] of STAGES) {
        if (other === stage) continue;
        mocks.session.mockResolvedValue(as(role));
        const res = await reasons(get(`query-reasons?role=${other}`));
        expect(res.status, `${role} asking for ${other}`).toBe(403);
      }
    }
    expect(mocks.reasons).not.toHaveBeenCalled();
  });

  it.each(ANY_STAGE)("gives a %s any stage's list", async (role) => {
    mocks.session.mockResolvedValue(as(role));
    for (const [stage] of STAGES) {
      expect((await reasons(get(`query-reasons?role=${stage}`))).status).toBe(
        200
      );
    }
  });

  it("is a 400 for a missing or unknown stage, from a caller who may ask", async () => {
    mocks.session.mockResolvedValue(as(SurfboardRole.SUPERADMIN));
    expect((await reasons(get("query-reasons"))).status).toBe(400);
    expect((await reasons(get("query-reasons?role=nope"))).status).toBe(400);
    expect((await reasons(get("query-reasons?role=__proto__"))).status).toBe(
      400
    );
    expect(mocks.reasons).not.toHaveBeenCalled();
  });
});
