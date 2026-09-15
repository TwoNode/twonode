"use client";

import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { GBCUserMenu } from "@/gbc/components/admin/GBCUserMenu";
import { GBCAdminSearch } from "@/gbc/components/admin/GBCAdminSearch";
import { Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { GBC_ROUTES } from "@/gbc/access/routes";

/**
 * Sourced from the same registry as AdminSidebar.tsx instead of a second,
 * separately hand-maintained title map.
 */
const routeTitles: Record<string, string> = Object.fromEntries(
  GBC_ROUTES.filter((r) => r.group === "admin").map((r) => [r.path, r.label])
);

export function AdminMobileNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "Admin";
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 py-2.5 flex items-center gap-2.5">
        <button
          onClick={onMenuClick}
          className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label={showSearch ? "Close search" : "Open search"}
          >
            {showSearch ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
          <NotificationBell
            platform="gbc"
            viewAllHref="/gbc-restricted/notifications"
            iconClassName="h-5 w-5 text-gray-600"
          />
          <GBCUserMenu size={30} />
        </div>
      </div>

      {showSearch && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 bg-gray-50/80">
          <GBCAdminSearch
            placeholder="Search tickets, attendees, sections…"
            className="w-full max-w-full"
          />
        </div>
      )}
    </div>
  );
}
