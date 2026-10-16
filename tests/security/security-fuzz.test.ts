import { describe, it, expect } from "vitest";
import { safeUploadFileName, revaUploadKey } from "@/reva/utils/uploadKey";
import { isSafeReturnPath } from "@/lib/auth/loginReturn";
import { validateCSRF } from "@/lib/auth/csrf";
import { verifyToken, signAccessToken, JWTPayload } from "@/lib/auth/jwt";
import { normalizePlanNumber, planNumberToKeySegment } from "@/surfboard/utils/planNumber";
import { Platform } from "@/utils/platform";
import { NextRequest } from "next/server";

// Deterministic PRNG for reproducible security fuzz runs
class SecurityPRNG {
  private state: number;
  constructor(seed = 9999) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1103515245 + 12345) % 2147483648;
    return this.state / 2147483648;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

describe("Security Fuzz Testing Suite: Multi-Scenario Adversarial Invariant Testing", () => {
  const prng = new SecurityPRNG(2026);

  describe("Scenario 1: Path Traversal & S3 Key Injection Fuzzing (1,000 iterations)", () => {
    const traversalPrefixes = [
      "../", "..\\", "%2e%2e%2f", "%2e%2e/", "..%2f", "%252e%252e%252f",
      "..;/", "..//", "..\\\\", "....//", "/../../", "\\..\\..\\",
      "/etc/passwd", "C:\\Windows\\System32\\", "\\\\?\\C:\\",
    ];

    const injectionTokens = [
      "\0", "%00", "\r", "\n", ";", "|", "&", "`", "$",
      "<script>", "${jndi:ldap://evil}", "{{7*7}}", "::$DATA",
    ];

    it("ensures revaUploadKey and safeUploadFileName never climb out of private/reva/ under adversarial paths", () => {
      for (let i = 0; i < 1000; i++) {
        const prefix = prng.pick(traversalPrefixes);
        const depth = prng.int(1, 8);
        const traversalChain = prefix.repeat(depth);
        const token = prng.pick(injectionTokens);
        const randomBase = `file_${i}_${prng.int(100, 999)}.pdf`;
        const maliciousFileName = `${traversalChain}${token}${randomBase}`;
        const maliciousRef = `${prefix}REV-${prng.int(1000, 9999)}${token}`;

        // Test safeUploadFileName
        let cleanName: string;
        expect(() => {
          cleanName = safeUploadFileName(maliciousFileName);
        }).not.toThrow();

        expect(cleanName!).not.toContain("../");
        expect(cleanName!).not.toContain("..\\");
        expect(cleanName!).not.toContain("/");
        expect(cleanName!).not.toContain("\\");
        expect(cleanName!).not.toContain("\0");
        expect(cleanName!.length).toBeGreaterThan(0);

        // Test revaUploadKey folder boundary
        let key: string;
        expect(() => {
          key = revaUploadKey({
            reference: maliciousRef,
            fileName: maliciousFileName,
            uniqueSuffix: `fuzz-${i}`,
          });
        }).not.toThrow();

        // Invariant: Key MUST start with private/reva/ and never contain traversal
        expect(key!.startsWith("private/reva/")).toBe(true);
        expect(key!).not.toContain("../");
        expect(key!).not.toContain("..\\");
        expect(key!).not.toContain("\0");
      }
    });
  });

  describe("Scenario 2: Open Redirect & Return URL Security Fuzzing (1,000 iterations)", () => {
    const maliciousHostSchemes = [
      "//evil.com", "///evil.com", "////evil.com",
      "/\\evil.com", "\\/evil.com", "\\\\evil.com", "\\evil.com",
      "javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)", "blob:https://evil.com/uuid", "file:///etc/passwd",
      "http://attacker.com", "https://twonodetechnologies.com.evil.org",
      "/%09/evil.com", "/%0a/evil.com", "/%0d/evil.com", "/%2f/evil.com",
    ];

    it("rejects 100% of fuzzed open-redirect payloads while allowing valid in-app relative routes", () => {
      for (let i = 0; i < 1000; i++) {
        const base = prng.pick(maliciousHostSchemes);
        const noise = `?param=${prng.int(100, 999)}&token=secret#fragment`;
        const maliciousUrl = `${base}${noise}`;

        // Invariant: Must strictly evaluate to false
        expect(isSafeReturnPath(maliciousUrl)).toBe(false);

        // Generate valid in-app paths and ensure they pass
        const validPath = `/reva/dashboard/report/${i}?page=${prng.int(1, 10)}`;
        expect(isSafeReturnPath(validPath)).toBe(true);
      }
    });
  });

  describe("Scenario 3: CSRF & Origin Header Spoofing Fuzzing (1,000 iterations)", () => {
    const targetHost = "twonodetechnologies.com";

    const spoofedOrigins = [
      "http://twonodetechnologies.com.attacker.com",
      "http://attacker.com?twonodetechnologies.com",
      "http://twonodetechnologies.com@evil.com",
      "http://sub.twonodetechnologies.com.evil.com",
      "http://evil-twonodetechnologies.com",
      "http://localhost:3000",
      "http://localhost:8080",
      "https://twonodetechnologies.com:8443", // Wrong port
      "null",
      "not-a-valid-url",
      "ftp://twonodetechnologies.com",
      "gopher://twonodetechnologies.com",
    ];

    it("rejects 100% of fuzzed spoofed origin headers under POST/mutation requests", () => {
      for (let i = 0; i < 1000; i++) {
        const spoofed = prng.pick(spoofedOrigins);
        const req = new NextRequest("https://twonodetechnologies.com/api/v1/reva/submit", {
          method: "POST",
          headers: {
            host: targetHost,
            origin: spoofed,
          },
        });

        // Invariant: Spoofed origin MUST be rejected
        expect(validateCSRF(req)).toBe(false);
      }
    });

    it("strictly accepts legitimate same-origin requests matching host", () => {
      const validReq = new NextRequest(`https://${targetHost}/api/v1/reva/submit`, {
        method: "POST",
        headers: {
          host: targetHost,
          origin: `https://${targetHost}`,
        },
      });
      expect(validateCSRF(validReq)).toBe(true);
    });
  });

  describe("Scenario 4: Cryptographic Token Tampering & Claim Elevation Fuzzing (500 iterations)", () => {
    it("rejects all fuzzed signature bit-flips and header corruptions", async () => {
      const legitPayload: JWTPayload = {
        sub: "usr_surveyor_legit_42",
        role: "USER",
        platform: Platform.SURFBOARD,
        emailVerified: true,
        mustVerifyNow: false,
      };

      const validToken = await signAccessToken(legitPayload);

      for (let i = 0; i < 500; i++) {
        const parts = validToken.split(".");
        expect(parts).toHaveLength(3);

        const mutationType = prng.int(0, 3);
        let corruptedToken = validToken;

        if (mutationType === 0) {
          // Mutate signature
          const sig = parts[2];
          const mutateIdx = prng.int(0, sig.length - 3);
          const mutatedChar = sig[mutateIdx] === "A" ? "B" : "A";
          const corruptedSig = sig.slice(0, mutateIdx) + mutatedChar + sig.slice(mutateIdx + 1);
          corruptedToken = `${parts[0]}.${parts[1]}.${corruptedSig}`;
        } else if (mutationType === 1) {
          // Tamper payload to elevate role to SUPERADMIN
          const decodedPayload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
          decodedPayload.role = "SUPERADMIN";
          decodedPayload.sub = "attacker_999";
          const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url");
          // Signature was NOT regenerated with secret
          corruptedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;
        } else if (mutationType === 2) {
          // Truncate signature
          corruptedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, 10)}`;
        } else {
          // Garbage bytes
          corruptedToken = `eyJhbGciOiJIUzI1NiJ9.corrupted_payload_${i}.bad_sig_${i}`;
        }

        // Invariant: Tampered token MUST fail verification
        const verified = await verifyToken(corruptedToken);
        expect(verified).toBeNull();
      }
    });
  });

  describe("Scenario 5: Plan Number SQL & Command Metacharacter Fuzzing (1,000 iterations)", () => {
    const sqlTokens = [
      "' OR 1=1 --", "'; DROP TABLE plans; --", "' UNION SELECT * FROM users --",
      "admin'--", "/* comment */", "0x313233", "WAITFOR DELAY '0:0:5'",
      "| ls -la", "& cat /etc/passwd", "; echo hacked", "`whoami`", "$((1+1))",
    ];

    it("neutralizes 100% of fuzzed SQL/shell injection strings into safe cadastral segments", () => {
      for (let i = 0; i < 1000; i++) {
        const token = prng.pick(sqlTokens);
        const fuzzedPlanNumber = `PLAN/${prng.int(100, 999)}/${token}/${prng.int(2020, 2026)}`;

        let segment: string;
        expect(() => {
          segment = planNumberToKeySegment(fuzzedPlanNumber);
        }).not.toThrow();

        // Invariant: File segment must never contain / or spaces
        expect(segment!).not.toContain("/");
        expect(segment!).not.toContain(" ");
        expect(segment!).toBe(segment!.toUpperCase());
      }
    });
  });
});
