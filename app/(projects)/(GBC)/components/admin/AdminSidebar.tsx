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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <h1 className="text-2xl font-bold gradient-purple bg-clip-text text-transparent">
          GBC Admin
        </h1>
      </div>
      <nav className="px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition",
                isActive
                  ? "bg-purple-100 text-purple-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
