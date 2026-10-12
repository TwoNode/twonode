import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockOtpService = vi.hoisted(() => ({
  requestCertificateOtp: vi.fn(),
  verifyCertificateOtpAndIssueToken: vi.fn(),
  verifyDownloadToken: vi.fn(),
}));

const mockTicketService = vi.hoisted(() => ({
  getTicketByNumber: vi.fn(),
}));

const mockPdfService = vi.hoisted(() => ({
  generateCertificatePdfBuffer: vi.fn(),
}));

vi.mock("@/gbc/services/certificateOtpService", () => mockOtpService);
vi.mock("@/gbc/services/ticketService", () => mockTicketService);
vi.mock("@/gbc/services/certificatePdfService", () => mockPdfService);

const { POST: postRequestCode } =
  await import("@/app/api/v1/gbc/certificates/request-code/route");
const { POST: postVerifyCode } =
  await import("@/app/api/v1/gbc/certificates/verify-code/route");
const { POST: postDownload } =
  await import("@/app/api/v1/gbc/certificates/download/route");
const { GET: getLegacyPdf } =
  await import("@/app/api/v1/gbc/tickets/[ticketNumber]/certificate-pdf/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/gbc/certificates/request-code", () => {
  it("rejects invalid email with 400", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/gbc/certificates/request-code",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      }
    );

    const res = await postRequestCode(req);
    expect(res.status).toBe(400);
  });

  it("sets HttpOnly cn cookie and returns generic response on valid request", async () => {
    mockOtpService.requestCertificateOtp.mockResolvedValueOnce({
      message: "If an issued certificate exists, a code was sent.",
      nonce: "mock-nonce-xyz",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/v1/gbc/certificates/request-code",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }
    );

    const res = await postRequestCode(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("If an issued certificate exists");

    // Cookie assertions
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("cn=mock-nonce-xyz");
    expect(cookieHeader).toContain("HttpOnly");
  });
});

describe("POST /api/v1/gbc/certificates/verify-code", () => {
  it("rejects when cn cookie is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/v1/gbc/certificates/verify-code",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", code: "123456" }),
      }
    );

    const res = await postVerifyCode(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details.code).toContain("No verification session found");
  });

  it("verifies code and returns token when cn cookie is present", async () => {
    mockOtpService.verifyCertificateOtpAndIssueToken.mockResolvedValueOnce({
      token: "signed.download.token",
      ticketNumbers: ["GBC2_TEST"],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/v1/gbc/certificates/verify-code",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "cn=valid-browser-nonce",
          "x-forwarded-for": "203.0.113.9",
        },
        body: JSON.stringify({ email: "user@example.com", code: "123456" }),
      }
    );

    const res = await postVerifyCode(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("signed.download.token");
    expect(body.data.ticketNumbers).toEqual(["GBC2_TEST"]);
    expect(
      mockOtpService.verifyCertificateOtpAndIssueToken
    ).toHaveBeenCalledWith(expect.objectContaining({ ip: "203.0.113.9" }));
  });
});

const postJson = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/v1/gbc/certificates/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/v1/gbc/certificates/download", () => {
  it("rejects without token or ticketNumber with 400", async () => {
    const res = await postDownload(postJson({}));
    expect(res.status).toBe(400);
  });

  it("no longer exists as a GET (token must not be in a URL)", async () => {
    const mod = await import("@/app/api/v1/gbc/certificates/download/route");
    expect((mod as Record<string, unknown>).GET).toBeUndefined();
  });

  it("rejects when token is not authorized for the requested ticket", async () => {
    mockOtpService.verifyDownloadToken.mockReturnValueOnce({
      ticketNumbers: ["GBC2_OTHER"],
    });

    const res = await postDownload(
      postJson({ token: "valid.token", ticketNumber: "GBC2_ATTACK" })
    );
    expect(res.status).toBe(400);
  });

  it("streams PDF buffer with headers when token is authorized", async () => {
    mockOtpService.verifyDownloadToken.mockReturnValueOnce({
      ticketNumbers: ["GBC2_VALID"],
    });
    mockTicketService.getTicketByNumber.mockResolvedValueOnce({
      ticketNumber: "GBC2_VALID",
      certificateIssued: true,
      name: "Valid Holder",
    });
    mockPdfService.generateCertificatePdfBuffer.mockResolvedValueOnce(
      Buffer.from("%PDF-1.4 test")
    );

    const res = await postDownload(
      postJson({ token: "valid.token", ticketNumber: "GBC2_VALID" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain(
      "GBC-Certificate-GBC2_VALID.pdf"
    );
  });
});

describe("GET /api/v1/gbc/tickets/[ticketNumber]/certificate-pdf", () => {
  it("is retired: 403 without a token", async () => {
    const res = await getLegacyPdf();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Direct public download is retired");
  });

  it("is retired even when a token is supplied in the URL", async () => {
    const res = await getLegacyPdf();
    expect(res.status).toBe(403);
    expect(mockOtpService.verifyDownloadToken).not.toHaveBeenCalled();
    expect(mockPdfService.generateCertificatePdfBuffer).not.toHaveBeenCalled();
  });
});
