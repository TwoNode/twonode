"use client";

import { AdminMobileNav } from "../../components/admin/AdminMobileNav";
import { AdminSidebar } from "../../components/admin/AdminSidebar";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Mobile Header */}
        <AdminMobileNav onMenuClick={() => setSidebarOpen(true)} />

        {/* Content */}
        <div className="container mx-auto p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
