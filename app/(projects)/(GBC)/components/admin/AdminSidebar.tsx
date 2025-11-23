"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  Images,
  Settings,
  QrCode,
  MessageSquare,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/gbc2/restricted", icon: LayoutDashboard },
  { name: "Tickets", href: "/gbc2/restricted/tickets", icon: Ticket },
  { name: "Check-In", href: "/gbc2/restricted/check-in", icon: QrCode },
  { name: "Sponsors", href: "/gbc2/restricted/sponsors", icon: Building2 },
  { name: "Gallery", href: "/gbc2/restricted/gallery", icon: Images },
  {
    name: "Inquiries",
    href: "/gbc2/restricted/inquiries",
    icon: MessageSquare,
  },
  { name: "Users", href: "/gbc2/restricted/users", icon: Users },
  { name: "Settings", href: "/gbc2/restricted/settings", icon: Settings },
];

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
      </nav>
    </aside>
  );
}
