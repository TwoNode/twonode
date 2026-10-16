import { describe, it, expect } from "vitest";
import { safeUploadFileName, revaUploadKey } from "@/reva/utils/uploadKey";
import { pickRevaPanelUser } from "@/reva/access/panelUser";
import { normalizePlanNumber, planNumberToKeySegment } from "@/surfboard/utils/planNumber";
import { validateCSRF } from "@/lib/auth/csrf";
import { verifyToken, signAccessToken, JWTPayload } from "@/lib/auth/jwt";
import { isSafeReturnPath } from "@/lib/auth/loginReturn";
import { Platform } from "@/utils/platform";
import { NextRequest } from "next/server";

describe("Security Testing Suite: Surfboard & REVA", () => {
  describe("Path Traversal & S3 Key Sanitization", () => {
    it("rejects path traversal attempts in file names", () => {
      const maliciousNames = [
        "../../etc/passwd",
        "..\\..\\windows\\system32\\cmd.exe",
        "....//....//config.json",
        "/absolute/root/path.pdf",
        "nested/sub/folder/file.pdf",
      ];

      for (const name of maliciousNames) {
        const safe = safeUploadFileName(name);
        expect(safe).not.toContain("../");
        expect(safe).not.toContain("..\\");
        expect(safe).not.toContain("/");
        expect(safe).not.toContain("\\");
      }
    });

    it("strips null bytes and control characters to prevent truncation attacks", () => {
      const attack = "legit.pdf\0.exe";
      const sanitized = safeUploadFileName(attack);
      expect(sanitized).not.toContain("\0");
      expect(sanitized).toBe("legit.pdf_.exe");
    });

    it("strips leading dots to prevent hidden/dot-file creation", () => {
      expect(safeUploadFileName(".env.local")).toBe("env.local");
      expect(safeUploadFileName("...hidden")).toBe("hidden");
    });

    it("constrains REVA upload folder references to alphanumeric safe strings", () => {
      const key = revaUploadKey({
        reference: "../../../escape/REV-999; rm -rf /",
        fileName: "report.pdf",
        uniqueSuffix: "uuid-1234",
      });

      expect(key.startsWith("private/reva/")).toBe(true);
      expect(key).not.toContain("..");
      expect(key).not.toContain(";");
      expect(key).not.toContain(" ");
      expect(key).toBe("private/reva/escapeREV-999rm-rf/uuid-1234-report.pdf");
    });
  });

  describe("Cross-Tenant Access Control & Multi-Platform Role Isolation", () => {
    it("denies REVA panel access when user has only Surfboard or GBC role", () => {
      const surfboardUser = {
        platform: Platform.SURFBOARD,
        role: "SURVEYOR",
        email: "surveyor@example.com",
      };

      const revaPanelUser = pickRevaPanelUser(surfboardUser);
      expect(revaPanelUser).toBeNull();
    });

    it("denies REVA panel access when session is empty or missing roles", () => {
      expect(pickRevaPanelUser(null)).toBeNull();
      expect(pickRevaPanelUser(undefined)).toBeNull();
      expect(pickRevaPanelUser({})).toBeNull();
    });

    it("isolates multi-platform roles and extracts only authorized REVA permissions", () => {
      const multiPlatformUser = {
        email: "dual@twonode.com",
        firstName: "Ada",
        lastName: "Lovelace",
        platforms: {
          [Platform.SURFBOARD]: { role: "SURVEYOR" },
          [Platform.REVA]: { role: "ADMIN" },
        },
      };

      const revaUser = pickRevaPanelUser(multiPlatformUser);
      expect(revaUser).not.toBeNull();
      expect(revaUser?.platform).toBe(Platform.REVA);
      expect(revaUser?.role).toBe("ADMIN");
      expect(revaUser?.email).toBe("dual@twonode.com");
    });
  });

  describe("Input Sanitization & Injection Defense", () => {
    it("neutralizes SQL injection patterns in plan numbers for file segment storage", () => {
      const sqlInjections = [
        "OG/123' OR '1'='1",
        "LS/456; DROP TABLE survey_plans;--",
        "PLAN' UNION SELECT * FROM users--",
      ];

      for (const injection of sqlInjections) {
        const segment = planNumberToKeySegment(injection);
        expect(segment).not.toContain("/");
        expect(segment).not.toContain(" ");
        // Ensure canonical normalization keeps upper case and safe dashes
        expect(segment).toBe(normalizePlanNumber(injection).replace(/\//g, "_").replace(/\s/g, "-"));
      }
    });

    it("prevents open redirect attacks via isSafeReturnPath", () => {
      const attackUrls = [
        "https://evil-attacker.com/steal-session",
        "//evil-attacker.com",
        "javascript:alert(document.cookie)",
        "data:text/html,<script>alert(1)</script>",
        "\\evil-attacker.com",
        "http://twonodetechnologies.com.attacker.com",
      ];

      for (const url of attackUrls) {
        expect(isSafeReturnPath(url)).toBe(false);
      }
    });

    it("allows valid relative in-app paths through isSafeReturnPath", () => {
      expect(isSafeReturnPath("/reva/dashboard")).toBe(true);
      expect(isSafeReturnPath("/surfboard/plans")).toBe(true);
      expect(isSafeReturnPath("/reva/requestform?step=2")).toBe(true);
      expect(isSafeReturnPath("")).toBe(false);
      expect(isSafeReturnPath(null)).toBe(false);
    });
  });

  describe("CSRF Protection & Token Tampering Defense", () => {
    it("rejects cross-site requests missing origin and referer headers", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/reva/submit", {
        method: "POST",
      });
      expect(validateCSRF(req)).toBe(false);
    });

    it("rejects cross-site requests with mismatched Origin header", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/reva/submit", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://malicious-site.com",
        },
      });
      expect(validateCSRF(req)).toBe(false);
    });

    it("rejects untrusted 'Origin: null' header", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/reva/submit", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "null",
        },
      });
      expect(validateCSRF(req)).toBe(false);
    });

    it("accepts legitimate same-origin requests", () => {
      const req = new NextRequest("http://localhost:3000/api/v1/reva/submit", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });
      expect(validateCSRF(req)).toBe(true);
    });

    it("detects and rejects tampered JWT tokens", async () => {
      const validPayload: JWTPayload = {
        sub: "user-12345",
        role: "ADMIN",
        platform: Platform.REVA,
        emailVerified: true,
        mustVerifyNow: false,
      };

      const token = await signAccessToken(validPayload);
      const verified = await verifyToken(token);
      expect(verified?.sub).toBe("user-12345");

      // Tamper with the signature bytes
      const tampered = token.slice(0, -6) + "XXXXXX";
      const tamperedVerified = await verifyToken(tampered);
      expect(tamperedVerified).toBeNull();
    });

    it("rejects tokens with forged algorithm 'none' headers", async () => {
      // Create a forged unsigned token (header: {"alg":"none","typ":"JWT"})
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ sub: "hacker", role: "SUPERADMIN" })).toString("base64url");
      const forgedNoneToken = `${header}.${payload}.`;

      const result = await verifyToken(forgedNoneToken);
      expect(result).toBeNull();
    });
  });
});
