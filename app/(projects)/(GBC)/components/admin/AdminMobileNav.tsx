"use client";

import { Button } from "@/components/ui/button";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const routeTitles: Record<string, string> = {
  "/gbc/restricted": "Dashboard",
  "/gbc/restricted/tickets": "Tickets Management",
  "/gbc/restricted/check-in": "Check-In",
  "/gbc/restricted/attendees": "Attendees",
  "/gbc/restricted/sponsors": "Sponsors",
  "/gbc/restricted/gallery": "Gallery",
  "/gbc/restricted/inquiries": "Inquiries",
  "/gbc/restricted/users": "Users",
  "/gbc/restricted/settings": "Settings",
};

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

      <LogoutLink className="ml-auto">
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          Sign Out
        </Button>
      </LogoutLink>
    </div>
  );
}
