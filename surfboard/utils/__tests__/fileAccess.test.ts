import { describe, it, expect } from "vitest";
import {
  clampExpiresIn,
  isSafeStorageKey,
  isStorageFileRef,
  keyBelongsToAllowedUser,
} from "../fileAccess";

describe("clampExpiresIn", () => {
  it("defaults, floors and caps", () => {
    expect(clampExpiresIn(null)).toBe(300);
    expect(clampExpiresIn("abc")).toBe(300);
    expect(clampExpiresIn("5")).toBe(30);
    expect(clampExpiresIn("99999999")).toBe(900);
    expect(clampExpiresIn("120")).toBe(120);
  });
});

describe("isSafeStorageKey", () => {
  it("rejects empty, short and traversal keys", () => {
    expect(isSafeStorageKey("")).toBe(false);
    expect(isSafeStorageKey("a")).toBe(false);
    expect(isSafeStorageKey("surfboard/u1/../u2/pdf/x.pdf")).toBe(false);
    expect(isSafeStorageKey("surfboard/u1/pdf/x.pdf")).toBe(true);
  });
});

describe("keyBelongsToAllowedUser", () => {
  it("refuses another user's folder even if a plan lists the file", () => {
    expect(keyBelongsToAllowedUser("surfboard/victim/pdf/x.pdf", ["attacker"])).toBe(false);
  });
  it("allows the owner's folder and unscoped keys", () => {
    expect(keyBelongsToAllowedUser("surfboard/me/pdf/x.pdf", ["me"])).toBe(true);
    expect(keyBelongsToAllowedUser("surfboard/pdf/x.pdf", ["me"])).toBe(true);
    expect(keyBelongsToAllowedUser("legacy/file.pdf", ["me"])).toBe(true);
  });
});

describe("isStorageFileRef", () => {
  it("is true for our bucket links and keys", () => {
    expect(
      isStorageFileRef(
        "https://reva-store.s3.eu-north-1.amazonaws.com/surfboard/u1/pdf/a.pdf"
      )
    ).toBe(true);
    expect(isStorageFileRef("surfboard/u1/pdf/a.pdf")).toBe(true);
  });

  it("is false for external links and empty values", () => {
    expect(isStorageFileRef("https://login.remita.net/receipt/1")).toBe(false);
    expect(isStorageFileRef("https://example.com/surfboard/x")).toBe(false);
    expect(isStorageFileRef("")).toBe(false);
    expect(isStorageFileRef(null)).toBe(false);
  });
});

describe("isRedCopyKeyOfPlan", () => {
  it("accepts only the plan's own redcopy folder", async () => {
    const { isRedCopyKeyOfPlan } = await import("../fileAccess");
    expect(isRedCopyKeyOfPlan("surfboard/A/B/1/redcopy/f.pdf", "A/B/1")).toBe(true);
    expect(isRedCopyKeyOfPlan("surfboard/A/B/1/redcopy/f.pdf", "A/B/2")).toBe(false);
    expect(isRedCopyKeyOfPlan("surfboard/A/B/1/pdf/f.pdf", "A/B/1")).toBe(false);
    expect(isRedCopyKeyOfPlan("surfboard/A/B/1/redcopy/f.pdf", "")).toBe(false);
  });
});
