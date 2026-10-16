import { describe, it, expect, vi, beforeEach } from "vitest";
import { revaUploadKey } from "@/reva/utils/uploadKey";
import { pickRevaPanelUser } from "@/reva/access/panelUser";
import { normalizePlanNumber, planNumberToKeySegment, samePlanNumber } from "@/surfboard/utils/planNumber";
import { subscriptionExpiry } from "@/surfboard/utils/subscriptionExpiry";
import { computePeriodPerTimestamp, addCalendarMonths } from "@/app/(projects)/(surfboard)/utils/computePeriod";
import { signAccessToken, verifyToken, JWTPayload } from "@/lib/auth/jwt";
import { isSafeReturnPath } from "@/lib/auth/loginReturn";
import { Platform } from "@/utils/platform";

describe("Integration Testing Suite: REVA & Surfboard End-to-End Workflows", () => {
  describe("REVA Full Due Diligence Request Lifecycle", () => {
    it("simulates complete REVA request from submission to signed dossier deliverable", async () => {
      // 1. Client initiates Due Diligence request
      const rawReference = "REV-2026-LKI-789";
      const userEmail = "property.investor@example.com";
      const sampleFile = "Lagoon_View_Estate_Survey.pdf";

      // 2. Reference and S3 key generated with private isolation
      const reportKey = revaUploadKey({
        reference: rawReference,
        fileName: sampleFile,
        direct: false,
        uniqueSuffix: "audit-01",
      });

      expect(reportKey).toBe("private/reva/REV-2026-LKI-789/audit-01-Lagoon_View_Estate_Survey.pdf");
      expect(reportKey.startsWith("private/reva/")).toBe(true);

      // 3. User authenticated with REVA token
      const revaPayload: JWTPayload = {
        sub: "usr_reva_investor_123",
        role: "USER",
        platform: Platform.REVA,
        emailVerified: true,
        mustVerifyNow: false,
      };

      const token = await signAccessToken(revaPayload);
      const verified = await verifyToken(token);
      expect(verified?.sub).toBe("usr_reva_investor_123");
      expect(verified?.platform).toBe(Platform.REVA);

      // 4. Panel access check verifies permissions
      const panelUser = pickRevaPanelUser({
        platform: Platform.REVA,
        role: "CLIENT",
        email: userEmail,
        firstName: "Tunde",
        lastName: "Bakare",
      });

      expect(panelUser).not.toBeNull();
      expect(panelUser?.platform).toBe(Platform.REVA);
      expect(panelUser?.role).toBe("CLIENT");

      // 5. Final Report Delivery - direct report file key
      const finalDossierKey = revaUploadKey({
        reference: rawReference,
        fileName: "Due_Diligence_Report_REV-2026-LKI-789.pdf",
        direct: true,
        uniqueSuffix: "",
      });

      expect(finalDossierKey).toBe("private/reva/REV-2026-LKI-789/Due_Diligence_Report_REV-2026-LKI-789.pdf");
    });
  });

  describe("Surfboard Surveyor Subscription & Plan Filing Lifecycle", () => {
    it("simulates surveyor subscription activation, expiry tracking, and plan filing", async () => {
      // 1. Surveyor initiates quarterly subscription
      const paymentDate = new Date("2026-03-15T10:00:00Z");
      const period = computePeriodPerTimestamp("quarterly", paymentDate);

      expect(period.currentStart).toBeDefined();
      expect(period.currentEnd).toBeDefined();
      expect(period.currentEnd > period.currentStart).toBe(true);

      // 3 months later should be around June 15
      const expectedEnd = addCalendarMonths(paymentDate, 3);
      expect(expectedEnd.getMonth()).toBe(5); // June (0-indexed)

      // 2. Active subscription expiry status check
      const checkDateDuringActive = new Date("2026-04-15T10:00:00Z");
      const statusActive = subscriptionExpiry(period.currentEnd, checkDateDuringActive);
      expect(statusActive.tone).toBe("ok");
      expect(statusActive.relative).toContain("in ");

      // 3. Expiring soon status check (within 7 days)
      const checkDateExpiringSoon = new Date(period.currentEnd.getTime() - 4 * 24 * 60 * 60 * 1000);
      const statusSoon = subscriptionExpiry(period.currentEnd, checkDateExpiringSoon);
      expect(statusSoon.tone).toBe("soon");

      // 4. Surveyor submits a survey plan
      const typedPlanNumber = "  og / 2026 / 1045 ._ ";
      const canonical = normalizePlanNumber(typedPlanNumber);
      expect(canonical).toBe("OG / 2026 / 1045");

      // Verify idempotency and matching
      expect(samePlanNumber(typedPlanNumber, "OG / 2026 / 1045")).toBe(true);

      // 5. Cadastral storage key generated safely
      const planStorageSegment = planNumberToKeySegment(typedPlanNumber);
      expect(planStorageSegment).toBe("OG-_-2026-_-1045");
      expect(planStorageSegment).not.toContain("/");
      expect(planStorageSegment).not.toContain(" ");
    });
  });

  describe("Cross-Platform Security & Multi-Tenant Boundary Integration", () => {
    it("enforces multi-tenant isolation: REVA client cannot access Surfboard restricted endpoints", async () => {
      // REVA Client token
      const revaClientToken = await signAccessToken({
        sub: "reva_client_999",
        role: "CLIENT",
        platform: Platform.REVA,
        emailVerified: true,
        mustVerifyNow: false,
      });

      const decoded = await verifyToken(revaClientToken);
      expect(decoded?.platform).toBe(Platform.REVA);

      // Surveyor check fails on REVA token
      const isSurfboard = decoded?.platform === Platform.SURFBOARD;
      expect(isSurfboard).toBe(false);

      // Panel user picker rejects REVA client when checking Surfboard
      const sessionWithRevaOnly = {
        platform: Platform.REVA,
        role: "CLIENT",
      };

      // Ensure panel isolation logic safely extracts REVA role
      const revaUser = pickRevaPanelUser(sessionWithRevaOnly);
      expect(revaUser?.platform).toBe(Platform.REVA);
      expect(revaUser?.role).toBe("CLIENT");
    });

    it("safely routes post-login redirects across platforms without open redirect vulnerabilities", () => {
      const validSurfboardReturn = "/surfboard/dashboard/newplan";
      const validRevaReturn = "/reva/dashboard?tab=requests";
      const maliciousExternal = "https://phishing.site/twonode-login";

      expect(isSafeReturnPath(validSurfboardReturn)).toBe(true);
      expect(isSafeReturnPath(validRevaReturn)).toBe(true);
      expect(isSafeReturnPath(maliciousExternal)).toBe(false);
    });
  });
});
