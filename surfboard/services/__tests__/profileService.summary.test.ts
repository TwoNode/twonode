import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  surfboardUser: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/awsService", () => ({ uploadFile: vi.fn() }));

const { getProfileSummary } =
  await import("@/surfboard/services/profileService");
const { NotFoundError } = await import("@/lib/api/errors");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getProfileSummary", () => {
  it("selects name, firm, registration and state only: no logo or signature link, payer id, phone or address", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({
      firstName: "Ada",
      lastName: "Okafor",
      prefix: "Surv.",
      suffix: null,
      companyName: "Okafor Geomatics",
      surconRegNumber: "S/1234",
      surconRegName: "Okafor Ada",
      residenceState: "Lagos",
      isKycValidated: true,
    });
    const summary = await getProfileSummary("u1");

    const query = mockPrisma.surfboardUser.findUnique.mock.calls[0][0];
    expect(query.where).toEqual({ id: "u1" });
    expect(Object.keys(query.select).sort()).toEqual([
      "companyName",
      "firstName",
      "isKycValidated",
      "lastName",
      "prefix",
      "residenceState",
      "suffix",
      "surconRegName",
      "surconRegNumber",
    ]);
    expect(summary.companyName).toBe("Okafor Geomatics");
    expect(summary.isKycValidated).toBe(true);
  });

  it("is a 404 when the account is gone", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue(null);
    await expect(getProfileSummary("u1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
