import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyQRCodeHash } from "@/gbc/services/qrCheckinService";

const SECRET =
  process.env.QR_CODE_SECRET || "@default@-_33##_s3cr3t-ch@nge-th!s";

function validQR(overrides: Partial<Record<string, any>> = {}) {
  const ticketNumber = overrides.ticketNumber ?? "GBC2_ABCDEF";
  const hash = createHmac("sha256", SECRET).update(ticketNumber).digest("hex");
  return JSON.stringify({
    ticketNumber,
    name: "Jane Doe",
    email: "jane@test.com",
    ticketType: "EARLY_BIRD",
    timestamp: Date.now(),
    hash,
    ...overrides,
  });
}

describe("verifyQRCodeHash", () => {
  it("throws ValidationError on unparseable input", () => {
    expect(() => verifyQRCodeHash("not json")).toThrow();
  });

  it("returns valid:false for missing required fields", () => {
    const result = verifyQRCodeHash(JSON.stringify({}));
    expect(result).toEqual({ valid: false, error: "Invalid QR code data" });
  });

  it("returns valid:false when the hash doesn't match (forged/tampered)", () => {
    const result = verifyQRCodeHash(validQR({ hash: "wrong-hash" }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/forgery/);
  });

  it("returns valid:true with the decoded data for a real hash", () => {
    const result = verifyQRCodeHash(validQR());
    expect(result.valid).toBe(true);
    expect(result.data?.ticketNumber).toBe("GBC2_ABCDEF");
  });

  it("returns valid:false when older than maxAgeHours", () => {
    const staleTimestamp = Date.now() - 3 * 60 * 60 * 1000;
    const result = verifyQRCodeHash(validQR({ timestamp: staleTimestamp }), 1);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/);
  });

  it("stays valid within maxAgeHours", () => {
    const recentTimestamp = Date.now() - 5 * 60 * 1000;
    const result = verifyQRCodeHash(validQR({ timestamp: recentTimestamp }), 1);
    expect(result.valid).toBe(true);
  });
});
