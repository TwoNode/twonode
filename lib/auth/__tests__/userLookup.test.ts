import { beforeEach, describe, expect, it, vi } from "vitest";

const mk = () => ({ findUnique: vi.fn(), findFirst: vi.fn() });
const mockPrisma = vi.hoisted(
  () => ({}) as Record<string, ReturnType<typeof mk>>
);

vi.mock("@/lib/prisma", () => {
  mockPrisma.surfboardUser = mk();
  mockPrisma.revaUser = mk();
  mockPrisma.gBCUser = mk();
  return { default: mockPrisma };
});

const { findUserByEmail } = await import("@/lib/auth/userLookup");
const { Platform } = await import("@/utils/platform");

const surfRow = (email: string) => ({
  id: "u1",
  email,
  firstName: "J",
  lastName: "D",
  passwordHash: "h",
  role: "USER",
  isActive: true,
  emailVerified: true,
  emailVerifiedVia: "OTP",
  phoneNumber: null,
  createdAt: new Date(),
});

describe("findUserByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of Object.values(mockPrisma)) {
      m.findUnique.mockResolvedValue(null);
      m.findFirst.mockResolvedValue(null);
    }
  });

  it("matches an exact-case email on the unique index without the slower fallback", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValueOnce(
      surfRow("john@x.com")
    );
    const user = await findUserByEmail(Platform.SURFBOARD, "john@x.com");
    expect(user?.id).toBe("u1");
    expect(mockPrisma.surfboardUser.findFirst).not.toHaveBeenCalled();
  });

  it("finds 'John@X.com' when the account was registered as 'john@x.com'", async () => {
    mockPrisma.surfboardUser.findFirst.mockResolvedValueOnce(
      surfRow("john@x.com")
    );
    const user = await findUserByEmail(Platform.SURFBOARD, "John@X.com");
    expect(user?.email).toBe("john@x.com");
    expect(mockPrisma.surfboardUser.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "John@X.com", mode: "insensitive" } },
    });
  });

  it("trims surrounding whitespace before looking up", async () => {
    await findUserByEmail(Platform.SURFBOARD, "  john@x.com  ");
    expect(mockPrisma.surfboardUser.findUnique).toHaveBeenCalledWith({
      where: { email: "john@x.com" },
    });
  });

  it("returns null when neither lookup matches", async () => {
    expect(
      await findUserByEmail(Platform.SURFBOARD, "nobody@x.com")
    ).toBeNull();
  });

  it.each([
    [Platform.REVA, "revaUser"],
    [Platform.GBC, "gBCUser"],
  ])("falls back case-insensitively on %s too", async (platform, model) => {
    await findUserByEmail(platform, "A@B.com");
    expect(mockPrisma[model].findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "A@B.com", mode: "insensitive" } },
    });
  });
});
