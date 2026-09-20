import { describe, expect, it } from "vitest";
import { getInitials, roleLabel, timeGreeting } from "@/reva/utils/welcome";

describe("timeGreeting", () => {
  it("switches at noon and at 5pm", () => {
    expect(timeGreeting(0)).toBe("Good morning");
    expect(timeGreeting(11)).toBe("Good morning");
    expect(timeGreeting(12)).toBe("Good afternoon");
    expect(timeGreeting(16)).toBe("Good afternoon");
    expect(timeGreeting(17)).toBe("Good evening");
    expect(timeGreeting(23)).toBe("Good evening");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first and last name, capitalised", () => {
    expect(getInitials("ada", "okoro")).toBe("AO");
  });

  it("copes with a single name, blanks and stray whitespace", () => {
    expect(getInitials("Ada", "")).toBe("A");
    expect(getInitials("  Ada ", "  Okoro")).toBe("AO");
    expect(getInitials(null, "Okoro")).toBe("O");
  });

  it("is empty — not a made-up letter — when there is no name", () => {
    expect(getInitials("", "")).toBe("");
    expect(getInitials(undefined, undefined)).toBe("");
    expect(getInitials("   ", null)).toBe("");
  });
});

describe("roleLabel", () => {
  it("names each REVA role in words, whatever the casing", () => {
    expect(roleLabel("SUPERADMIN")).toBe("Superadmin");
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("USER")).toBe("Member");
  });

  it("returns null for an unknown or missing role so no chip is shown", () => {
    expect(roleLabel("SURVEYOR")).toBeNull();
    expect(roleLabel(undefined)).toBeNull();
    expect(roleLabel(null)).toBeNull();
  });
});
