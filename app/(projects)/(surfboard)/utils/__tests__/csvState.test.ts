import { describe, expect, it } from "vitest";
import { DEFAULT_COORDINATE_SHIFTS } from "@/lib/constants";
import {
  DEFAULT_CSV_STATE,
  resolveCsvState,
} from "@/app/(projects)/(surfboard)/utils/csvState";

describe("resolveCsvState", () => {
  it("treats a CSV with no state column, or an empty one, as Lagos", () => {
    expect(resolveCsvState(null)).toBe("Lagos");
    expect(resolveCsvState(undefined)).toBe("Lagos");
    expect(resolveCsvState("")).toBe("Lagos");
    expect(resolveCsvState("   ")).toBe("Lagos");
  });

  it("keeps a state the CSV names", () => {
    expect(resolveCsvState("Ogun")).toBe("Ogun");
    expect(resolveCsvState("  Lagos ")).toBe("Lagos");
  });

  it("falls back to a state that actually has a correction configured", () => {
    // The map looks the correction up by lower-cased state name.
    expect(
      DEFAULT_COORDINATE_SHIFTS[
        DEFAULT_CSV_STATE.toLowerCase() as keyof typeof DEFAULT_COORDINATE_SHIFTS
      ]
    ).toBeDefined();
  });
});
