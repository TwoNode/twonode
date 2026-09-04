"use client";

import { X } from "lucide-react";
import { Menu, MenuProps } from "@/components/sidebars/menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { REVA_COLORS } from "@/reva/colors";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

export interface SidebarProps extends MenuProps {
  sideBarWidthClass: string;
  /**
   * Optional top branding block (logo + title), rendered above the nav
   * list. Only the top-to-bottom "admin/mda" shells pass this — they have
   * no separate full-width navbar, so the sidebar itself carries the
   * branding. The "user" shells (which keep their own left-to-right top
   * navbar) leave this unset and get the original headerless sidebar.
   */
  title?: string;
  logoSrc?: string;
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
  title,
  logoSrc,
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
        "absolute inset-0 z-50 transition-all ease-in-out duration-300",
        "w-[240px] border-r shadow-lg",
        sideBarWidthClass,
        sidebar.isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: SIDEBAR_INK,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="relative h-full justify-between flex flex-col overflow-y-auto">
        {/* Top decorative element — tinted by the active product's accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-b-full opacity-70"
          style={{ background: colorPalette.sidebar.itemBorderLeft }}
        ></div>

        {title && (
          <div
            className="shrink-0 flex items-center justify-between gap-2 px-4 py-4 border-b"
            style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {logoSrc && (
                <img
                  src={logoSrc}
                  alt={`${title} logo`}
                  className="w-9 h-9 rounded-full shadow border border-white/15 bg-white object-contain shrink-0"
                />
              )}
              <span className="text-base font-bold text-white tracking-wide truncate">
                {title}
              </span>
            </div>
            <button
              onClick={() => sidebar?.toggleOpen()}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden shrink-0"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 px-2">
          <Menu
            items={items}
            userImageUrl={userImageUrl}
            userName={userName}
            userRole={userRole}
            colorPalette={colorPalette}
            variant="dark"
          />
        </div>

        {/* Bottom decorative element */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full opacity-40"
          style={{ background: colorPalette.sidebar.itemBorderLeft }}
        ></div>
      </div>
    </aside>
  );
}
