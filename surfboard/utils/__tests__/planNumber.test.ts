import { describe, expect, it } from "vitest";
import {
  normalizePlanNumber,
  planNumberToKeySegment,
  samePlanNumber,
} from "../planNumber";

describe("normalizePlanNumber", () => {
  it("trims, upper-cases and drops trailing _ and .", () => {
    expect(normalizePlanNumber("  tnttt/4763/d009/2024/la ")).toBe("TNTTT/4763/D009/2024/LA");
    expect(normalizePlanNumber("AUO/4768/003/2022/LA_")).toBe("AUO/4768/003/2022/LA");
    expect(normalizePlanNumber("AUO/4768/003/2022/LA.")).toBe("AUO/4768/003/2022/LA");
  });

  it("collapses runs of spaces", () => {
    expect(normalizePlanNumber("QED  1236   027")).toBe("QED 1236 027");
  });

  it("keeps / and - and inner underscores, which can mean different plans", () => {
    expect(normalizePlanNumber("LIO/6164/1-03/2026/LA")).toBe("LIO/6164/1-03/2026/LA");
    expect(normalizePlanNumber("QED_1236_035_2025_LA")).toBe("QED_1236_035_2025_LA");
    expect(normalizePlanNumber("D/012")).not.toBe(normalizePlanNumber("D012"));
  });

  it("handles empty input", () => {
    expect(normalizePlanNumber("")).toBe("");
    expect(normalizePlanNumber(null)).toBe("");
    expect(normalizePlanNumber(undefined)).toBe("");
  });
});

describe("samePlanNumber", () => {
  it("matches typing variants of one plan", () => {
    expect(samePlanNumber("abc/12/la", "ABC/12/LA_")).toBe(true);
  });
  it("does not match different plans or empties", () => {
    expect(samePlanNumber("D/012", "D012")).toBe(false);
    expect(samePlanNumber("", "")).toBe(false);
  });
});

describe("planNumberToKeySegment", () => {
  it("turns / into _ and spaces into -", () => {
    expect(planNumberToKeySegment("abc/12/la_")).toBe("ABC_12_LA");
    expect(planNumberToKeySegment("QED 1236")).toBe("QED-1236");
  });
});
