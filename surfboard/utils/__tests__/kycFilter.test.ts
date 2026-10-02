import { describe, expect, it } from "vitest";
import {
  countByKycFilter,
  matchesKycFilter,
  type KycFilterRow,
} from "../kycFilter";

const pendingNoBank: KycFilterRow = {
  isKycValidated: false,
  bankDetails: null,
};
const pendingUnverifiedBank: KycFilterRow = {
  isKycValidated: false,
  bankDetails: { isVerified: false },
};
const validatedVerifiedBank: KycFilterRow = {
  isKycValidated: true,
  bankDetails: { isVerified: true },
};
const validatedUnverifiedBank: KycFilterRow = {
  isKycValidated: true,
  bankDetails: { isVerified: false },
};

describe("matchesKycFilter", () => {
  it("'all' matches every row", () => {
    expect(
      [pendingNoBank, validatedVerifiedBank].every((r) =>
        matchesKycFilter(r, "all")
      )
    ).toBe(true);
  });

  it("splits surveyors by account KYC status", () => {
    expect(matchesKycFilter(pendingNoBank, "kyc-pending")).toBe(true);
    expect(matchesKycFilter(pendingNoBank, "kyc-validated")).toBe(false);
    expect(matchesKycFilter(validatedVerifiedBank, "kyc-validated")).toBe(true);
    expect(matchesKycFilter(validatedVerifiedBank, "kyc-pending")).toBe(false);
  });

  it("treats a bank account as awaiting approval only when it exists and is unverified", () => {
    expect(matchesKycFilter(pendingUnverifiedBank, "bank-awaiting")).toBe(true);
    expect(matchesKycFilter(pendingNoBank, "bank-awaiting")).toBe(false);
    expect(matchesKycFilter(validatedVerifiedBank, "bank-awaiting")).toBe(
      false
    );
  });

  it("finds verified accounts and surveyors with no bank account separately", () => {
    expect(matchesKycFilter(validatedVerifiedBank, "bank-verified")).toBe(true);
    expect(matchesKycFilter(pendingNoBank, "bank-verified")).toBe(false);
    expect(matchesKycFilter(pendingNoBank, "bank-missing")).toBe(true);
    expect(matchesKycFilter(validatedUnverifiedBank, "bank-missing")).toBe(
      false
    );
  });
});

describe("countByKycFilter", () => {
  it("counts every filter in one pass, including empty ones", () => {
    const counts = countByKycFilter([
      pendingNoBank,
      pendingUnverifiedBank,
      validatedVerifiedBank,
      validatedUnverifiedBank,
    ]);
    expect(counts).toEqual({
      all: 4,
      "kyc-pending": 2,
      "kyc-validated": 2,
      "bank-awaiting": 2,
      "bank-verified": 1,
      "bank-missing": 1,
    });
    expect(countByKycFilter([])["bank-verified"]).toBe(0);
  });
});
