import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** I-018: the Red Copy webhook fails closed when its secret is not configured. */

const mockPrisma = vi.hoisted(() => ({
  surfboardPlan: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const findPlanIdByNumber = vi.hoisted(() => vi.fn());
vi.mock("@/surfboard/services/planService", () => ({ findPlanIdByNumber }));

const { POST } = await import("@/app/api/webhooks/redcopy/route");

const call = (auth?: string) =>
  POST(
    new Request("http://localhost/api/webhooks/redcopy", {
      method: "POST",
      headers: auth ? { authorization: auth } : {},
      body: JSON.stringify({ planNumber: "ABC/1", status: "COMPLETED" }),
    })
  );

describe("redcopy webhook auth", () => {
  const original = process.env.REDCOPY_WEBHOOK_SECRET;
  beforeEach(() => {
    findPlanIdByNumber.mockReset().mockResolvedValue(null);
  });
  afterEach(() => {
    if (original === undefined) delete process.env.REDCOPY_WEBHOOK_SECRET;
    else process.env.REDCOPY_WEBHOOK_SECRET = original;
  });

  it("refuses everyone when no secret is configured", async () => {
    delete process.env.REDCOPY_WEBHOOK_SECRET;
    expect((await call()).status).toBe(401);
    expect((await call("Bearer undefined")).status).toBe(401);
    expect(findPlanIdByNumber).not.toHaveBeenCalled();
  });

  it("refuses a wrong token and accepts the right one", async () => {
    process.env.REDCOPY_WEBHOOK_SECRET = "s3cret";
    expect((await call("Bearer nope")).status).toBe(401);
    // right token passes auth (plan lookup returns nothing, so 404)
    expect((await call("Bearer s3cret")).status).toBe(404);
  });
});
