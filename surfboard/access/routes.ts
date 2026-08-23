import type { LucideIcon } from "lucide-react";
import {
  Home,
  ListChecks,
  Map,
  Shield,
  Bell,
  Award,
  Receipt,
  Cog,
  QrCode,
  FileText,
} from "lucide-react";
import { SurfboardRole } from "@/utils/platform";

/**
 * Single source of truth for Surfboard's admin-panel routes: what nav items
 * render, and which roles can reach them. Pilot scope only (admin +
 * QR-earnings) — the rest of Surfboard (user panel, MDA tree) gets its own
 * entries in Phase 2, once proxy.ts itself is migrated to read this registry
 * for access control instead of its current hand-rolled path matching.
 */

export type SurfboardRouteGroup = "admin" | "user";

export interface SurfboardRouteEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: SurfboardRole[];
  group: SurfboardRouteGroup;
}

const ADMIN_ROLES = [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN];
const SUPERADMIN_ONLY = [SurfboardRole.SUPERADMIN];

const ADMIN_BASE = "/surf-restricted/dashboard";

export const SURFBOARD_ROUTES: SurfboardRouteEntry[] = [
  { path: ADMIN_BASE, label: "Home", icon: Home, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/surf-plans`, label: "Surf Plans", icon: ListChecks, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/map`, label: "Map Viewer", icon: Map, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/user-management`, label: "User Management", icon: ListChecks, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/kyc`, label: "Surveyor's KYC", icon: Shield, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/notifications`, label: "Notifications", icon: Bell, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/certificates`, label: "Certificates", icon: Award, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/cod/batches`, label: "CoD Batches", icon: Receipt, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/analytics`, label: "Analytics", icon: Cog, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/qr-earnings`, label: "QR Earnings", icon: QrCode, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/qr-earnings/settings`, label: "QR Earnings Settings", icon: Cog, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/settings`, label: "Settings", icon: Cog, roles: ADMIN_ROLES, group: "admin" },
  { path: `${ADMIN_BASE}/audit-logs`, label: "Audit Logs", icon: FileText, roles: SUPERADMIN_ONLY, group: "admin" },
];

/**
 * Longest-prefix match (mirrors proxy.ts's existing pathname.startsWith
 * convention) so a nested page like .../surf-plans/[id] resolves to the
 * .../surf-plans entry's role requirement.
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
