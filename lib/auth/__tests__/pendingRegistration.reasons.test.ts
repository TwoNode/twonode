import crypto from "crypto";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The mobile app (POST /auth/mobile/register/*) tells the cases apart by `reason`, never by
// reading English; the website keeps reading `details`. Both must keep working.

const mockTx = vi.hoisted(() => ({
  pendingRegistration: { updateMany: vi.fn() },
  legalConsent: { create: vi.fn() },
}));
const mockPrisma = vi.hoisted(() => ({
  pendingRegistration: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
}));
const mockEmail = vi.hoisted(() => ({
  sendEmailVerificationOtp: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
const mockUserLookup = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  createNativeUser: vi.fn(),
}));
const mockSettings = vi.hoisted(() => ({
  getEmailVerificationSettings: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/email", () => mockEmail);
vi.mock("@/lib/auth/userLookup", () => mockUserLookup);
vi.mock("@/lib/auth/emailVerificationSettings", () => mockSettings);

const { Platform } = await import("@/utils/platform");
const {
  issuePendingRegistration,
  completePendingRegistration,
  PendingRegistrationRejectedError,
} = await import("@/lib/auth/pendingRegistration");
const { ValidationError } = await import("@/lib/api/errors");
const { LEGAL_VERSION } = await import("@/lib/legal/surfboard");

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v).digest("hex");

const CODE = "654321";
const PASSWORD = "Passw0rd!x";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);
const baseRow = () => ({
  id: "preg_1",
  platform: Platform.SURFBOARD,
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Doe",
  passwordHash,
  method: "OTP",
  codeHash: sha256(CODE),
  attempts: 0,
  expiresAt: new Date(Date.now() + 60000),
  usedAt: null as Date | null,
});

const reasonOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(PendingRegistrationRejectedError);
    // Still a ValidationError (400, same details) for the website's route.
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as InstanceType<typeof ValidationError>).status).toBe(400);
    return (err as InstanceType<typeof PendingRegistrationRejectedError>)
      .reason;
  }
  throw new Error("expected a rejection");
};

describe("completePendingRegistration: why it said no", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.pendingRegistration.updateMany.mockResolvedValue({ count: 1 });
    mockTx.pendingRegistration.updateMany.mockResolvedValue({ count: 1 });
  });

  it("MALFORMED: a code that is too short", async () => {
    expect(
      await reasonOf(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          "123",
          PASSWORD
        )
      )
    ).toBe("MALFORMED");
  });

  it("EXPIRED: no such registration, a lapsed one, one for another platform", async () => {
    mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(null);
    expect(
      await reasonOf(
        completePendingRegistration(Platform.SURFBOARD, "nope", CODE, PASSWORD)
      )
    ).toBe("EXPIRED");

    mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
      ...baseRow(),
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(
      await reasonOf(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      )
    ).toBe("EXPIRED");
  });

  it("EXPIRED: a registration that was already used (after the retry window)", async () => {
    mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
      ...baseRow(),
      usedAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    expect(
      await reasonOf(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      )
    ).toBe("EXPIRED");
  });

  it("INCORRECT: a wrong code", async () => {
    mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(baseRow());
    expect(
      await reasonOf(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          "111111",
          PASSWORD
        )
      )
    ).toBe("INCORRECT");
  });

  it("TOO_MANY_ATTEMPTS: the fifth wrong try has locked it", async () => {
    mockPrisma.pendingRegistration.findUnique
      .mockResolvedValueOnce({ ...baseRow(), attempts: 5 })
      .mockResolvedValueOnce({ ...baseRow(), attempts: 5 });
    mockPrisma.pendingRegistration.updateMany.mockResolvedValueOnce({
      count: 0,
    });
    expect(
      await reasonOf(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      )
    ).toBe("TOO_MANY_ATTEMPTS");
  });

  it("WRONG_PASSWORD: a right code with another password", async () => {
    mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(baseRow());
    expect(
      await reasonOf(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          "not-it"
        )
      )
    ).toBe("WRONG_PASSWORD");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("issuePendingRegistration: the kind of secret", () => {
  const person = {
    email: "new@example.com",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
    acceptedLegalVersion: LEGAL_VERSION,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserLookup.findUserByEmail.mockResolvedValue(null);
    mockPrisma.pendingRegistration.upsert.mockResolvedValue({
      id: "preg_1",
      email: "new@example.com",
      firstName: "John",
      lastName: "Doe",
    });
  });

  it("sends a six-digit code when asked to, even if the platform's setting is a link, without reading the setting", async () => {
    mockSettings.getEmailVerificationSettings.mockResolvedValue({
      method: "LINK",
    });

    const result = await issuePendingRegistration(Platform.SURFBOARD, person, {
      method: "OTP",
    });

    expect(result).toEqual({ pendingRegistrationId: "preg_1", method: "OTP" });
    expect(mockSettings.getEmailVerificationSettings).not.toHaveBeenCalled();
    expect(mockEmail.sendEmailVerificationOtp).toHaveBeenCalledTimes(1);
    expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    const sent = mockEmail.sendEmailVerificationOtp.mock.calls[0][0];
    expect(sent.code).toMatch(/^\d{6}$/);
  });

  it("still follows the platform's setting when it is not told otherwise (the website)", async () => {
    mockSettings.getEmailVerificationSettings.mockResolvedValue({
      method: "LINK",
    });

    const result = await issuePendingRegistration(Platform.SURFBOARD, person);

    expect(result.method).toBe("LINK");
    expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockEmail.sendEmailVerificationOtp).not.toHaveBeenCalled();
  });
});
