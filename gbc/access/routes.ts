import type { LucideIcon } from "lucide-react";
import {
  Home,
  Ticket,
  CheckSquare,
  Users,
  UserCog,
  Calendar,
  Settings,
  Image,
  Mic,
  Award,
  MessageSquare,
  FileCheck2,
  Info,
  Mail,
  Search,
} from "lucide-react";
import { GBCRole } from "@/utils/platform";

/**
 * Single source of truth for GBC's routes: what nav items render, which
 * roles can reach them, and (via canAccessRoute) what proxy.ts gates on.
 * Same shape as reva/access/routes.ts, minus a "user" group — GBC ticket
 * holders never get an account (GBCTicket has no relation to GBCUser), so
 * the public site itself is the "user" experience. `/gbc/restricted/{...}`
 * is a single flat admin tier here (ADMIN and SUPERADMIN both reach every
 * page below it) — unlike REVA/Surfboard, proxy.ts's current GBC branch
 * never special-cases a sub-path other than /superadmin, which has no real
 * page (confirmed by reading the folder tree), so it's kept as a direct
 * role check below rather than a registry entry, same treatment as REVA's
 * and Surfboard's equivalent dead branches.
 *
 * Wiring this up surfaced two real gaps the old hand-written sidebar array
 * had: gallery/speakers/sponsors/inquiries/certificates/users all have
 * working admin pages that were simply never added to the sidebar list,
 * and "QR Codes" linked to `/gbc/restricted/qr-code`, a page that doesn't
 * exist (QR scanning lives inside /check-in, via qrCheckinService). The
 * former are fixed here by registering them as real nav items; the latter
 * is fixed by dropping the dead link — it's not in the registry at all.
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
/** Guest pages need no role at all — the public site itself is the "user" experience. */
const PUBLIC: GBCRole[] = [];

const ADMIN_BASE = "/gbc/restricted";

export const GBC_ROUTES: GBCRouteEntry[] = [
  // --- Admin panel (ADMIN/SUPERADMIN — proxy.ts's current gate treats the whole tree as one flat role check) ---
  { path: ADMIN_BASE, label: "Home", icon: Home, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/tickets`, label: "Tickets", roles: ADMIN_ROLES, icon: Ticket, group: "admin" },
  { path: `${ADMIN_BASE}/check-in`, label: "Check In", icon: CheckSquare, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/attendees`, label: "Attendees", icon: Users, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/editions`, label: "Editions", icon: Calendar, roles: ADMIN_ROLES, group: "admin" },
  // Real pages, working but never linked from the old hand-written sidebar array — found while building this registry.
  { path: `${ADMIN_BASE}/gallery`, label: "Gallery", icon: Image, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/speakers`, label: "Speakers", icon: Mic, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/sponsors`, label: "Sponsors", icon: Award, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/inquiries`, label: "Inquiries", icon: MessageSquare, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/certificates`, label: "Certificates", icon: FileCheck2, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/users`, label: "Admin Users", icon: UserCog, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/settings`, label: "Settings", icon: Settings, roles: ADMIN_ROLES, group: "admin" },

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
