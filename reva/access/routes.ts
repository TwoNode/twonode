import type { LucideIcon } from "lucide-react";
import {
  Home,
  ListChecks,
  Map,
  Settings,
  Shield,
  Bell,
  CreditCard,
  FilePlus,
  FileCheck2,
  FileText,
  ScrollText,
} from "lucide-react";
import { RevaRole } from "@/utils/platform";

/**
 * Single source of truth for REVA's routes: what nav items render, which
 * roles can reach them, and (via canAccessRoute) what proxy.ts gates on.
 * Same shape as surfboard/access/routes.ts, minus an MDA-equivalent group
 * (REVA only has the two role tiers Role = USER | ADMIN | SUPERADMIN maps
 * to) plus one REVA doesn't need: a "guest" group for the top-level pages
 * reachable with no login at all (reference+email is the auth), which
 * canAccessRoute treats as public via an empty `roles` array.
 *
 * `showInNav` (default true) exists because several real pages here are
 * detail/redirect targets, not persistent nav destinations — the current
 * layouts don't link to them from the sidebar (details is reached by
 * clicking into a specific request row; verifypayment is a Paystack
 * redirect target; notifications is reached via the header bell, except
 * the admin panel's existing SUPERADMIN-only sidebar shortcut, preserved
 * as-is). Marking them `showInNav: false` lets getNavItemsForRole produce
 * exactly today's sidebar arrays while still registering the paths for
 * proxy.ts's access check.
 */

export type RevaRouteGroup = "admin" | "user" | "guest";

export interface RevaRouteEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: RevaRole[];
  group: RevaRouteGroup;
  showInNav?: boolean;
  /** Visual sidebar section heading — display-only, no bearing on access control. */
  section?: string;
}

const ADMIN_ROLES = [RevaRole.ADMIN, RevaRole.SUPERADMIN];
const SUPERADMIN_ONLY = [RevaRole.SUPERADMIN];
/** Matches permissions.ts's canAccessRevaUserPanel exactly — admins can also reach the regular user panel, not USER alone. */
const USER_PANEL_ROLES = [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN];
/** Guest pages need no role at all — reference+email is the auth, same pattern as the API routes under these paths. */
const PUBLIC: RevaRole[] = [];

const ADMIN_BASE = "/reva-restricted/dashboard";
const USER_BASE = "/reva/dashboard";

export const REVA_ROUTES: RevaRouteEntry[] = [
  // --- Admin panel (ADMIN/SUPERADMIN) ---
  {
    path: ADMIN_BASE,
    label: "Home",
    icon: Home,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "Overview",
  },
  {
    path: `${ADMIN_BASE}/alluserrequests`,
    label: "All Requests",
    icon: ListChecks,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "Requests",
  },
  {
    path: `${ADMIN_BASE}/review`,
    label: "Review",
    icon: FileCheck2,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "Requests",
  },
  {
    path: `${ADMIN_BASE}/payment-verification`,
    label: "Payment Verification",
    icon: CreditCard,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "Requests",
  },
  {
    path: `${ADMIN_BASE}/spatial-record`,
    label: "Spatial Record",
    icon: Map,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "Records",
  },
  {
    path: `${ADMIN_BASE}/settings`,
    label: "Settings",
    icon: Settings,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "System",
  },
  // Sidebar shortcut shown only to SUPERADMIN today (revaAdminPanelLayout.tsx's existing canAccessRevaSuperAdminPanel conditional) — encoded here as a role restriction instead of a component-level check.
  {
    path: `${ADMIN_BASE}/audit-logs`,
    label: "Audit Logs",
    icon: ScrollText,
    roles: SUPERADMIN_ONLY,
    group: "admin",
    section: "System",
  },
  {
    path: `${ADMIN_BASE}/superadmin`,
    label: "Superadmin",
    icon: Shield,
    roles: SUPERADMIN_ONLY,
    group: "admin",
    section: "System",
  },
  // ADMIN_ROLES, not SUPERADMIN-only — a real mismatch found while wiring
  // proxy.ts to this registry: the source's proxy.ts already let a plain
  // ADMIN reach this page directly (only /superadmin got the stricter
  // gate), and the backend already serves an ADMIN-scoped notification set
  // (notificationService.ts's getAdminNotifications, distinct from
  // getSuperAdminNotifications) — only the sidebar *link* was hidden from
  // ADMIN. Matching the role here to what was already reachable and
  // already backed by real data, rather than encoding the sidebar's
  // narrower visibility as if it were the access boundary.
  {
    path: `${ADMIN_BASE}/notifications`,
    label: "Notifications",
    icon: Bell,
    roles: ADMIN_ROLES,
    group: "admin",
    section: "System",
  },
  // Reached by clicking into a specific request row, not a sidebar destination — not in the source's inventory list either (found reading the actual folder tree while building this registry).
  {
    path: `${ADMIN_BASE}/details`,
    label: "Request Details",
    icon: FileText,
    roles: ADMIN_ROLES,
    group: "admin",
    showInNav: false,
  },

  // --- User panel (USER, plus ADMIN/SUPERADMIN who can also reach it) ---
  {
    path: USER_BASE,
    label: "Home",
    icon: Home,
    roles: USER_PANEL_ROLES,
    group: "user",
    section: "Overview",
  },
  {
    path: `${USER_BASE}/allrequests`,
    label: "All Requests",
    icon: ListChecks,
    roles: USER_PANEL_ROLES,
    group: "user",
    section: "Requests",
  },
  {
    path: `${USER_BASE}/newrequest`,
    label: "New Request",
    icon: FilePlus,
    roles: USER_PANEL_ROLES,
    group: "user",
    section: "Requests",
  },
  {
    path: `${USER_BASE}/viewmap`,
    label: "View Map",
    icon: Map,
    roles: USER_PANEL_ROLES,
    group: "user",
    section: "Records",
  },
  {
    path: `${USER_BASE}/settings`,
    label: "Settings",
    icon: Settings,
    roles: USER_PANEL_ROLES,
    group: "user",
    section: "System",
  },
  // Reached via the header notification bell, not the sidebar.
  {
    path: `${USER_BASE}/notifications`,
    label: "Notifications",
    icon: Bell,
    roles: USER_PANEL_ROLES,
    group: "user",
    showInNav: false,
  },
  // Paystack redirect target, not a sidebar destination.
  {
    path: `${USER_BASE}/verifypayment`,
    label: "Verify Payment",
    icon: CreditCard,
    roles: USER_PANEL_ROLES,
    group: "user",
    showInNav: false,
  },
  // Reached by clicking into a specific request row, not a sidebar destination.
  {
    path: `${USER_BASE}/details`,
    label: "Request Details",
    icon: FileText,
    roles: USER_PANEL_ROLES,
    group: "user",
    showInNav: false,
  },

  // --- Guest-facing (public — reference+email is the auth, not a role) ---
  {
    path: "/reva/verifypayment",
    label: "Verify Payment",
    icon: CreditCard,
    roles: PUBLIC,
    group: "guest",
    showInNav: false,
  },
  {
    path: "/reva/details",
    label: "Request Details",
    icon: FileText,
    roles: PUBLIC,
    group: "guest",
    showInNav: false,
  },
  {
    path: "/reva/onetimerequest",
    label: "Track Request",
    icon: FileCheck2,
    roles: PUBLIC,
    group: "guest",
    showInNav: false,
  },
  {
    path: "/reva/requestform",
    label: "New Request",
    icon: FilePlus,
    roles: PUBLIC,
    group: "guest",
    showInNav: false,
  },
];

/**
 * Longest-prefix match (mirrors surfboard/access/routes.ts's convention).
 * An empty `roles` array marks a public/guest route — accessible
 * regardless of role, including an anonymous/null caller.
 */
export function canAccessRoute(
  path: string,
  role: string | null | undefined
): boolean {
  const entry = [...REVA_ROUTES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((r) => path === r.path || path.startsWith(`${r.path}/`));
  if (!entry) return false;
  if (entry.roles.length === 0) return true;
  return entry.roles.includes(role as RevaRole);
}

export function getNavItemsForRole(
  role: string | null | undefined,
  group: RevaRouteGroup
): RevaRouteEntry[] {
  return REVA_ROUTES.filter(
    (r) =>
      r.group === group &&
      r.showInNav !== false &&
      r.roles.includes(role as RevaRole)
  );
}
