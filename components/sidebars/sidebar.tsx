"use client";

import { Menu, MenuProps } from "@/components/sidebars/menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { REVA_COLORS } from "@/reva/colors";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

export interface SidebarProps extends MenuProps {
  sideBarWidthClass: string;
}

/**
 * Fixed near-black rail, same for every product — the brand color only
 * shows up in the active nav highlight/icon (colors.sidebar.itemBorderLeft),
 * not the whole background. Stays this color in both light and dark theme;
 * the sidebar's identity doesn't switch with the rest of the shell.
 */
const SIDEBAR_INK = "#0A0F16";

export function Sidebar({
  items,
  userImageUrl,
  userName,
  userRole,
  sideBarWidthClass,
}: SidebarProps) {
  const sidebar = useStore(useSidebar, (x) => x);

  if (!sidebar) return null;

  // Detect if this is a Surfboard layout by checking for a surfboard dashboard path
  const isSurfboard =
    typeof window !== "undefined" &&
    (window.location.pathname.includes("/surfboard") ||
      window.location.pathname.includes("/surfboard-restricted"));

  const colorPalette = isSurfboard ? SURFBOARD_COLORS : REVA_COLORS;

  return (
    <aside
      className={cn(
        "absolute inset-0 z-50 h-screen transition-all ease-in-out duration-300",
        "w-[240px] max-h-[944px] border-r shadow-lg",
        sideBarWidthClass,
        sidebar.isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: SIDEBAR_INK,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="relative h-full justify-between flex flex-col px-2 py-4 overflow-y-auto">
        {/* Top decorative element — tinted by the active product's accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-b-full opacity-70"
          style={{ background: colorPalette.sidebar.itemBorderLeft }}
        ></div>

        <Menu
          items={items}
          userImageUrl={userImageUrl}
          userName={userName}
          userRole={userRole}
          colorPalette={colorPalette}
          variant="dark"
        />

        {/* Bottom decorative element */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full opacity-40"
          style={{ background: colorPalette.sidebar.itemBorderLeft }}
        ></div>
      </div>
    </aside>
  );
}
