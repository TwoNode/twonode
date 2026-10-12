import { describe, it, expect } from "vitest";
import { toCertificateView } from "../certificateView";

describe("toCertificateView", () => {
  it("drops every field that is not shown on the certificate", () => {
    const row: any = {
      ticketNumber: "GBC2_abc123",
      name: "Ada Lovelace",
      checkedInAt: null,
      email: "a@example.com",
      phone: "0800",
      paymentRef: "ref",
      paymentDetails: { x: 1 },
      certificatePublicId: "secret",
      checkedInBy: "admin",
      qrCodeUrl: "https://s3/x",
      amount: 5000,
      editionRef: {
        name: "E", theme: "T", subTheme: "S", venue: "V",
        startDate: new Date(), endDate: new Date(), price: 100, capacity: 9,
      },
    };
    const json = JSON.stringify(toCertificateView(row));
    for (const k of ["email", "phone", "paymentRef", "paymentDetails", "certificatePublicId", "checkedInBy", "qrCodeUrl", "amount", "price", "capacity"]) {
      expect(json).not.toContain(`"${k}"`);
    }
    expect(json).toContain("Ada Lovelace");
  });
});
