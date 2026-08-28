"use client";

import { Button } from "@/components/ui/button";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { GBC_ROUTES } from "@/gbc/access/routes";

/**
 * Sourced from the same registry as AdminSidebar.tsx instead of a second,
 * separately hand-maintained title map — the old one had already drifted
 * (missing Certificates, Speakers, and Editions, so those pages' mobile
 * header silently fell back to the generic "Admin" title). Tickets'
 * title changes from "Tickets Management" to "Tickets" to match the
 * sidebar label exactly, rather than keeping two different names for
 * the same page.
 */
const routeTitles: Record<string, string> = Object.fromEntries(
  GBC_ROUTES.filter((r) => r.group === "admin").map((r) => [r.path, r.label])
);

export function AdminMobileNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "Admin";

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>

      <LogoutLink postLogoutRedirectURL="/api/auth/logout_redirect" className="ml-auto">
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          Sign Out
        </Button>
      </LogoutLink>
    </div>
  );
}
