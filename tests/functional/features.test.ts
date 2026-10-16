import { describe, it, expect } from "vitest";
import { normalizePlanNumber, planNumberSearchClauses, samePlanNumber } from "@/surfboard/utils/planNumber";
import { computePeriodPerTimestamp, addCalendarMonths } from "@/app/(projects)/(surfboard)/utils/computePeriod";
import { matchesKycFilter, countByKycFilter, KycFilterRow } from "@/surfboard/utils/kycFilter";
import { subscriptionExpiry } from "@/surfboard/utils/subscriptionExpiry";
import { pickRevaPanelUser } from "@/reva/access/panelUser";
import { safeUploadFileName, revaUploadKey } from "@/reva/utils/uploadKey";
import { Platform } from "@/utils/platform";

describe("Functional Feature Testing Suite: REVA & Surfboard", () => {
  describe("Feature 1: Surfboard Cadastral Plan Management & Search", () => {
    it("generates correct dual Prisma search clauses for typed and canonical plan numbers", () => {
      const clauses = planNumberSearchClauses("og/123/la_");
      expect(clauses).toHaveLength(2);
      expect(clauses[0]).toEqual({
        planNumber: { contains: "og/123/la_", mode: "insensitive" },
      });
      expect(clauses[1]).toEqual({
        planNumberKey: { contains: "OG/123/LA" },
      });
    });

    it("verifies cadastral plan number equality across hand-typed variations", () => {
      expect(samePlanNumber("  AB/100/2026. ", "ab/100/2026_")).toBe(true);
      expect(samePlanNumber("AB/100/2026", "AB/100/2027")).toBe(false);
      expect(samePlanNumber(null, "AB/100/2026")).toBe(false);
    });
  });

  describe("Feature 2: Surfboard Subscription Billing Periods & Intervals", () => {
    it("calculates accurate billing periods for monthly, quarterly, and annual intervals", () => {
      const refDate = new Date("2026-01-15T09:00:00Z");

      // Monthly: exactly 1 month
      const monthly = computePeriodPerTimestamp("monthly", refDate);
      expect(monthly.currentStart).toBeDefined();
      expect(monthly.nextCharge.getMonth()).toBe(1); // February

      // Quarterly: exactly 3 months
      const quarterly = computePeriodPerTimestamp("quarterly", refDate);
      expect(quarterly.nextCharge.getMonth()).toBe(3); // April

      // Annually: exactly 12 months
      const annually = computePeriodPerTimestamp("annually", refDate);
      expect(annually.nextCharge.getFullYear()).toBe(2027);
      expect(annually.nextCharge.getMonth()).toBe(0); // January
    });

    it("computes exact relative expiry countdowns for surveyor subscriptions", () => {
      const baseNow = new Date("2026-05-10T12:00:00Z");

      // Active with 20 days left
      const future20Days = new Date("2026-05-30T12:00:00Z");
      const activeState = subscriptionExpiry(future20Days, baseNow);
      expect(activeState.tone).toBe("ok");
      expect(activeState.relative).toBe("in 20 days");

      // Expiring in 3 days (within 7-day window)
      const soon3Days = new Date("2026-05-13T12:00:00Z");
      const soonState = subscriptionExpiry(soon3Days, baseNow);
      expect(soonState.tone).toBe("soon");
      expect(soonState.relative).toBe("in 3 days");

      // Expired 5 days ago
      const past5Days = new Date("2026-05-05T12:00:00Z");
      const expiredState = subscriptionExpiry(past5Days, baseNow);
      expect(expiredState.tone).toBe("expired");
      expect(expiredState.relative).toBe("5 days ago");
    });
  });

  describe("Feature 3: Surfboard Surveyor KYC & Bank Approval Filtering", () => {
    const surveyors: KycFilterRow[] = [
      { isKycValidated: true, bankDetails: { isVerified: true } },     // Fully approved
      { isKycValidated: false, bankDetails: null },                     // KYC pending, bank missing
      { isKycValidated: true, bankDetails: { isVerified: false } },    // KYC approved, bank awaiting
      { isKycValidated: false, bankDetails: { isVerified: false } },   // Both pending
    ];

    it("correctly filters surveyors by KYC and banking verification status", () => {
      expect(matchesKycFilter(surveyors[0], "all")).toBe(true);
      expect(matchesKycFilter(surveyors[0], "kyc-validated")).toBe(true);
      expect(matchesKycFilter(surveyors[0], "bank-verified")).toBe(true);
      expect(matchesKycFilter(surveyors[0], "kyc-pending")).toBe(false);

      expect(matchesKycFilter(surveyors[1], "kyc-pending")).toBe(true);
      expect(matchesKycFilter(surveyors[1], "bank-missing")).toBe(true);

      expect(matchesKycFilter(surveyors[2], "kyc-validated")).toBe(true);
      expect(matchesKycFilter(surveyors[2], "bank-awaiting")).toBe(true);
    });

    it("accurately aggregates tab counts across surveyor review lists", () => {
      const counts = countByKycFilter(surveyors);
      expect(counts["all"]).toBe(4);
      expect(counts["kyc-validated"]).toBe(2);
      expect(counts["kyc-pending"]).toBe(2);
      expect(counts["bank-verified"]).toBe(1);
      expect(counts["bank-missing"]).toBe(1);
    });
  });

  describe("Feature 4: REVA Due Diligence File Deliverables & Key Resolution", () => {
    it("generates private S3 paths for customer uploads and final due diligence dossiers", () => {
      const dossierKey = revaUploadKey({
        reference: "REV-2026-IBD-042",
        fileName: "Comprehensive_Due_Diligence_Report.pdf",
        direct: true,
        uniqueSuffix: "",
      });

      expect(dossierKey).toBe("private/reva/REV-2026-IBD-042/Comprehensive_Due_Diligence_Report.pdf");
      expect(dossierKey.startsWith("private/reva/")).toBe(true);
    });

    it("generates prefixed unique keys for supporting survey documents to avoid collisions", () => {
      const uploadKey = revaUploadKey({
        reference: "REV-2026-IBD-042",
        fileName: "client_deed_of_assignment.pdf",
        direct: false,
        uniqueSuffix: "timestamp-9988",
      });

      expect(uploadKey).toBe("private/reva/REV-2026-IBD-042/timestamp-9988-client_deed_of_assignment.pdf");
    });
  });

  describe("Feature 5: Multi-Platform Authorization & Role Routing", () => {
    it("extracts REVA permissions correctly for multi-tenant accounts", () => {
      const userSession = {
        email: "operations@twonode.com",
        firstName: "Kayode",
        lastName: "Balogun",
        platforms: {
          [Platform.REVA]: { role: "ADMIN" },
          [Platform.SURFBOARD]: { role: "SURVEYOR" },
        },
      };

      const revaUser = pickRevaPanelUser(userSession);
      expect(revaUser).not.toBeNull();
      expect(revaUser?.platform).toBe(Platform.REVA);
      expect(revaUser?.role).toBe("ADMIN");
      expect(revaUser?.firstName).toBe("Kayode");
    });

    it("rejects non-REVA users from accessing REVA admin portals", () => {
      const nonRevaUser = {
        platform: Platform.SURFBOARD,
        role: "SURVEYOR",
        email: "surveyor@survey.ng",
      };

      expect(pickRevaPanelUser(nonRevaUser)).toBeNull();
    });
  });
});
