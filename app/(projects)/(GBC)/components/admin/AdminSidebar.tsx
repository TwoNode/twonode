"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { Button } from "@/components/ui/button";
import { GBC_ROUTES } from "@/gbc/access/routes";

/**
 * Sourced from gbc/access/routes.ts's "admin" group instead of a
 * hand-written array — this is the real, live admin sidebar (unlike
 * components/layouts/gbcAdminPanelLayout.tsx, which is unused scaffolding
 * never imported anywhere). Every admin registry entry currently shares
 * the same ADMIN/SUPERADMIN role gate, and this component is only ever
 * rendered inside gbc/restricted/layout.tsx, which proxy.ts's middleware
 * has already role-gated before the page renders — so no role prop is
 * needed here, same as the array it replaces never branched on role
 * either. Fixes a real gap found while wiring this up: the old array had
 * no link to /gbc/restricted/editions (built in step 9, never added
 * here).
 */
const navigation = GBC_ROUTES.filter(
  (r) => r.group === "admin" && r.showInNav !== false
).map((r) => ({ name: r.label, href: r.path, icon: r.icon }));

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 sm:p-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-purple-600">
          GBC Admin
        </h1>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>
      <nav className="px-3 flex-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose} // Close sidebar on navigation (mobile)
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg mb-1 transition text-sm sm:text-base",
                isActive
                  ? "bg-purple-100 text-purple-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}

        <LogoutLink
          postLogoutRedirectURL="/api/auth/logout_redirect"
          className={cn(
            "mt-5 flex items-center gap-3",
            "rounded-lg transition text-sm sm:text-base",
            "text-gray-700 hover:bg-gray-100"
          )}
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full px-3 py-2.5 sm:py-2"
          >
            Sign Out
          </Button>
        </LogoutLink>
      </nav>
    </aside>
  );
}
