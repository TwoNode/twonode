import { describe, expect, it } from "vitest";
import { canAccessRoute, getNavItemsForRole } from "@/reva/access/routes";
import { RevaRole } from "@/utils/platform";

/**
 * Pure functions, no Prisma/mocking needed. Weighted toward the two things
 * this registry has to get right that a naive port wouldn't: SUPERADMIN-only
 * pages sharing the /dashboard prefix with ADMIN-accessible ones (the same
 * shape as Surfboard's registry), and the new "guest" group — public pages
 * that need to pass for *any* role, including null/anonymous, since that's
 * how they behave in the real app (reference+email is the auth, not a
 * session).
 */

describe("canAccessRoute — admin panel", () => {
  it("allows ADMIN and SUPERADMIN into the admin home and sub-pages", () => {
    expect(canAccessRoute("/reva-restricted/dashboard", RevaRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/reva-restricted/dashboard/review", RevaRole.SUPERADMIN)).toBe(true);
  });

  it("rejects a plain USER from the admin panel", () => {
    expect(canAccessRoute("/reva-restricted/dashboard", RevaRole.USER)).toBe(false);
  });

  it("restricts /superadmin to SUPERADMIN only, even though the longer path shares the /dashboard prefix with ADMIN-accessible pages", () => {
    expect(canAccessRoute("/reva-restricted/dashboard/superadmin", RevaRole.SUPERADMIN)).toBe(true);
    expect(canAccessRoute("/reva-restricted/dashboard/superadmin", RevaRole.ADMIN)).toBe(false);
  });

  it("/notifications is ADMIN-accessible, not SUPERADMIN-only — the source's proxy.ts already let a plain ADMIN reach it directly, only the sidebar link was SUPERADMIN-only", () => {
    expect(canAccessRoute("/reva-restricted/dashboard/notifications", RevaRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/reva-restricted/dashboard/notifications", RevaRole.SUPERADMIN)).toBe(true);
    expect(canAccessRoute("/reva-restricted/dashboard/notifications", RevaRole.USER)).toBe(false);
  });

  it("resolves a nested reference page (.../details?reference=...) to its parent entry's role requirement", () => {
    expect(canAccessRoute("/reva-restricted/dashboard/details", RevaRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/reva-restricted/dashboard/details", RevaRole.USER)).toBe(false);
  });
});

describe("canAccessRoute — user panel", () => {
  it("matches permissions.ts's canAccessRevaUserPanel: USER, ADMIN, and SUPERADMIN can all reach it", () => {
    expect(canAccessRoute("/reva/dashboard/allrequests", RevaRole.USER)).toBe(true);
    expect(canAccessRoute("/reva/dashboard/allrequests", RevaRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/reva/dashboard/allrequests", RevaRole.SUPERADMIN)).toBe(true);
  });
});

describe("canAccessRoute — guest-facing (public)", () => {
  it("passes for any role, including null (no session at all)", () => {
    expect(canAccessRoute("/reva/onetimerequest", null)).toBe(true);
    expect(canAccessRoute("/reva/requestform", undefined)).toBe(true);
    expect(canAccessRoute("/reva/verifypayment", RevaRole.USER)).toBe(true);
  });

  it("a nested query-string-bearing page (details?reference=&email=) still resolves via prefix match", () => {
    expect(canAccessRoute("/reva/details", null)).toBe(true);
  });

  it("stays distinct from the same-named authenticated /reva/dashboard/details entry — a guest role must not unlock the user-panel page", () => {
    expect(canAccessRoute("/reva/dashboard/details", null)).toBe(false);
  });
});

describe("canAccessRoute — unmatched paths", () => {
  it("an unlisted subpath under a registered base falls back to that base entry's role requirement", () => {
    expect(canAccessRoute("/reva/dashboard/some-new-page-not-yet-in-the-registry", RevaRole.USER)).toBe(true);
  });

  it("rejects a path with no registered ancestor at all, for any role", () => {
    expect(canAccessRoute("/reva/unregistered-area", RevaRole.SUPERADMIN)).toBe(false);
  });
});

describe("getNavItemsForRole", () => {
  it("excludes showInNav: false entries even when the role would otherwise have access", () => {
    const items = getNavItemsForRole(RevaRole.ADMIN, "admin");
    expect(items.some((r) => r.path.endsWith("/details"))).toBe(false);
  });

  it("ADMIN now sees the Notifications shortcut too (a real UI gap this registry closes — see routes.ts's comment), but not the SUPERADMIN-only Superadmin shortcut", () => {
    const adminItems = getNavItemsForRole(RevaRole.ADMIN, "admin");
    const superadminItems = getNavItemsForRole(RevaRole.SUPERADMIN, "admin");
    expect(adminItems.some((r) => r.label === "Notifications")).toBe(true);
    expect(adminItems.some((r) => r.label === "Superadmin")).toBe(false);
    expect(superadminItems.some((r) => r.label === "Superadmin")).toBe(true);
  });

  it("user panel nav excludes the header-bell-only notifications page and the Paystack redirect target", () => {
    const items = getNavItemsForRole(RevaRole.USER, "user");
    expect(items.some((r) => r.label === "Notifications")).toBe(false);
    expect(items.some((r) => r.label === "Verify Payment")).toBe(false);
  });
});
