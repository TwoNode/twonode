"use client";

import { AdminMobileNav } from "@/gbc/components/admin/AdminMobileNav";
import { AdminSidebar } from "@/gbc/components/admin/AdminSidebar";
import NotificationBell from "@/components/NotificationBell";
import UserAvatar from "@/components/UserAvatar";
import { useState } from "react";
import { useNativeAuthRefresh } from "@/hooks/useNativeAuthRefresh";
import { Platform } from "@/utils/platform";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useNativeAuthRefresh(Platform.GBC);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile Header */}
        <AdminMobileNav onMenuClick={() => setSidebarOpen(true)} />

        {/* Desktop Header — GBC admin has no top bar otherwise, unlike
            Surfboard/REVA's DashboardShell-based layouts. */}
        <div className="hidden md:flex items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 py-3">
          <NotificationBell platform="gbc" viewAllHref="/gbc-restricted/notifications" iconClassName="h-5 w-5 text-gray-600" />
          <UserAvatar platform="gbc" />
        </div>

        {/* Content */}
        <div className="container mx-auto p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
