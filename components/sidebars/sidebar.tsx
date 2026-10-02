"use client";

import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Menu, MenuProps } from "@/components/sidebars/menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";

/**
 * Desktop icon-only rail width. Layouts that reserve horizontal space for
 * the sidebar (a sibling "spacer" div sized off `sideBarWidthClass`) should
 * switch to this class when `useSidebar().isRailCollapsed` is true, so
 * collapsing the rail actually gives the content area the freed-up space
 * back instead of just leaving a gap next to a narrower `<aside>`.
 */
export const RAIL_WIDTH_CLASS = " lg:w-[76px] ";

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
  /**
   * Big call-to-action button pinned above the nav list (e.g. "New Plan"),
   * pulled out of the ordinary link items so it reads as the primary action
   * instead of just another menu row.
   */
  primaryAction?: { label: string; href: string; icon?: LucideIcon };
  /**
   * Opt-in: shows a collapse toggle and lets the rail shrink to
   * `RAIL_WIDTH_CLASS` (icon-only) on desktop, persisted via
   * `useSidebar().isRailCollapsed`. Off by default so products that haven't
   * asked for this (and whose layout doesn't shrink the sidebar's reserved
   * space to match — see RAIL_WIDTH_CLASS's doc comment) aren't silently
   * affected by another product's collapse preference sharing the same
   * store.
   */
  enableRailCollapse?: boolean;
  /**
   * Optional override for the rail's background (any valid CSS `background`
   * value — a flat color or a gradient string). Defaults to the shared
   * near-black `SIDEBAR_INK` so products that haven't asked for their own
   * identity here are unaffected.
   */
  railBackground?: string;
  /** Overrides the collapse-toggle button's fill — defaults to Surfboard blue, so a product with its own `railBackground` isn't stuck with a clashing blue button. */
  toggleColor?: string;
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
  primaryAction,
  enableRailCollapse = false,
  railBackground,
  toggleColor,
}: SidebarProps) {
  const sidebar = useStore(useSidebar, (x) => x);

  if (!sidebar) return null;

  // Collapsed to icon-only width, and not currently being hovered back open.
  const isRail = enableRailCollapse && sidebar.isRailCollapsed;
  const isPeeking = isRail && sidebar.isHover;
  const showFull = !isRail || isPeeking;

  return (
    <aside
      className={cn(
        "absolute inset-0 transition-all ease-in-out duration-300",
        // Peeking open (desktop hover) or the mobile drawer being open both
        // float the sidebar over page content that hasn't shifted its own
        // margin to make room — needs to beat that content's z-50 panels
        // (e.g. a map viewer's own Search & Filters box, previously winning
        // the tie on DOM order and covering the sidebar's nav labels on
        // mobile). Bump above that tie only in these overlay cases, not all
        // the time, so it never fights other z-50 chrome (navbars,
        // dropdowns) during normal collapsed/expanded desktop states.
        isPeeking || sidebar.isOpen ? "z-100" : "z-50",
        "w-[240px] border-r shadow-lg",
        showFull ? sideBarWidthClass : RAIL_WIDTH_CLASS,
        sidebar.isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: railBackground || SIDEBAR_INK,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
      onMouseEnter={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-sidebar-toggle="true"]')) return;
        if (isRail) sidebar.setIsHover(true);
      }}
      onMouseMove={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-sidebar-toggle="true"]')) {
          if (isRail && sidebar.isHover) sidebar.setIsHover(false);
          return;
        }
        if (isRail && !sidebar.isHover) sidebar.setIsHover(true);
      }}
      onMouseLeave={() => isRail && sidebar.setIsHover(false)}
    >
      {enableRailCollapse && (
        <button
          data-sidebar-toggle="true"
          onClick={() => sidebar?.toggleRailCollapsed()}
          onMouseEnter={(e) => {
            e.stopPropagation();
            if (isRail) sidebar.setIsHover(false);
          }}
          onMouseMove={(e) => {
            e.stopPropagation();
            if (isRail) sidebar.setIsHover(false);
          }}
          // Sibling of the overflow-hidden content div below (not nested
          // inside it) so this isn't clipped by that div's overflow
          // boundary — it used to be a child of that div, which cut roughly
          // half the button off since it pokes out past the div's own
          // right edge via -right-3.
          className="hidden lg:flex absolute top-3 -right-4 z-10 h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-transform duration-300 hover:scale-110"
          style={{
            background: toggleColor || "var(--color-brand-primary, #2563EB)",
            borderColor: "rgba(255,255,255,0.35)",
          }}
          aria-label={isRail ? "Expand sidebar" : "Collapse sidebar"}
          title={isRail ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 text-white transition-transform duration-300",
              isRail && "rotate-180"
            )}
          />
        </button>
      )}

      <div className="relative h-full justify-between flex flex-col overflow-hidden">
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
                  className="w-11 h-11 rounded-full shadow border border-white/15 bg-white object-contain shrink-0"
                />
              )}
              {showFull && (
                <span className="text-lg font-bold text-white tracking-wide truncate">
                  {title}
                </span>
              )}
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

        <div className="flex-1 flex flex-col min-h-0 px-2">
          {primaryAction && (
            <div className="px-1 pb-2 pt-3">
              <Link
                href={primaryAction.href}
                onClick={() => sidebar?.toggleOpen()}
                title={showFull ? undefined : primaryAction.label}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",
                  showFull ? "justify-center px-4" : "justify-center px-0"
                )}
                style={{
                  background:
                    "linear-gradient(120deg, var(--color-brand-primary-dark), var(--color-brand-primary))",
                }}
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="h-4 w-4 shrink-0" />
                )}
                {showFull && primaryAction.label}
              </Link>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <Menu
              items={items}
              userImageUrl={userImageUrl}
              userName={userName}
              userRole={userRole}
              iconOnly={!showFull}
              variant="dark"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
