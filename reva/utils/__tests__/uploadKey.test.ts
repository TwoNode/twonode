import { describe, expect, it } from "vitest";
import { revaUploadKey, safeUploadFileName } from "../uploadKey";
import { isRevaStorageKey } from "../fileAccess";

describe("safeUploadFileName", () => {
  it("removes path separators, control characters and leading dots", () => {
    expect(safeUploadFileName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(safeUploadFileName("..\\x.pdf")).toBe("_x.pdf");
    expect(safeUploadFileName(".htaccess")).toBe("htaccess");
    expect(safeUploadFileName("")).toBe("file");
  });
});

describe("revaUploadKey", () => {
  it("files a request's upload under private/reva/<reference>/", () => {
    const key = revaUploadKey({ reference: "REVA_ab12", fileName: "Site Plan.pdf", uniqueSuffix: "17-xyz" });
    expect(key).toBe("private/reva/REVA_ab12/17-xyz-Site Plan.pdf");
    expect(isRevaStorageKey(key)).toBe(true);
  });
  it("keeps the file name for direct (report) uploads", () => {
    expect(revaUploadKey({ reference: "REVA_ab12", fileName: "report.pdf", direct: true, uniqueSuffix: "x" })).toBe(
      "private/reva/REVA_ab12/report.pdf"
    );
  });
  it("uses a catch-all folder when no reference exists yet, and cannot be steered by it", () => {
    expect(revaUploadKey({ fileName: "a.png", uniqueSuffix: "1" })).toBe("private/reva/unassigned/1-a.png");
    expect(revaUploadKey({ reference: "../../surfboard", fileName: "a.png", uniqueSuffix: "1" })).toBe(
      "private/reva/surfboard/1-a.png"
    );
  });
});
