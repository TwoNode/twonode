"use client";

import { Menu, MenuProps } from "@/components/sidebars/menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

export interface SidebarProps extends MenuProps {
  sideBarWidthClass: string;
}

export function Sidebar({
  items,
  userImageUrl,
  sideBarWidthClass,
}: SidebarProps) {
  const sidebar = useStore(useSidebar, (x) => x);

  if (!sidebar) return null;

  // Detect if this is a Surfboard layout by checking for a surfboard dashboard path
  const isSurfboard =
    typeof window !== "undefined" &&
    (window.location.pathname.includes("/surfboard") ||
      window.location.pathname.includes("/surfboard-restricted"));

  return (
    <aside
      className={cn(
        "absolute inset-0 z-50 h-screen transition-all ease-in-out duration-300",
        "w-[165px] lg:w-[105px] max-h-[944px] border-r shadow-lg backdrop-blur-sm",
        sideBarWidthClass,
        sidebar.isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: isSurfboard
          ? SURFBOARD_COLORS.primary.dark
          : REVA_GRADIENTS.sidebar,
        borderColor: "rgba(226, 232, 240, 0.6)",
      }}
    >
      <div className="relative h-full justify-between flex flex-col px-2 py-4 overflow-y-auto">
        {/* Top decorative element */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-b-full opacity-80"
          style={{
            background: isSurfboard
              ? SURFBOARD_COLORS.primary.dark
              : `linear-gradient(to right, ${REVA_COLORS.primary.light}, ${REVA_COLORS.secondary.light})`,
          }}
        ></div>

        <Menu
          items={items}
          userImageUrl={userImageUrl}
          colorPalette={isSurfboard ? SURFBOARD_COLORS : REVA_COLORS}
        />

        {/* Bottom decorative element */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full opacity-60"
          style={{
            background: isSurfboard
              ? SURFBOARD_COLORS.primary.dark
              : `linear-gradient(to right, ${REVA_COLORS.secondary.light}, ${REVA_COLORS.primary.light})`,
          }}
        ></div>
      </div>
    </aside>
  );
}
