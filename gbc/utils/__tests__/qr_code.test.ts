import { describe, expect, it } from "vitest";
import { generateVerificationQRDataURL } from "@/gbc/utils/qr_code";

describe("generateVerificationQRDataURL", () => {
  it("encodes the given URL as a scannable PNG data URL", async () => {
    const dataUrl = await generateVerificationQRDataURL(
      "https://www.twonodetechnologies.com/gbc/certificate/GBC2_ABC",
    );
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("produces a different code for a different URL (not a static placeholder)", async () => {
    const a = await generateVerificationQRDataURL("https://example.com/a");
    const b = await generateVerificationQRDataURL("https://example.com/b");
    expect(a).not.toBe(b);
  });
});
