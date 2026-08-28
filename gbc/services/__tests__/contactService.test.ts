import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  gBCContactInquiry: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
}));

const mockEmail = vi.hoisted(() => ({
  sendGBCContactConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendGBCAdminNotification: vi.fn().mockResolvedValue(undefined),
  sendGBCInquiryReply: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/app/(projects)/(GBC)/utils/email", () => mockEmail);

const { submitContactForm, replyToInquiry } = await import("@/gbc/services/contactService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("submitContactForm", () => {
  it("creates the inquiry and sends both the confirmation and admin notification", async () => {
    mockPrisma.gBCContactInquiry.create.mockResolvedValue({ id: "i1" });
    const data = { name: "Jane", email: "jane@test.com", subject: "Hi", message: "Hello there", type: "GENERAL" } as any;

    await submitContactForm(data);

    expect(mockPrisma.gBCContactInquiry.create).toHaveBeenCalledWith({ data });
    expect(mockEmail.sendGBCContactConfirmation).toHaveBeenCalledWith("Jane", "jane@test.com", "Hi");
    expect(mockEmail.sendGBCAdminNotification).toHaveBeenCalledWith(
      "GENERAL",
      "Jane",
      "jane@test.com",
      undefined,
      "Hi",
      "Hello there"
    );
  });
});

describe("replyToInquiry", () => {
  it("throws NotFoundError for an unknown inquiry", async () => {
    mockPrisma.gBCContactInquiry.findUnique.mockResolvedValue(null);
    await expect(replyToInquiry("nope", "Subj", "Msg")).rejects.toMatchObject({ status: 404 });
  });

  it("throws when the reply email fails to send, without updating status", async () => {
    mockPrisma.gBCContactInquiry.findUnique.mockResolvedValue({ email: "a@test.com", name: "A" });
    mockEmail.sendGBCInquiryReply.mockResolvedValueOnce({ success: false, error: "SMTP down" });
    await expect(replyToInquiry("i1", "Subj", "Msg")).rejects.toThrow("SMTP down");
    expect(mockPrisma.gBCContactInquiry.update).not.toHaveBeenCalled();
  });

  it("marks the inquiry IN_PROGRESS once the reply sends", async () => {
    mockPrisma.gBCContactInquiry.findUnique.mockResolvedValue({ email: "a@test.com", name: "A" });
    await replyToInquiry("i1", "Subj", "Msg");
    expect(mockPrisma.gBCContactInquiry.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "IN_PROGRESS" },
    });
  });
});
