import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * generateCertificatePdfBuffer spawns a standalone `node` child process
 * (gbc/pdf-worker/certificate.render.cjs) instead of rendering
 * @react-pdf/renderer in-process — see certificatePdfService.ts's doc
 * comment for why (Next's Route Handler bundler tags .tsx files with a
 * React copy that isn't binary-compatible with @react-pdf/reconciler's
 * pinned react@18.3.1, throwing "Minified React error #31" otherwise).
 * These tests mock child_process.execFile so they exercise the actual
 * plumbing (worker path, stdin payload, buffer/error propagation)
 * without spawning a real process or touching the filesystem.
 */

const mockExecFile = vi.hoisted(() => vi.fn());
const mockGenerateQR = vi.hoisted(() => vi.fn());

vi.mock("child_process", () => ({ execFile: mockExecFile }));
vi.mock("@/gbc/utils/qr_code", () => ({
  generateVerificationQRDataURL: mockGenerateQR,
}));

const { generateCertificatePdfBuffer, getCertificateVerificationUrl } =
  await import("@/gbc/services/certificatePdfService");

const ticket = {
  ticketNumber: "GBC2_ABC123",
  name: "Jane Doe",
  checkedInAt: new Date("2026-03-15T10:00:00Z"),
  editionRef: {
    name: "GBC 2.0",
    theme: "Geospatial Capital",
    subTheme: "Driving Transformation",
    venue: "Eko Hotel & Suites, Lagos",
    startDate: new Date("2026-03-15T00:00:00Z"),
    endDate: new Date("2026-03-15T00:00:00Z"),
  },
};

function mockChildProcess(
  stdin: { write: (v: string) => void; end: () => void } = {
    write: vi.fn(),
    end: vi.fn(),
  }
) {
  return { stdin };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateQR.mockResolvedValue("data:image/png;base64,fakeqr");
});

describe("getCertificateVerificationUrl", () => {
  it("builds the public certificate page URL for a ticket number", () => {
    expect(getCertificateVerificationUrl("GBC2_ABC123")).toMatch(
      /\/gbc\/certificate\/GBC2_ABC123$/
    );
  });
});

describe("getCertificateVerificationUrl with a publicId", () => {
  it("points at the unguessable verify page", () => {
    expect(getCertificateVerificationUrl("GBC2_ABC123", "pid-1")).toMatch(
      /\/gbc\/verify\/pid-1$/
    );
  });
});

describe("generateCertificatePdfBuffer", () => {
  it("resolves with the worker's stdout buffer on success", async () => {
    const expectedBuffer = Buffer.from("%PDF-fake");
    const stdinWrite = vi.fn();
    const stdinEnd = vi.fn();
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, expectedBuffer, Buffer.from(""));
      return mockChildProcess({ write: stdinWrite, end: stdinEnd });
    });

    const result = await generateCertificatePdfBuffer(ticket as any);

    expect(result).toBe(expectedBuffer);
    expect(stdinWrite).toHaveBeenCalledTimes(1);
    expect(stdinEnd).toHaveBeenCalledTimes(1);

    // The payload piped to the worker must carry the ticket, the
    // verification URL, and a pre-generated QR data URL — the worker
    // itself never talks to the DB or generates the QR code.
    const payload = JSON.parse(stdinWrite.mock.calls[0][0]);
    expect(payload.ticket.ticketNumber).toBe("GBC2_ABC123");
    expect(payload.verificationUrl).toContain("GBC2_ABC123");
    expect(payload.qrCodeDataUrl).toBe("data:image/png;base64,fakeqr");
  });

  it("invokes the worker script via the real node binary", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, Buffer.from(""), Buffer.from(""));
      return mockChildProcess();
    });

    await generateCertificatePdfBuffer(ticket as any);

    const [cmd, args] = mockExecFile.mock.calls[0];
    expect(cmd).toBe(process.execPath);
    expect(args[0]).toMatch(/certificate\.render\.cjs$/);
  });

  it("rejects with the worker's stderr when the process fails", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(
        new Error("exit 1"),
        Buffer.from(""),
        Buffer.from("font not found")
      );
      return mockChildProcess();
    });

    await expect(generateCertificatePdfBuffer(ticket as any)).rejects.toThrow(
      /font not found/
    );
  });
});
