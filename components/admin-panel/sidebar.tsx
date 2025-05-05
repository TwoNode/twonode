"use client";

import { Menu } from "@/components/admin-panel/menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const sidebar = useStore(useSidebar, (x) => x);

  if (!sidebar) return null;

  const { getOpenState } = sidebar;

  return (
    <aside
      className={cn(
        "absolute inset-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300",
        "w-[105px] bg-[#f0f2f4] max-h-[944px] border-0"
      )}
    >
      <div className="relative h-full justify-between flex flex-col px-3 py-4 overflow-y-auto">
        <Menu isOpen={getOpenState()} />
      </div>
    </aside>
  );
}
