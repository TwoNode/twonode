import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * profileActions.ts's source functions were TODO stubs that always
 * returned `{ success: true }` without touching the database — this is a
 * real implementation, not a port, so the tests are weighted toward the
 * two behaviors a stub can't get wrong but a real implementation can:
 * the email-uniqueness conflict, and not spuriously resetting
 * emailVerified when the email in the request matches the current one.
 */

const mockPrisma = vi.hoisted(() => ({
  revaUser: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { getProfile, updateProfile } =
  await import("@/reva/services/profileService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProfile", () => {
  it("throws NotFoundError when the user doesn't exist", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(null);
    await expect(getProfile("missing")).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateProfile", () => {
  it("throws ValidationError on a blank first name", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
    });
    await expect(
      updateProfile("u1", { firstName: "   " })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws ConflictError when the new email belongs to a different user", async () => {
    mockPrisma.revaUser.findUnique
      .mockResolvedValueOnce({ id: "u1", email: "old@test.com" }) // current user lookup
      .mockResolvedValueOnce({ id: "u2", email: "taken@test.com" }); // uniqueness check
    await expect(
      updateProfile("u1", { email: "taken@test.com" })
    ).rejects.toMatchObject({ status: 409 });
    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
  });

  it("resending the current email is a no-op for emailVerified (not a spurious reset)", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "a@test.com",
    });
    mockPrisma.revaUser.update.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
    });

    await updateProfile("u1", { firstName: "Jane", email: "a@test.com" });

    const call = mockPrisma.revaUser.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("email");
    expect(call.data).not.toHaveProperty("emailVerified");
    expect(call.data.firstName).toBe("Jane");
  });

  it("a real email change resets emailVerified", async () => {
    mockPrisma.revaUser.findUnique
      .mockResolvedValueOnce({ id: "u1", email: "old@test.com" })
      .mockResolvedValueOnce(null); // no conflict
    mockPrisma.revaUser.update.mockResolvedValue({
      id: "u1",
      email: "new@test.com",
    });

    await updateProfile("u1", { email: "new@test.com" });

    const call = mockPrisma.revaUser.update.mock.calls[0][0];
    expect(call.data.email).toBe("new@test.com");
    expect(call.data.emailVerified).toBe(false);
  });

  it("no fields provided returns the current profile without calling update", async () => {
    mockPrisma.revaUser.findUnique
      .mockResolvedValueOnce({ id: "u1", email: "a@test.com" })
      .mockResolvedValueOnce({ id: "u1", email: "a@test.com" }); // getProfile's own lookup
    await updateProfile("u1", {});
    expect(mockPrisma.revaUser.update).not.toHaveBeenCalled();
  });
});
