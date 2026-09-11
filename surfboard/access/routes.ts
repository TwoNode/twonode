import type { LucideIcon } from "lucide-react";
import {
  Home,
  ListChecks,
  Map,
  MapPin,
  Shield,
  Bell,
  Award,
  Receipt,
  Cog,
  QrCode,
  FileText,
  FileCheck2,
  FilePlus2,
  Wallet,
  Compass,
  BadgeCheck,
  Inbox,
  Archive,
  UserCircle,
  CreditCard,
  Share2,
  AlertTriangle,
  Wrench,
  ShieldAlert,
} from "lucide-react";
import { SurfboardRole } from "@/utils/platform";

/**
 * Single source of truth for Surfboard's routes: what nav items render, and
 * which roles can reach them. Extended in Phase 2 from Phase 1's pilot
 * scope (admin + QR-earnings only) to the full product — user panel and
 * MDA tree included — now that proxy.ts itself reads this registry instead
 * of its own hand-rolled path/role matching (see proxy.ts's Surfboard
 * branch). Base paths renamed per proposal §4.8 (`surf-restricted` ->
 * `surfboard-restricted`, `surf-mda` -> `surfboard-mda`); the Kinde OAuth
 * callback routes (`/api/auth/success/surf-restricted`, `/surf-mda`) keep
 * their old names deliberately — those are registered redirect URIs in
 * Kinde's own dashboard, which only the account owner can update, so
 * renaming those folders would break login until that manual step happens.
 */

export type SurfboardRouteGroup = "admin" | "user" | "mda";

export interface SurfboardRouteEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: SurfboardRole[];
  group: SurfboardRouteGroup;
  /** Visual sidebar section heading — display-only, no bearing on access control. */
  section?: string;
  /** Section starts collapsed on first visit (still one click away) — for less-frequently-used groups, so the sidebar's default view is shorter. */
  sectionCollapsedByDefault?: boolean;
}

const ADMIN_ROLES = [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN];
const SUPERADMIN_ONLY = [SurfboardRole.SUPERADMIN];
/** Matches permissions.ts's canAccessSurfUserPanel exactly — ADMIN/SUPERADMIN can also reach the surveyor panel, not USER alone. */
const USER_PANEL_ROLES = [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN];

/** Every MDA stage role, matching planLockService.ts's canonical list (minus MDA_SUPERADMIN, added per-entry below alongside the stage it can view). */
const MDA_STAGE_ROLES = [
  SurfboardRole.ACCOUNTS,
  SurfboardRole.CHARTING,
  SurfboardRole.SURCON,
  SurfboardRole.RECORDS_I,
  SurfboardRole.INTAKE,
  SurfboardRole.RECORDS_II,
  SurfboardRole.ARCHIVE,
];
/** Both supervisory roles see every MDA stage — matches proxy.ts's source logic, which lets plain platform SUPERADMIN into every /surfboard-mda page unconditionally, not just MDA_SUPERADMIN. */
const MDA_SUPERVISORS = [SurfboardRole.MDA_SUPERADMIN, SurfboardRole.SUPERADMIN];
const ALL_MDA_ROLES = [...MDA_STAGE_ROLES, ...MDA_SUPERVISORS];

const ADMIN_BASE = "/surfboard-restricted/dashboard";
const USER_BASE = "/surfboard/dashboard";
const MDA_BASE = "/surfboard-mda/dashboard";

export const SURFBOARD_ROUTES: SurfboardRouteEntry[] = [
  // --- Admin panel (ADMIN/SUPERADMIN) ---
  { path: ADMIN_BASE, label: "Home", icon: Home, roles: ADMIN_ROLES, group: "admin", section: "Overview" },
  { path: `${ADMIN_BASE}/surf-plans`, label: "Surf Plans", icon: ListChecks, roles: ADMIN_ROLES, group: "admin", section: "Plans" },
  { path: `${ADMIN_BASE}/map`, label: "Map Viewer", icon: Map, roles: ADMIN_ROLES, group: "admin", section: "Plans" },
  { path: `${ADMIN_BASE}/secure-plans`, label: "Secure Plans", icon: ShieldAlert, roles: ADMIN_ROLES, group: "admin", section: "Plans" },
  { path: `${ADMIN_BASE}/user-management`, label: "User Management", icon: ListChecks, roles: ADMIN_ROLES, group: "admin", section: "Operations" },
  { path: `${ADMIN_BASE}/kyc`, label: "Surveyor's KYC", icon: Shield, roles: ADMIN_ROLES, group: "admin", section: "Operations" },
  { path: `${ADMIN_BASE}/certificates`, label: "Certificates", icon: Award, roles: ADMIN_ROLES, group: "admin", section: "Operations" },
  { path: `${ADMIN_BASE}/cod/batches`, label: "Certificate of Deposit", icon: Receipt, roles: ADMIN_ROLES, group: "admin", section: "Operations" },
  { path: `${ADMIN_BASE}/qr-earnings`, label: "QR Earnings", icon: QrCode, roles: ADMIN_ROLES, group: "admin", section: "Operations" },
  { path: `${ADMIN_BASE}/analytics`, label: "Analytics", icon: Cog, roles: ADMIN_ROLES, group: "admin", section: "Insights", sectionCollapsedByDefault: true },
  { path: `${ADMIN_BASE}/audit-logs`, label: "Audit Logs", icon: FileText, roles: SUPERADMIN_ONLY, group: "admin", section: "Insights", sectionCollapsedByDefault: true },
  { path: `${ADMIN_BASE}/notifications`, label: "Notifications", icon: Bell, roles: ADMIN_ROLES, group: "admin", section: "System", sectionCollapsedByDefault: true },
  { path: `${ADMIN_BASE}/settings`, label: "Settings", icon: Cog, roles: ADMIN_ROLES, group: "admin", section: "System", sectionCollapsedByDefault: true },
  { path: `${ADMIN_BASE}/admin-tools`, label: "Admin Tools", icon: Wrench, roles: ADMIN_ROLES, group: "admin", section: "System", sectionCollapsedByDefault: true },
  { path: `${ADMIN_BASE}/superadmin`, label: "Superadmin", icon: ShieldAlert, roles: SUPERADMIN_ONLY, group: "admin", section: "System", sectionCollapsedByDefault: true },

  // --- User (surveyor) panel ---
  { path: USER_BASE, label: "Home", icon: Home, roles: USER_PANEL_ROLES, group: "user", section: "Overview" },
  { path: `${USER_BASE}/plans`, label: "My Plans", icon: ListChecks, roles: USER_PANEL_ROLES, group: "user", section: "Plans" },
  { path: `${USER_BASE}/plan`, label: "Plan", icon: FileText, roles: USER_PANEL_ROLES, group: "user", section: "Plans" },
  { path: `${USER_BASE}/newplan`, label: "New Plan", icon: FilePlus2, roles: USER_PANEL_ROLES, group: "user", section: "Plans" },
  { path: `${USER_BASE}/queried-plans`, label: "Queried Plans", icon: AlertTriangle, roles: USER_PANEL_ROLES, group: "user", section: "Plans" },
  { path: `${USER_BASE}/shared`, label: "Shared With Me", icon: Share2, roles: USER_PANEL_ROLES, group: "user", section: "Plans" },
  { path: `${USER_BASE}/map`, label: "Map", icon: Map, roles: USER_PANEL_ROLES, group: "user", section: "Map" },
  { path: `${USER_BASE}/viewmap`, label: "View Map", icon: MapPin, roles: USER_PANEL_ROLES, group: "user", section: "Map" },
  { path: `${USER_BASE}/spcode-verification`, label: "SP Code Verification", icon: BadgeCheck, roles: USER_PANEL_ROLES, group: "user", section: "Map" },
  { path: `${USER_BASE}/qr-earnings`, label: "QR Earnings", icon: QrCode, roles: USER_PANEL_ROLES, group: "user", section: "Account" },
  { path: `${USER_BASE}/subscription`, label: "Subscription", icon: CreditCard, roles: USER_PANEL_ROLES, group: "user", section: "Account" },
  { path: `${USER_BASE}/payment`, label: "Payment", icon: CreditCard, roles: USER_PANEL_ROLES, group: "user", section: "Account" },
  { path: `${USER_BASE}/notifications`, label: "Notifications", icon: Bell, roles: USER_PANEL_ROLES, group: "user", section: "Account" },
  { path: `${USER_BASE}/settings`, label: "Settings", icon: Cog, roles: USER_PANEL_ROLES, group: "user", section: "Account" },

  // --- MDA panel — real gap closed here: each stage entry restricts to its
  // own stage role (+ MDA_SUPERADMIN, the supervisory role that sees every
  // stage), where the source layout showed all 7 links to every MDA user
  // regardless of role and relied on proxy.ts alone to block the click.
  { path: MDA_BASE, label: "Home", icon: Home, roles: ALL_MDA_ROLES, group: "mda" },
  { path: `${MDA_BASE}/accounts`, label: "Accounts", icon: Wallet, roles: [SurfboardRole.ACCOUNTS, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/charting`, label: "Charting", icon: Compass, roles: [SurfboardRole.CHARTING, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/surcon`, label: "SURCON", icon: BadgeCheck, roles: [SurfboardRole.SURCON, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/intake`, label: "Intake", icon: Inbox, roles: [SurfboardRole.INTAKE, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/records-i`, label: "Records I", icon: FileText, roles: [SurfboardRole.RECORDS_I, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/records-ii`, label: "Records II", icon: FileCheck2, roles: [SurfboardRole.RECORDS_II, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/archive`, label: "Archive", icon: Archive, roles: [SurfboardRole.ARCHIVE, ...MDA_SUPERVISORS], group: "mda" },
  { path: `${MDA_BASE}/notifications`, label: "Notifications", icon: Bell, roles: ALL_MDA_ROLES, group: "mda" },
  { path: `${MDA_BASE}/profile`, label: "Profile", icon: UserCircle, roles: ALL_MDA_ROLES, group: "mda" },
  { path: `${MDA_BASE}/settings`, label: "Settings", icon: Cog, roles: ALL_MDA_ROLES, group: "mda" },
];

/**
 * Longest-prefix match (mirrors proxy.ts's existing pathname.startsWith
 * convention) so a nested page like .../surf-plans/[id] resolves to the
 * .../surf-plans entry's role requirement. SUPERADMIN and MDA_SUPERADMIN
 * are platform-wide overrides for their respective trees (admin/user vs.
 * mda) — matching the source's own asymmetry, not added indiscriminately:
 * SUPERADMIN already sits in every admin-group `roles` array by data
 * (ADMIN_ROLES), and MDA_SUPERADMIN sits in every mda-group entry the same
 * way, so no extra override logic is needed here beyond the data itself.
 */
export function canAccessRoute(
  path: string,
  role: string | null | undefined
): boolean {
  const entry = [...SURFBOARD_ROUTES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((r) => path === r.path || path.startsWith(`${r.path}/`));
  if (!entry) return false;
  return entry.roles.includes(role as SurfboardRole);
}

export function getNavItemsForRole(
  role: string | null | undefined,
  group: SurfboardRouteGroup
): SurfboardRouteEntry[] {
  return SURFBOARD_ROUTES.filter(
    (r) => r.group === group && r.roles.includes(role as SurfboardRole)
  );
}
