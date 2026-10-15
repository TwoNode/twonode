import { describe, expect, it } from "vitest";
import { gbcPublicKey, gbcQrCodeKey, ticketQrKey } from "../storageKeys";

describe("gbcQrCodeKey", () => {
  it("puts QR codes under the private, per-edition prefix", () => {
    expect(gbcQrCodeKey("2.0", "GBC2_ab12cd", 1700000000000, "xyz")).toBe(
      "private/gbc/2.0/qrcodes/1700000000000-xyz-gbc2_ab12cd.png"
    );
  });

  it("cannot be pushed out of its folder by the edition or ticket number", () => {
    const key = gbcQrCodeKey("../../surfboard", "a/b", 1, "r");
    expect(key.startsWith("private/gbc/")).toBe(true);
    expect(key.split("/")).toHaveLength(5);
    expect(key.split("/")).not.toContain("..");
  });
});

describe("gbcPublicKey", () => {
  it("puts gallery, speakers and logos under the public, per-edition prefix", () => {
    expect(gbcPublicKey("2.0", "gallery", "Photo One.JPG", 5, "r")).toBe(
      "public/gbc/2.0/gallery/5-r-photo_one.jpg"
    );
    expect(gbcPublicKey("3.0", "logos/sponsors", "a.png", 5, "r")).toBe(
      "public/gbc/3.0/logos/sponsors/5-r-a.png"
    );
  });

  it("cannot be pushed out of public/gbc by the edition, folder or file name", () => {
    const key = gbcPublicKey(
      "../../private",
      "../surfboard/x",
      "../../a.png",
      1,
      "r"
    );
    expect(key.startsWith("public/gbc/")).toBe(true);
    expect(key.split("/")).not.toContain("..");
    expect(key.includes("private/gbc")).toBe(false);
  });
});

describe("ticketQrKey", () => {
  it("prefers the stored key", () => {
    expect(
      ticketQrKey({
        qrCodeS3Key: "private/gbc/2.0/qrcodes/a.png",
        qrCode: "https://x.s3.amazonaws.com/GBC2/qrcodes/b.png",
      })
    ).toBe("private/gbc/2.0/qrcodes/a.png");
  });

  it("falls back to the key inside an old public QR URL", () => {
    expect(
      ticketQrKey({
        qrCodeS3Key: null,
        qrCode:
          "https://reva-store.s3.eu-north-1.amazonaws.com/GBC2/qrcodes/1-a-t.png",
      })
    ).toBe("GBC2/qrcodes/1-a-t.png");
  });

  it("returns null when there is no QR, or the URL is not a QR file", () => {
    expect(ticketQrKey({})).toBeNull();
    expect(
      ticketQrKey({ qrCode: "https://evil.example/GBC2/qrcodes/x.png" })
    ).toBe("GBC2/qrcodes/x.png"); // host is ignored: only the key is ever signed
    expect(
      ticketQrKey({
        qrCode: "https://x.s3.amazonaws.com/surfboard/u/pdf/a.pdf",
      })
    ).toBeNull();
    expect(ticketQrKey({ qrCode: "not a url" })).toBeNull();
  });
});
