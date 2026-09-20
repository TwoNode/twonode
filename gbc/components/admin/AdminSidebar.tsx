"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { ConfirmedLogoutLink } from "@/components/ConfirmedLogoutLink";
import { Button } from "@/components/ui/button";
import { GBC_ROUTES } from "@/gbc/access/routes";
import { GBC_COLORS } from "@/gbc/colors";
import { useGBCRole } from "@/gbc/components/admin/useGBCRole";

/**
 * Sourced from gbc/access/routes.ts's "admin" group instead of a
 * hand-written array — this is the real, live admin sidebar (unlike
 * components/layouts/gbcAdminPanelLayout.tsx, which is unused scaffolding
 * never imported anywhere). Every admin registry entry currently shares
 * the same ADMIN/SUPERADMIN role gate, and this component is only ever
 * rendered inside the gbc-restricted (admin) layout, which proxy.ts's middleware
 * has already role-gated before the page renders. The one exception is the
 * SUPERADMIN-only entries (Audit Logs): the proxy would turn an ADMIN away
 * from them, so they're hidden here for anyone but a SUPERADMIN.
 *
 * Dark nav-bg shell + grouped sections (Overview/Program/Content/System)
 * match the GBC Design System artifact's admin sidebar -- the grouping
 * itself isn't part of the routes registry (routes.ts owns path/label/
 * role, not visual layout), so it's a local label map here rather than a
 * new registry field only this component would ever read.
 */
const navigation = GBC_ROUTES.filter(
  (r) => r.group === "admin" && r.showInNav !== false
).map((r) => ({ name: r.label, href: r.path, icon: r.icon, roles: r.roles }));

const GROUPS: { label: string; items: string[] }[] = [
  { label: "Overview", items: ["Dashboard", "Tickets", "Check-In", "Attendees"] },
  { label: "Program", items: ["Editions"] },
  { label: "Content", items: ["Speakers", "Sponsors", "Gallery"] },
  { label: "System", items: ["Inquiries", "Certificates", "Users", "Audit Logs", "Notifications", "Settings"] },
];

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const role = useGBCRole();

  return (
    <aside
      className="w-64 h-full flex flex-col"
      style={{ background: GBC_COLORS.nav.bg }}
    >
      <div
        className="p-4 sm:p-5 flex items-center justify-between gap-2 border-b"
        style={{ borderColor: "rgba(255,255,255,.12)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0"
            style={{
              background: `linear-gradient(155deg, ${GBC_COLORS.secondary.light}, ${GBC_COLORS.primary.light})`,
              color: GBC_COLORS.primary.dark,
            }}
          >
            GB
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">GBC</div>
            <div className="text-[10px]" style={{ color: GBC_COLORS.nav.textMuted }}>
              Admin panel
            </div>
          </div>
        </div>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
      <nav className="px-3 py-3 flex-1 overflow-y-auto">
        {GROUPS.map((group) => {
          const items = navigation.filter(
            (n) => group.items.includes(n.name) && role !== null && n.roles.includes(role)
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-1">
              <div
                className="text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-1.5"
                style={{ color: GBC_COLORS.nav.textMuted }}
              >
                {group.label}
              </div>
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose} // Close sidebar on navigation (mobile)
                    className="flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg mb-0.5 transition text-sm sm:text-base"
                    style={{
                      background: isActive ? GBC_COLORS.nav.bgActive : "transparent",
                      color: isActive ? "#fff" : GBC_COLORS.nav.text,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0 opacity-90" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          );
        })}

        <ConfirmedLogoutLink
          postLogoutRedirectURL="/api/auth/logout_redirect"
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="mt-5 w-full px-3 py-2.5 sm:py-2 bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white"
            >
              Sign Out
            </Button>
          }
        />
      </nav>
    </aside>
  );
}
