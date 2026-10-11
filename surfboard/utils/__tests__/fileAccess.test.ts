import { describe, it, expect } from "vitest";
import {
  clampExpiresIn,
  isSafeStorageKey,
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
