"use client";

import { Menu, MenuProps } from "@/components/admin-panel/menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva-colors";

export interface SidebarProps extends MenuProps {
  background?: string;
}

export function Sidebar({ items, userImageUrl, background }: SidebarProps) {
  const sidebar = useStore(useSidebar, (x) => x);

  if (!sidebar) return null;

  return (
    <aside
      className={cn(
        "absolute inset-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-all ease-in-out duration-300",
        "w-[105px] max-h-[944px] border-r shadow-lg backdrop-blur-sm"
      )}
      style={{
        background: background || REVA_GRADIENTS.sidebar,
        borderColor: "rgba(226, 232, 240, 0.6)",
      }}
    >
      <div className="relative h-full justify-between flex flex-col px-3 py-4 overflow-y-auto">
        {/* Top decorative element */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-b-full opacity-80"
          style={{
            background: `linear-gradient(to right, ${REVA_COLORS.primary.light}, ${REVA_COLORS.secondary.light})`,
          }}
        ></div>

        <Menu items={items} userImageUrl={userImageUrl} />

        {/* Bottom decorative element */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full opacity-60"
          style={{
            background: `linear-gradient(to right, ${REVA_COLORS.secondary.light}, ${REVA_COLORS.primary.light})`,
          }}
        ></div>
      </div>
    </aside>
  );
}
