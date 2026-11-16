import { describe, expect, it } from "vitest";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_VERSION,
  SURFBOARD_PRIVACY,
  SURFBOARD_PRIVACY_PATH,
  SURFBOARD_TERMS,
  SURFBOARD_TERMS_PATH,
} from "../surfboard";

describe("Surfboard legal text", () => {
  it.each([
    ["privacy", SURFBOARD_PRIVACY],
    ["terms", SURFBOARD_TERMS],
  ])(
    "%s: every section has a heading and some content, with no placeholder left",
    (_n, doc) => {
      expect(doc.sections.length).toBeGreaterThan(5);
      const keys = new Set<string>();
      for (const s of doc.sections) {
        expect(s.heading.trim()).not.toBe("");
        expect(
          (s.paragraphs?.length ?? 0) + (s.items?.length ?? 0)
        ).toBeGreaterThan(0);
        expect(keys.has(s.heading)).toBe(false);
        keys.add(s.heading);
      }
      const text = [
        doc.intro,
        ...doc.sections.flatMap((s) => [
          s.heading,
          ...(s.paragraphs ?? []),
          ...(s.items ?? []),
        ]),
      ].join("\n");
      expect(text).not.toMatch(/\b(TODO|TBD)\b|lorem|\[[A-Za-z ]+\]/i);
    }
  );

  it("the privacy policy names the controller, the contact, the rights and the NDPA", () => {
    const text = JSON.stringify(SURFBOARD_PRIVACY);
    expect(text).toContain("7742902");
    expect(text).toContain(LEGAL_CONTACT_EMAIL);
    expect(text).toContain("Nigeria Data Protection Act 2023");
    expect(text).toContain("Nigeria Data Protection Commission");
  });

  it("the pages are where the register form and the footer point", () => {
    expect(SURFBOARD_PRIVACY_PATH).toBe("/surfboard/privacy");
    expect(SURFBOARD_TERMS_PATH).toBe("/surfboard/terms");
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
