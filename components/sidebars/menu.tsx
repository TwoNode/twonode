"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LucideIcon } from "lucide-react";
import { LucideUser } from "lucide-react";
import { REVA_COLORS } from "@/reva/colors";
import { useStore } from "@/hooks/use-store";
import { useSidebar } from "@/hooks/use-sidebar";

interface LinkItem {
  icon: LucideIcon;
  label: string;
  url: string;
  /** Visual sidebar section heading — rendered above this item when it differs from the previous item's section. */
  section?: string;
  /** Small count pill rendered at the end of the row, e.g. a pending-items count. */
  badge?: number | string;
  /** Tints the badge to draw the eye (e.g. items needing action) instead of the neutral default. */
  badgeAttention?: boolean;
}

interface ElementItem {
  element: any;
}

export type MenuItem = LinkItem | ElementItem;

export interface MenuProps {
  items: MenuItem[];
  userImageUrl?: string;
  colorPalette?: any; // Accepts a color palette object (REVA_COLORS or SURFBOARD_COLORS)
  /**
   * "auto" (default) keeps the original behavior: text color depends on
   * whether colorPalette.primary.contrastText is set, tuned for a light
   * sidebar background — this is what SheetMenu's light popover still uses.
   * "dark" forces the near-black-rail styling (always-white text, brand
   * color only for the active highlight/icon) — pass this from Sidebar,
   * which is always dark now regardless of product.
   */
  variant?: "auto" | "dark";
}

export function Menu({ items, userImageUrl = "", colorPalette, variant = "auto" }: MenuProps) {
  const colors = colorPalette || require("@/reva/colors").REVA_COLORS;
  const pathname = usePathname();
  const sidebar = useStore(useSidebar, (x) => x);
  const isDark = variant === "dark";

  const isActive = (url: string) => pathname === url;

  // contrastText in this codebase's palettes is always a 3-digit hex ("#fff"),
  // which breaks naive `${hex}99` alpha-suffix concatenation (produces the
  // invalid 5-digit "#fff99"). Use a literal translucent white instead of
  // trying to alpha-blend the hex string.
  const mutedTextColor = isDark
    ? "rgba(255, 255, 255, 0.5)"
    : colorPalette && colorPalette.primary && colorPalette.primary.contrastText
    ? "rgba(255, 255, 255, 0.6)"
    : colors.text?.muted ?? colors.primary.main;

  let previousSection: string | undefined;

  return (
    <ScrollArea className="bg-transparent [&>div>div[style]]:block! h-full">
      <nav className="pt-4 h-full w-full flex flex-col justify-between overflow-y-auto box-border max-h-[85vh]">
        <ul className="flex flex-col gap-1 items-start px-2 justify-center w-full">
          {items.map((item, index) => {
            if ("element" in item) {
              // Element items (e.g. Logout) always render trailing today —
              // give them a bit of visual separation from the nav list above.
              const el = (
                <div
                  key={index}
                  className="w-full pt-2 mt-2 border-t"
                  style={{ borderColor: `${colors.primary.light}22` }}
                >
                  {item?.element}
                </div>
              );
              previousSection = undefined;
              return el;
            }

            const showHeading =
              !!item.section && item.section !== previousSection;
            previousSection = item.section;

            return (
              <li key={index} className="w-full list-none">
                {showHeading && (
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-1.5"
                    style={{ color: mutedTextColor }}
                  >
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.url}
                  onClick={() => {
                    sidebar?.toggleOpen();
                  }}
                  className={cn(
                    "group flex flex-row items-center gap-3 w-full h-11 lg:h-12 rounded-lg px-2.5 transition-all duration-200 ease-in-out"
                  )}
                  style={{
                    background: isDark
                      ? isActive(item.url)
                        ? `${colors.sidebar.itemBorderLeft}47`
                        : "transparent"
                      : isActive(item.url)
                      ? `${colors.primary.light}1A`
                      : "transparent",
                    borderLeft: isDark
                      ? "3px solid transparent"
                      : isActive(item.url)
                      ? `3px solid ${colors.sidebar.itemBorderLeft}`
                      : "3px solid transparent",
                    color: isDark
                      ? isActive(item.url)
                        ? "#fff"
                        : "rgba(255,255,255,0.78)"
                      : colorPalette &&
                        colorPalette.primary &&
                        colorPalette.primary.contrastText
                      ? colorPalette.primary.contrastText
                      : colors.primary.dark,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.url)) {
                      e.currentTarget.style.backgroundColor = isDark
                        ? "rgba(255,255,255,0.06)"
                        : `${colors.primary.light}0D`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.url)) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 border"
                    style={{
                      backgroundColor: isDark
                        ? isActive(item.url)
                          ? `${colors.sidebar.itemBorderLeft}33`
                          : "transparent"
                        : isActive(item.url)
                        ? `${colors.primary.light}60`
                        : `${colors.background.default}50`,
                      borderColor: isDark
                        ? "transparent"
                        : isActive(item.url)
                        ? `${colors.primary.main}60`
                        : `${colors.primary.light}40`,
                    }}
                  >
                    <item.icon
                      className="w-4 h-4 transition-all duration-200"
                      style={{
                        color: isDark
                          ? isActive(item.url)
                            ? colors.sidebar.itemBorderLeft
                            : "rgba(255,255,255,0.6)"
                          : colorPalette &&
                            colorPalette.primary &&
                            colorPalette.primary.contrastText
                          ? colorPalette.primary.contrastText
                          : isActive(item.url)
                          ? colors.primary.dark
                          : colors.primary.main,
                      }}
                    />
                  </span>
                  <span
                    className="text-[13px] font-['Eudoxus Sans'] transition-colors duration-200 overflow-hidden text-ellipsis whitespace-nowrap flex-1"
                    style={{
                      color: isDark
                        ? isActive(item.url)
                          ? "#fff"
                          : "rgba(255,255,255,0.78)"
                        : colorPalette &&
                          colorPalette.primary &&
                          colorPalette.primary.contrastText
                        ? colorPalette.primary.contrastText
                        : colors.primary.dark,
                      fontWeight: isActive(item.url) ? "700" : "500",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-[10.5px] font-bold"
                      style={{
                        background: item.badgeAttention
                          ? "#F59E0B"
                          : isDark
                          ? "rgba(255,255,255,0.14)"
                          : `${colors.primary.light}26`,
                        color: item.badgeAttention
                          ? "#3D2600"
                          : isDark
                          ? "#fff"
                          : colors.primary.dark,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 pb-6 w-full">
          <div className="relative w-full flex justify-center">
            {userImageUrl ? (
              <div className="relative group">
                <img
                  className="w-16 h-16 rounded-full border-2 shadow-md transition-all duration-200 group-hover:shadow-lg group-hover:scale-125"
                  style={{
                    borderColor: REVA_COLORS.border.light,
                    objectFit: "cover",
                  }}
                  src={userImageUrl}
                  alt="User Avatar"
                  onError={(e) => {
                    e.currentTarget.src = ""; // Fallback to no image
                    e.currentTarget.alt = "No Image";
                  }}
                />
                {/* Subtle glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"
                  style={{
                    background: `linear-gradient(to right, ${REVA_COLORS.transparency.blue20}, ${REVA_COLORS.transparency.blue30})`,
                  }}
                ></div>
              </div>
            ) : (
              <div className="relative group">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-200 group-hover:shadow-lg"
                  style={{
                    background: `linear-gradient(to bottom right, ${REVA_COLORS.background.tertiary}, ${REVA_COLORS.gray[200]})`,
                    borderColor: REVA_COLORS.border.light,
                  }}
                >
                  <LucideUser
                    size={32}
                    className="transition-colors duration-200"
                    style={{
                      color: REVA_COLORS.text.muted,
                    }}
                  />
                </div>
                {/* Subtle glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"
                  style={{
                    background: `linear-gradient(to right, ${REVA_COLORS.transparency.blue20}, ${REVA_COLORS.transparency.blue30})`,
                  }}
                ></div>
              </div>
            )}

            {/* Status indicator */}
            <div
              className="absolute -bottom-1 right-[calc(50%-32px)] w-4 h-4 border-2 rounded-full shadow-sm"
              style={{
                backgroundColor: REVA_COLORS.status.success,
                borderColor: REVA_COLORS.text.light,
              }}
            ></div>
          </div>
        </div>
      </nav>
    </ScrollArea>
  );
}
