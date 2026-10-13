import { describe, expect, it } from "vitest";
import { planFileDisplayName } from "../planFileName";

describe("planFileDisplayName", () => {
  const pn = "xxx/4763/a/011/2026/la";
  it("is the plan number in capitals with / as _, plus the file's extension", () => {
    expect(
      planFileDisplayName({
        planNumber: pn,
        filePath:
          "https://b.s3.eu-north-1.amazonaws.com/surfboard/u1/pdf/XXX_4763_A_011_2026_LA__1791857383168__xxx_4763_a.pdf",
      })
    ).toBe("XXX_4763_A_011_2026_LA.pdf");
  });
  it("numbers further files of one kind", () => {
    const filePath = "surfboard/u1/cad/1__x__a.DWG";
    expect(planFileDisplayName({ planNumber: pn, filePath, index: 0 })).toBe("XXX_4763_A_011_2026_LA.dwg");
    expect(planFileDisplayName({ planNumber: pn, filePath, index: 1 })).toBe("XXX_4763_A_011_2026_LA_2.dwg");
    expect(planFileDisplayName({ planNumber: pn, filePath, index: 2 })).toBe("XXX_4763_A_011_2026_LA_3.dwg");
  });
  it("normalises a trailing underscore and keeps D/012 and D012 apart", () => {
    const filePath = "surfboard/u1/pdf/a.pdf";
    expect(planFileDisplayName({ planNumber: "AUO/4768/003/2022/LA_", filePath })).toBe("AUO_4768_003_2022_LA.pdf");
    expect(planFileDisplayName({ planNumber: "D/012", filePath })).toBe("D_012.pdf");
    expect(planFileDisplayName({ planNumber: "D012", filePath })).toBe("D012.pdf");
  });
  it("handles a file with no extension and a missing plan number", () => {
    expect(planFileDisplayName({ planNumber: "A/1", filePath: "surfboard/u1/pdf/noext" })).toBe("A_1");
    expect(planFileDisplayName({ planNumber: "", filePath: "surfboard/u1/pdf/a.pdf" })).toBe("a.pdf");
  });
});
