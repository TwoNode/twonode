import { describe, expect, it } from "vitest";
import { canAccessRoute, getNavItemsForRole } from "@/surfboard/access/routes";
import { SurfboardRole } from "@/utils/platform";

/**
 * Pure functions, no Prisma/mocking needed. Weighted toward the MDA branch
 * since that's the real gap this registry closes — proxy.ts used to let any
 * MDA role reach any stage page (blocked only client-side by which links
 * the layout happened to render); these cases assert the wrong-stage case
 * is rejected at the access-check level itself, which proxy.ts now calls
 * directly instead of its own hand-rolled `pathname.includes` checks.
 */

describe("canAccessRoute — admin panel", () => {
  it("allows ADMIN and SUPERADMIN into the admin home and sub-pages", () => {
    expect(canAccessRoute("/surfboard-restricted/dashboard", SurfboardRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/surfboard-restricted/dashboard/surf-plans", SurfboardRole.SUPERADMIN)).toBe(true);
  });

  it("rejects a plain surveyor from the admin panel", () => {
    expect(canAccessRoute("/surfboard-restricted/dashboard", SurfboardRole.USER)).toBe(false);
  });

  it("restricts /superadmin and /audit-logs to SUPERADMIN only, even though the longer path shares the /dashboard prefix with ADMIN-accessible pages", () => {
    expect(canAccessRoute("/surfboard-restricted/dashboard/superadmin", SurfboardRole.SUPERADMIN)).toBe(true);
    expect(canAccessRoute("/surfboard-restricted/dashboard/superadmin", SurfboardRole.ADMIN)).toBe(false);
    expect(canAccessRoute("/surfboard-restricted/dashboard/audit-logs", SurfboardRole.ADMIN)).toBe(false);
  });

  it("resolves a nested id page (.../surf-plans/update/[id]) to its parent entry's role requirement", () => {
    expect(canAccessRoute("/surfboard-restricted/dashboard/surf-plans/update/abc123", SurfboardRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/surfboard-restricted/dashboard/surf-plans/update/abc123", SurfboardRole.USER)).toBe(false);
  });
});

describe("canAccessRoute — user (surveyor) panel", () => {
  it("matches permissions.ts's canAccessSurfUserPanel: USER, ADMIN, and SUPERADMIN can all reach it", () => {
    expect(canAccessRoute("/surfboard/dashboard/plans", SurfboardRole.USER)).toBe(true);
    expect(canAccessRoute("/surfboard/dashboard/plans", SurfboardRole.ADMIN)).toBe(true);
    expect(canAccessRoute("/surfboard/dashboard/plans", SurfboardRole.SUPERADMIN)).toBe(true);
  });

  it("rejects an MDA stage role from the surveyor panel", () => {
    expect(canAccessRoute("/surfboard/dashboard/plans", SurfboardRole.CHARTING)).toBe(false);
  });
});

describe("canAccessRoute — MDA panel (the real gap this registry closes)", () => {
  it("lets a stage role reach only its own stage page", () => {
    expect(canAccessRoute("/surfboard-mda/dashboard/charting", SurfboardRole.CHARTING)).toBe(true);
    expect(canAccessRoute("/surfboard-mda/dashboard/accounts", SurfboardRole.CHARTING)).toBe(false);
    expect(canAccessRoute("/surfboard-mda/dashboard/surcon", SurfboardRole.CHARTING)).toBe(false);
  });

  it("lets every stage role reach the shared home/profile/settings pages", () => {
    expect(canAccessRoute("/surfboard-mda/dashboard", SurfboardRole.ARCHIVE)).toBe(true);
    expect(canAccessRoute("/surfboard-mda/dashboard/profile", SurfboardRole.INTAKE)).toBe(true);
    expect(canAccessRoute("/surfboard-mda/dashboard/settings", SurfboardRole.RECORDS_I)).toBe(true);
  });

  it("lets MDA_SUPERADMIN and platform SUPERADMIN reach every stage — matches the source's supervisory override, not just the stage-holder", () => {
    for (const stage of ["accounts", "charting", "surcon", "intake", "records-i", "records-ii", "archive"]) {
      expect(canAccessRoute(`/surfboard-mda/dashboard/${stage}`, SurfboardRole.MDA_SUPERADMIN)).toBe(true);
      expect(canAccessRoute(`/surfboard-mda/dashboard/${stage}`, SurfboardRole.SUPERADMIN)).toBe(true);
    }
  });

  it("rejects a plain ADMIN (not SUPERADMIN) and a surveyor from every MDA page", () => {
    expect(canAccessRoute("/surfboard-mda/dashboard/accounts", SurfboardRole.ADMIN)).toBe(false);
    expect(canAccessRoute("/surfboard-mda/dashboard", SurfboardRole.USER)).toBe(false);
  });
});

describe("canAccessRoute — unmatched paths", () => {
  it("an unlisted subpath under a registered base falls back to that base entry's role requirement (matches proxy.ts's pre-migration pathname.startsWith behavior)", () => {
    expect(canAccessRoute("/surfboard/dashboard/some-new-page-not-yet-in-the-registry", SurfboardRole.USER)).toBe(true);
    expect(canAccessRoute("/surfboard/dashboard/some-new-page-not-yet-in-the-registry", SurfboardRole.CHARTING)).toBe(false);
  });

  it("rejects a path with no registered ancestor at all, for any role", () => {
    expect(canAccessRoute("/surfboard/some-unrelated-tree-with-no-base-entry", SurfboardRole.USER)).toBe(false);
    expect(canAccessRoute("/surfboard/some-unrelated-tree-with-no-base-entry", SurfboardRole.SUPERADMIN)).toBe(false);
  });
});

describe("getNavItemsForRole", () => {
  it("a Charting officer's MDA nav includes their own stage plus the shared pages, and excludes every other stage", () => {
    const items = getNavItemsForRole(SurfboardRole.CHARTING, "mda").map((r) => r.path);
    expect(items).toContain("/surfboard-mda/dashboard/charting");
    expect(items).toContain("/surfboard-mda/dashboard/profile");
    expect(items).not.toContain("/surfboard-mda/dashboard/accounts");
    expect(items).not.toContain("/surfboard-mda/dashboard/surcon");
  });

  it("MDA_SUPERADMIN's nav includes every stage", () => {
    const items = getNavItemsForRole(SurfboardRole.MDA_SUPERADMIN, "mda").map((r) => r.path);
    for (const stage of ["accounts", "charting", "surcon", "intake", "records-i", "records-ii", "archive"]) {
      expect(items).toContain(`/surfboard-mda/dashboard/${stage}`);
    }
  });

  it("a plain USER's admin-group nav is empty (they can't reach the admin panel at all)", () => {
    expect(getNavItemsForRole(SurfboardRole.USER, "admin")).toEqual([]);
  });
});
