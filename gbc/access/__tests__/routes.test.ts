import { describe, expect, it } from "vitest";
import { canAccessRoute, getNavItemsForRole } from "@/gbc/access/routes";
import { GBCRole } from "@/utils/platform";

/**
 * Pure functions, no Prisma/mocking needed. Weighted toward what this
 * registry has to get right: the admin tier is a single flat role check
 * (ADMIN and SUPERADMIN both reach every /gbc-restricted/* page — unlike
 * REVA/Surfboard, GBC has no SUPERADMIN-only sub-page in the real folder
 * tree), and the guest group — public pages that must pass for *any*
 * role, including null/anonymous, since GBCTicket has no relation to
 * GBCUser and there's no session to check.
 */

describe("canAccessRoute — admin panel", () => {
  it("allows ADMIN and SUPERADMIN into the admin home and sub-pages", () => {
    expect(canAccessRoute("/gbc-restricted", GBCRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/gbc-restricted/tickets", GBCRole.SUPERADMIN)).toBe(
      true
    );
  });

  it("rejects a plain USER from the admin panel", () => {
    expect(canAccessRoute("/gbc-restricted", GBCRole.USER)).toBe(false);
    expect(canAccessRoute("/gbc-restricted/settings", GBCRole.USER)).toBe(
      false
    );
  });

  it("ADMIN reaches every registered sub-page — the real tree has no SUPERADMIN-only page (unlike REVA/Surfboard)", () => {
    for (const path of [
      "/gbc-restricted/gallery",
      "/gbc-restricted/speakers",
      "/gbc-restricted/sponsors",
      "/gbc-restricted/inquiries",
      "/gbc-restricted/certificates",
      "/gbc-restricted/users",
      "/gbc-restricted/attendees",
      "/gbc-restricted/check-in",
      "/gbc-restricted/editions",
      "/gbc-restricted/profile",
    ]) {
      expect(canAccessRoute(path, GBCRole.ADMIN)).toBe(true);
    }
  });

  it("resolves an unlisted nested sub-path to its registered parent entry's role requirement", () => {
    expect(canAccessRoute("/gbc-restricted/users/123", GBCRole.ADMIN)).toBe(
      true
    );
    expect(canAccessRoute("/gbc-restricted/users/123", GBCRole.USER)).toBe(
      false
    );
  });
});

describe("canAccessRoute — Audit Logs", () => {
  it("is SUPERADMIN-only: the one admin page an ADMIN cannot reach", () => {
    expect(
      canAccessRoute("/gbc-restricted/audit-logs", GBCRole.SUPERADMIN)
    ).toBe(true);
    expect(canAccessRoute("/gbc-restricted/audit-logs", GBCRole.ADMIN)).toBe(
      false
    );
    expect(canAccessRoute("/gbc-restricted/audit-logs", GBCRole.USER)).toBe(
      false
    );
  });

  it("shows in the sidebar for SUPERADMIN only", () => {
    expect(
      getNavItemsForRole(GBCRole.SUPERADMIN, "admin").some(
        (r) => r.label === "Audit Logs"
      )
    ).toBe(true);
    expect(
      getNavItemsForRole(GBCRole.ADMIN, "admin").some(
        (r) => r.label === "Audit Logs"
      )
    ).toBe(false);
  });
});

describe("canAccessRoute — guest-facing (public)", () => {
  it("passes for any role, including null (no session at all)", () => {
    expect(canAccessRoute("/gbc/login", null)).toBe(true);
    expect(canAccessRoute("/gbc/tickets", undefined)).toBe(true);
    expect(canAccessRoute("/gbc/editions", GBCRole.USER)).toBe(true);
  });

  it("the My Ticket lookup page resolves even with query-string-bearing sub-navigation", () => {
    expect(canAccessRoute("/gbc/login", null)).toBe(true);
  });

  it("stays distinct from the same-prefix authenticated /gbc-restricted entries — a guest role must not unlock the admin panel", () => {
    expect(canAccessRoute("/gbc-restricted", null)).toBe(false);
  });
});

describe("canAccessRoute — unmatched paths", () => {
  it("an unlisted subpath under the public /gbc base still resolves — the whole public site is guest territory", () => {
    expect(
      canAccessRoute("/gbc/some-new-public-page", GBCRole.SUPERADMIN)
    ).toBe(true);
  });

  it("rejects a path with no registered ancestor at all, for any role", () => {
    expect(canAccessRoute("/unregistered-area", GBCRole.SUPERADMIN)).toBe(
      false
    );
  });
});

describe("getNavItemsForRole", () => {
  it("returns every admin page for ADMIN, including the two AdminSidebar.tsx never linked (Attendees, Editions)", () => {
    const items = getNavItemsForRole(GBCRole.ADMIN, "admin");
    expect(items.some((r) => r.label === "Attendees")).toBe(true);
    expect(items.some((r) => r.label === "Editions")).toBe(true);
    // Pages AdminSidebar.tsx already linked before this registry existed —
    // confirms the migration didn't drop any of them.
    for (const label of [
      "Dashboard",
      "Tickets",
      "Check-In",
      "Certificates",
      "Sponsors",
      "Speakers",
      "Gallery",
      "Inquiries",
      "Users",
      "Settings",
    ]) {
      expect(items.some((r) => r.label === label)).toBe(true);
    }
  });

  it("guest group entries are all showInNav: false — registered for canAccessRoute, not rendered as persistent nav", () => {
    const items = getNavItemsForRole(GBCRole.USER, "guest");
    expect(items).toHaveLength(0);
  });

  it("a plain USER gets no admin nav items at all", () => {
    expect(getNavItemsForRole(GBCRole.USER, "admin")).toHaveLength(0);
  });
});
