import { describe, expect, it } from "vitest";
import {
  downloadHrefFor,
  fileNameOf,
  fileRefOf,
  isGatewayLink,
  jsonHrefFor,
  mediaKindFor,
} from "../mediaTypes";

const GW = "/api/v1/surfboard/files/view";
const gw = (ref: string) => `${GW}?url=${encodeURIComponent(ref)}`;
const S3 =
  "https://reva-store.s3.eu-north-1.amazonaws.com/surfboard/u1/redcopy/1760000000000__ab12cd34__OOO_4768_001_2025_LA.pdf";

describe("gateway links", () => {
  it("recognises them and finds the stored file behind them", () => {
    expect(isGatewayLink(gw(S3))).toBe(true);
    expect(isGatewayLink(S3)).toBe(false);
    expect(fileRefOf(gw(S3))).toBe(S3);
    expect(fileRefOf(`${GW}?key=surfboard/u1/a.pdf`)).toBe(
      "surfboard/u1/a.pdf"
    );
    expect(fileRefOf("https://example.com/x.png")).toBe(
      "https://example.com/x.png"
    );
  });
});

describe("fileNameOf", () => {
  it("drops the upload prefix and decodes the name", () => {
    expect(fileNameOf(gw(S3))).toBe("OOO_4768_001_2025_LA.pdf");
    expect(fileNameOf("https://x.test/a/My%20Plan.png?sig=1")).toBe(
      "My Plan.png"
    );
  });
  it("falls back when there is no name", () => {
    expect(fileNameOf("https://x.test/", "File")).toBe("File");
  });
});

describe("mediaKindFor", () => {
  it.each([
    ["a.PDF", "pdf"],
    ["photo.jpeg", "image"],
    ["logo.svg", "image"],
    ["clip.mp4", "video"],
    ["note.m4a", "audio"],
    ["plan.dwg", "other"],
    ["area.kmz", "other"],
    ["sheet.xlsx", "other"],
    ["noextension", "other"],
  ])("%s is %s", (name, kind) => {
    expect(mediaKindFor(`https://x.test/${name}`)).toBe(kind);
  });
  it("uses a given name over the link", () => {
    expect(mediaKindFor(gw("surfboard/u/abc"), "scan.png")).toBe("image");
  });
});

describe("downloadHrefFor / jsonHrefFor", () => {
  it("asks the gateway for a download and keeps a relative link relative", () => {
    const href = downloadHrefFor(gw(S3), "Plan.pdf");
    expect(href.startsWith(GW)).toBe(true);
    const q = new URL(href, "http://x").searchParams;
    expect(q.get("download")).toBe("1");
    expect(q.get("name")).toBe("Plan.pdf");
    expect(q.get("url")).toBe(S3);
  });
  it("leaves non-gateway links alone", () => {
    expect(downloadHrefFor("https://x.test/a.png")).toBe(
      "https://x.test/a.png"
    );
  });
  it("asks for JSON and the longest link window", () => {
    const q = new URL(jsonHrefFor(gw(S3)), "http://x").searchParams;
    expect(q.get("expiresIn")).toBe("900");
  });
  it("asks for JSON", () => {
    expect(
      new URL(jsonHrefFor(gw(S3)), "http://x").searchParams.get("format")
    ).toBe("json");
  });
});
