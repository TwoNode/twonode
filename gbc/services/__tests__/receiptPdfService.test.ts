import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * generateTicketReceiptPdfBuffer spawns a standalone `node` child process
 * (gbc/pdf-worker/receipt.render.cjs), same reason and same pattern as
 * certificatePdfService.test.ts — mocks child_process.execFile to exercise
 * the payload/error plumbing without spawning a real process.
 */

const mockExecFile = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({ execFile: mockExecFile }));

const { generateTicketReceiptPdfBuffer } = await import("@/gbc/services/receiptPdfService");

const ticket = {
  ticketNumber: "GBC2_ABC123",
  name: "Jane Doe",
  email: "jane@test.com",
  ticketType: "REGULAR",
  price: 25000,
  paymentRef: "ref_abc",
  paymentMethod: "paystack",
  paymentDate: new Date("2026-03-15T10:00:00Z"),
  editionRef: { name: "GBC 2.0" },
};

function mockChildProcess(stdin: { write: (v: string) => void; end: () => void } = { write: vi.fn(), end: vi.fn() }) {
  return { stdin };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateTicketReceiptPdfBuffer", () => {
  it("resolves with the worker's stdout buffer, piping the ticket as JSON on stdin", async () => {
    const expectedBuffer = Buffer.from("%PDF-fake");
    const stdinWrite = vi.fn();
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, expectedBuffer, Buffer.from(""));
      return mockChildProcess({ write: stdinWrite, end: vi.fn() });
    });

    const result = await generateTicketReceiptPdfBuffer(ticket as any);

    expect(result).toBe(expectedBuffer);
    const payload = JSON.parse(stdinWrite.mock.calls[0][0]);
    expect(payload.ticket.ticketNumber).toBe("GBC2_ABC123");
  });

  it("invokes the worker script via the real node binary", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, Buffer.from(""), Buffer.from(""));
      return mockChildProcess();
    });

    await generateTicketReceiptPdfBuffer(ticket as any);

    const [cmd, args] = mockExecFile.mock.calls[0];
    expect(cmd).toBe(process.execPath);
    expect(args[0]).toMatch(/receipt\.render\.cjs$/);
  });

  it("rejects with the worker's stderr when the process fails", async () => {
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(new Error("exit 1"), Buffer.from(""), Buffer.from("font not found"));
      return mockChildProcess();
    });

    await expect(generateTicketReceiptPdfBuffer(ticket as any)).rejects.toThrow(/font not found/);
  });
});
