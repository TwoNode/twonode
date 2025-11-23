"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const routeTitles: Record<string, string> = {
  "/gbc2/restricted": "Dashboard",
  "/gbc2/restricted/tickets": "Tickets Management",
  "/gbc2/restricted/check-in": "Check-In",
  "/gbc2/restricted/attendees": "Attendees",
  "/gbc2/restricted/sponsors": "Sponsors",
  "/gbc2/restricted/gallery": "Gallery",
  "/gbc2/restricted/inquiries": "Inquiries",
  "/gbc2/restricted/users": "Users",
  "/gbc2/restricted/settings": "Settings",
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
    </div>
  );
}
