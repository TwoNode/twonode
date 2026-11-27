import { describe, expect, it } from "vitest";
import {
  ACCOUNT_CLOSURE_BLOCKED,
  ACCOUNT_CLOSURE_ERASED_AND_KEPT,
  LEGAL_CONTACT_EMAIL,
  LEGAL_VERSION,
  SURFBOARD_PRIVACY,
  SURFBOARD_PRIVACY_PATH,
  SURFBOARD_SUPPORT_PATH,
  SURFBOARD_TERMS,
  SURFBOARD_TERMS_PATH,
} from "../surfboard";
import {
  SURFBOARD_SUPPORT,
  SURFBOARD_SUPPORT_DELETE_SUBJECT,
} from "../surfboardSupport";

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

  it("the privacy policy says what the map features send to Google, and points to Google's own terms (I-067)", () => {
    const text = JSON.stringify(SURFBOARD_PRIVACY);
    // What goes to Google: a position, searches and taps, through our server.
    expect(text).toContain("position of your phone");
    expect(text).toContain("the words you type");
    expect(text).toContain("the point you tapped");
    expect(text).toContain("Google Maps Platform");
    // That our application keeps none of it, and that the hosting provider may.
    expect(text).toContain("Our application does not store them");
    expect(text).toContain("hosting provider");
    // Google's terms ask that its terms and privacy policy are linked.
    expect(text).toContain("https://policies.google.com/privacy");
    expect(text).toContain(
      "https://www.google.com/intl/en-US_US/help/terms_maps/"
    );
  });

  it("the pages are where the register form and the footer point", () => {
    expect(SURFBOARD_PRIVACY_PATH).toBe("/surfboard/privacy");
    expect(SURFBOARD_TERMS_PATH).toBe("/surfboard/terms");
    expect(LEGAL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("the support page is where the stores and the footer point", () => {
    expect(SURFBOARD_SUPPORT_PATH).toBe("/surfboard/support");
  });

  describe("the support page (Apple's support address, Google Play's account-deletion address; I-063)", () => {
    const text = JSON.stringify(SURFBOARD_SUPPORT);
    const sectionText = (heading: string) => {
      const section = SURFBOARD_SUPPORT.sections.find(
        (s) => s.heading === heading
      );
      expect(section).toBeDefined();
      return [...(section?.paragraphs ?? []), ...(section?.items ?? [])];
    };

    it("names the app and the company, and gives the support email", () => {
      expect(SURFBOARD_SUPPORT.title).toContain("Surfboard");
      expect(SURFBOARD_SUPPORT.intro).toContain("TwoNode Technologies Ltd.");
      expect(text).toContain(LEGAL_CONTACT_EMAIL);
    });

    it("walks through deleting the account in the app with the app's own labels", () => {
      const steps = sectionText("Delete your account in the app").join("\n");
      expect(steps).toContain("Profile");
      expect(steps).toContain("Account section");
      expect(steps).toContain("Delete account");
      expect(steps).toContain("password");
      // The checkbox and the final button of src/app/delete-account.tsx in the app.
      expect(steps).toContain(
        "I understand my account will be deleted for good."
      );
      expect(steps).toContain("Delete my account");
    });

    it("uses the Privacy Policy's own words for what is erased, what is kept and what blocks it", () => {
      const said = sectionText("What deleting erases, and what we keep");
      expect(said).toEqual([
        ACCOUNT_CLOSURE_ERASED_AND_KEPT,
        ACCOUNT_CLOSURE_BLOCKED,
      ]);
      const privacy = SURFBOARD_PRIVACY.sections.flatMap((s) => [
        ...(s.paragraphs ?? []),
        ...(s.items ?? []),
      ]);
      expect(privacy).toContain(ACCOUNT_CLOSURE_ERASED_AND_KEPT);
      expect(privacy).toContain(ACCOUNT_CLOSURE_BLOCKED);
    });

    it("tells someone who cannot open the app how to ask for deletion by email", () => {
      const how = sectionText("If you cannot open the app").join("\n");
      expect(how).toContain(LEGAL_CONTACT_EMAIL);
      expect(how).toContain(SURFBOARD_SUPPORT_DELETE_SUBJECT);
      expect(how).toContain("confirm it is you");
    });

    it("has no placeholder left and points to the Privacy Policy for the other rights", () => {
      expect(text).not.toMatch(/TODO|TBD|XXX|lorem/i);
      expect(text).toContain(SURFBOARD_PRIVACY_PATH);
    });
  });
});
