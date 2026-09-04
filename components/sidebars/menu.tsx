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
  /** Shown next to the avatar in the bottom footer, alongside userRole. */
  userName?: string;
  userRole?: string;
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

export function Menu({
  items,
  userImageUrl = "",
  userName,
  userRole,
  colorPalette,
  variant = "auto",
}: MenuProps) {
  const colors = colorPalette || require("@/reva/colors").REVA_COLORS;
  const pathname = usePathname();
  const sidebar = useStore(useSidebar, (x) => x);
  const isDark = variant === "dark";

  // The trailing Logout element item is pulled out of the scrollable nav
  // list and rendered together with the avatar in the pinned-bottom footer
  // instead — see the footer block below.
  const linkItems = items.filter((item): item is LinkItem => !("element" in item));
  const elementItems = items.filter((item): item is ElementItem => "element" in item);

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

  // The footer (avatar + logout) needs to sit flush against the sidebar's
  // real bottom edge regardless of how many nav items there are above it.
  // Radix's ScrollArea Viewport wraps its content in an unstyled div that
  // shrinks to fit its content rather than stretching to fill its parent —
  // so putting `justify-between` on a `<nav>` *inside* the ScrollArea (the
  // previous approach) never had real leftover space to distribute, and the
  // footer ended up sitting right under the last nav item instead of at the
  // bottom. Scoping ScrollArea to just the scrollable link list, and letting
  // the footer live outside it as a `shrink-0` sibling in a `nav` that
  // itself gets the sidebar's full real height, fixes that.
  return (
    <nav className="pt-4 h-full w-full flex flex-col box-border">
      <ScrollArea className="bg-transparent [&>div>div[style]]:block! min-h-0 flex-1">
        <ul className="flex flex-col gap-1 items-start px-2 justify-center w-full">
          {linkItems.map((item, index) => {
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
      </ScrollArea>

      {/* Footer — a shrink-0 sibling of the scrollable link list above, so it
          always sits flush against the sidebar's bottom edge. Avatar,
          name/role, and the Logout action (pulled out of the item list
          above) render together as one row instead of a lone avatar with
          Logout buried mid-list. */}
      <div
        className="mt-2 w-full shrink-0 border-t px-2.5 pt-3 pb-3"
        style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : `${colors.primary.light}22`,
        }}
      >
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              {userImageUrl ? (
                <img
                  className="h-10 w-10 rounded-full border-2 object-cover shadow-md"
                  style={{
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : colors.border.light,
                  }}
                  src={userImageUrl}
                  alt="User avatar"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-md"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.08)"
                      : `linear-gradient(to bottom right, ${colors.background.tertiary}, ${colors.gray[200]})`,
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : colors.border.light,
                  }}
                >
                  <LucideUser
                    size={18}
                    style={{ color: isDark ? "rgba(255,255,255,0.55)" : colors.text.muted }}
                  />
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                style={{
                  backgroundColor: colors.status?.success ?? "#10b981",
                  borderColor: isDark ? "#0A0F16" : "#fff",
                }}
              />
            </div>

            {userName && (
              <div className="min-w-0 flex-1">
                <strong
                  className="block truncate text-[12.5px] font-semibold"
                  style={{ color: isDark ? "#fff" : colors.text?.primary ?? colors.primary.dark }}
                >
                  {userName}
                </strong>
                {userRole && (
                  <span
                    className="block truncate text-[10.5px]"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.45)" : colors.text?.muted ?? colors.primary.light,
                    }}
                  >
                    {userRole}
                  </span>
                )}
              </div>
            )}

            {elementItems.map((item, index) => (
              <div key={index} className="ml-auto shrink-0">
                {item.element}
              </div>
            ))}
          </div>
        </div>
    </nav>
  );
}
