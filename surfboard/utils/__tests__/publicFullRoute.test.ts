import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: { sub: "user-1", role: "USER" },
  service: vi.fn(),
  withAuthOpts: undefined as unknown,
}));

vi.mock("@/lib/api/withAuth", () => ({
  withAuth: (
    handler: (req: NextRequest, ctx: unknown, rc: unknown) => Promise<Response>,
    opts: unknown
  ) => {
    mocks.withAuthOpts = opts;
    return (req: NextRequest, rc: unknown) =>
      handler(req, { session: mocks.session }, rc);
  },
}));
vi.mock("@/surfboard/services/planService", () => ({
  getFullSurfPlanForViewer: mocks.service,
}));

const { GET } =
  await import("@/app/api/v1/surfboard/plans/[planId]/public/full/route");
const { SurfboardRole } = await import("@/utils/platform");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.service.mockResolvedValue({ id: "p1" });
});

describe("GET /plans/[planId]/public/full", () => {
  it("is behind login for every Surfboard role", () => {
    const opts = mocks.withAuthOpts as { roles: string[] };
    expect(opts.roles).toEqual(
      expect.arrayContaining(Object.values(SurfboardRole))
    );
  });

  it("reads the plan as the logged-in user and role", async () => {
    const res = await (
      GET as unknown as (
        req: NextRequest,
        rc: { params: Promise<{ planId: string }> }
      ) => Promise<Response>
    )(
      new NextRequest("http://localhost/api/v1/surfboard/plans/p1/public/full"),
      { params: Promise.resolve({ planId: "p1" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.service).toHaveBeenCalledWith("user-1", "USER", "p1");
  });
});
