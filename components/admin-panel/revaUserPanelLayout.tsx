"use client";

import { Sidebar } from "@/components/admin-panel/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { RevaUserDashboardNavbar } from "@/components/headers/RevaUserDashboardHeader";

export default function RevaUserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);

  if (!sidebar) return null;

  // const { getOpenState, settings } = sidebar;

  return (
    <div className="h-screen max-h-screen overflow-hidden w-screen max-w-screen grid grid-rows-[80px_calc(100vh_-_80px)]">
      <RevaUserDashboardNavbar />

      <main
        className={cn(
          "relative min-h-[calc(100vh_-_80px)] max-h-[calc(100vh_-_80px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          "flex"
        )}
      >
        <div className={"lg:w-[105px] h-full max-h-full"}>
          <Sidebar />
        </div>

        <main className="flex-1 p-4 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </main>
    </div>
  );
}
