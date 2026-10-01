import type { LucideIcon } from "lucide-react";
import {
  Home,
  LayoutDashboard,
  Ticket,
  QrCode,
  UserCheck,
  Users,
  Calendar,
  Settings,
  Image,
  Images,
  Mic,
  Award,
  Building2,
  MessageSquare,
  FileCheck2,
  FileText,
  ScrollText,
  Info,
  Mail,
  Search,
  Bell,
  User,
} from "lucide-react";
import { GBCRole } from "@/utils/platform";

/**
 * Single source of truth for GBC's routes: what nav items render, which
 * roles can reach them, and (via canAccessRoute) what proxy.ts gates on.
 * Same shape as reva/access/routes.ts, minus a "user" group — GBC ticket
 * holders never get an account (GBCTicket has no relation to GBCUser), so
 * the public site itself is the "user" experience. `/gbc-restricted/{...}`
 * is a single flat admin tier here (ADMIN and SUPERADMIN both reach every
 * page below it, except Audit Logs which is SUPERADMIN-only) — unlike
 * REVA/Surfboard, proxy.ts's current GBC branch
 * never special-cases a sub-path other than /superadmin, which has no real
 * page (confirmed by reading the folder tree), so it's kept as a direct
 * role check below rather than a registry entry, same treatment as REVA's
 * and Surfboard's equivalent dead branches.
 *
 * The nav side of this backs `AdminSidebar.tsx` (the real, live admin
 * sidebar rendered by `gbc-restricted/layout.tsx`) — not
 * `components/layouts/gbcAdminPanelLayout.tsx`, which turned out to be
 * unused scaffolding never imported anywhere (confirmed by a repo-wide
 * grep) despite being the one the Phase 4 spec's step 13 language
 * describes. Wiring the real sidebar to this registry surfaced two
 * genuine gaps: `/gbc-restricted/attendees` and `/gbc-restricted/editions`
 * both have working pages that were never in `AdminSidebar.tsx`'s
 * hand-written array, so nothing linked to them at all. Both are fixed
 * here by registering them as real nav items.
 */

export type GBCRouteGroup = "admin" | "guest";

export interface GBCRouteEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: GBCRole[];
  group: GBCRouteGroup;
  showInNav?: boolean;
}

const ADMIN_ROLES = [GBCRole.ADMIN, GBCRole.SUPERADMIN];
const SUPERADMIN_ONLY = [GBCRole.SUPERADMIN];
/** Guest pages need no role at all — the public site itself is the "user" experience. */
const PUBLIC: GBCRole[] = [];

const ADMIN_BASE = "/gbc-restricted";

export const GBC_ROUTES: GBCRouteEntry[] = [
  // --- Admin panel (ADMIN/SUPERADMIN — proxy.ts's current gate treats the whole tree as one flat role check) ---
  // Labels/icons below match what AdminSidebar.tsx already had live for
  // the 8 pages it already linked (Dashboard/Tickets/Check-In/
  // Certificates/Sponsors/Speakers/Gallery/Inquiries/Users/Settings) —
  // this registry replaces that hand-written array, not its established
  // visual choices. Attendees and Editions are the two real gaps found
  // while wiring this up: both have working pages but were never in that
  // array, so they get fresh icons (no prior live choice to preserve).
  { path: ADMIN_BASE, label: "Dashboard", icon: LayoutDashboard, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/tickets`, label: "Tickets", roles: ADMIN_ROLES, icon: Ticket, group: "admin" },
  { path: `${ADMIN_BASE}/check-in`, label: "Check-In", icon: QrCode, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/attendees`, label: "Attendees", icon: UserCheck, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/editions`, label: "Editions", icon: Calendar, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/gallery`, label: "Gallery", icon: Images, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/speakers`, label: "Speakers", icon: Mic, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/sponsors`, label: "Sponsors", icon: Building2, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/inquiries`, label: "Inquiries", icon: MessageSquare, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/certificates`, label: "Certificates", icon: FileText, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/users`, label: "Users", icon: Users, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/audit-logs`, label: "Audit Logs", icon: ScrollText, roles: SUPERADMIN_ONLY, group: "admin" },
  { path: `${ADMIN_BASE}/notifications`, label: "Notifications", icon: Bell, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/settings`, label: "Settings", icon: Settings, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/profile`, label: "Profile", icon: User, roles: ADMIN_ROLES, group: "admin", showInNav: false },

  // --- Guest-facing (public — GBCTicket has no relation to GBCUser, there's no session to check) ---
  { path: "/gbc", label: "Home", icon: Home, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/about", label: "About", icon: Info, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/contact", label: "Contact", icon: Mail, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/gallery", label: "Gallery", icon: Image, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/speakers", label: "Speakers", icon: Mic, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/sponsors", label: "Sponsors", icon: Award, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/tickets", label: "Tickets", icon: Ticket, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/editions", label: "Past Editions", icon: Calendar, roles: PUBLIC, group: "guest", showInNav: false },
  { path: "/gbc/certificate", label: "Certificate", icon: FileCheck2, roles: PUBLIC, group: "guest", showInNav: false },
  // The repurposed My Ticket entry point (step 12) — reference+email is the auth, not a role.
  { path: "/gbc/login", label: "My Ticket", icon: Search, roles: PUBLIC, group: "guest", showInNav: false },
];

/**
 * Longest-prefix match (mirrors reva/access/routes.ts's and
 * surfboard/access/routes.ts's convention).
 * An empty `roles` array marks a public/guest route — accessible
 * regardless of role, including an anonymous/null caller.
 */
export function canAccessRoute(
  path: string,
  role: string | null | undefined
): boolean {
  const entry = [...GBC_ROUTES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((r) => path === r.path || path.startsWith(`${r.path}/`));
  if (!entry) return false;
  if (entry.roles.length === 0) return true;
  return entry.roles.includes(role as GBCRole);
}

export function getNavItemsForRole(
  role: string | null | undefined,
  group: GBCRouteGroup
): GBCRouteEntry[] {
  return GBC_ROUTES.filter(
    (r) =>
      r.group === group &&
      r.showInNav !== false &&
      r.roles.includes(role as GBCRole)
  );
}
