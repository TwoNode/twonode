import { describe, expect, it } from "vitest";
import {
  isRevaFileRef,
  isRevaStorageKey,
  ownSitePhotoMatches,
} from "../fileAccess";

describe("isRevaStorageKey", () => {
  it("accepts the REVA folders only", () => {
    expect(isRevaStorageKey("reva/uploads/a.pdf")).toBe(true);
    expect(isRevaStorageKey("private/reva/REVA_1/a.pdf")).toBe(true);
    expect(isRevaStorageKey("uploads/1-a.svg")).toBe(true);
    expect(isRevaStorageKey("surfboard/u1/pdf/a.pdf")).toBe(false);
    expect(isRevaStorageKey("GBC2/x.png")).toBe(false);
  });
});

describe("isRevaFileRef", () => {
  it("recognises our links and keys, not external ones", () => {
    expect(isRevaFileRef("https://b.s3.eu-north-1.amazonaws.com/reva/uploads/a.pdf")).toBe(true);
    expect(isRevaFileRef("reva/uploads/a.pdf")).toBe(true);
    expect(isRevaFileRef("https://example.com/reva/uploads/a.pdf")).toBe(false);
    expect(isRevaFileRef("")).toBe(false);
    expect(isRevaFileRef(null)).toBe(false);
  });
});

describe("ownSitePhotoMatches", () => {
  it("matches only photos of the caller's own requests", () => {
    expect(ownSitePhotoMatches("reva/uploads/p1.jpg", ["reva/uploads/p1.jpg"])).toBe(true);
    expect(ownSitePhotoMatches("reva/uploads/other.jpg", ["reva/uploads/p1.jpg"])).toBe(false);
  });
});
