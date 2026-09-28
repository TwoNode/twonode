"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
  /** Sections start collapsed on first visit (still one click away, and auto-expand if the active page lives in them) — used to keep less-frequently-used groups from adding to the sidebar's default visual weight. */
  sectionCollapsedByDefault?: boolean;
  /** Small count pill rendered at the end of the row, e.g. a pending-items count. */
  badge?: number | string;
  /** Tints the badge to draw the eye (e.g. items needing action) instead of the neutral default. */
  badgeAttention?: boolean;
}

const COLLAPSED_SECTIONS_STORAGE_KEY = "sidebar:collapsed-sections";

function readStoredCollapsedSections(): Set<string> | null {
  try {
    const raw = localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY);
    if (!raw) return null;
    return new Set(JSON.parse(raw));
  } catch {
    return null;
  }
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
  const [avatarError, setAvatarError] = useState(false);

  // The trailing Logout element item is pulled out of the scrollable nav
  // list and rendered together with the avatar in the pinned-bottom footer
  // instead — see the footer block below.
  const linkItems = items.filter((item): item is LinkItem => !("element" in item));
  const elementItems = items.filter((item): item is ElementItem => "element" in item);

  const isActive = (url: string) => pathname === url;

  // Never collapse the section the current page lives in — landing on a
  // page and having its own nav entry hidden would be worse than the
  // clutter this is meant to fix.
  const activeSection = linkItems.find((item) => isActive(item.url))?.section;

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () =>
      new Set(
        linkItems
          .filter((i): i is LinkItem & { section: string } => !!i.section && !!i.sectionCollapsedByDefault)
          .map((i) => i.section)
      )
  );

  // Defaults above run identically on server and client (same `items` prop),
  // so this only overrides with the user's actual saved preference once the
  // browser's localStorage is available — no hydration mismatch.
  useEffect(() => {
    const stored = readStoredCollapsedSections();
    if (stored) setCollapsedSections(stored);
  }, []);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      try {
        localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Non-fatal — the toggle still works for the current session.
      }
      return next;
    });
  };

  const isSectionCollapsed = (section: string | undefined) =>
    !!section && section !== activeSection && collapsedSections.has(section);

  // A collapsed section peeks open on hover without touching the persisted
  // collapsedSections state — moving the mouse away re-collapses it exactly
  // as before. The active section is already exempt from collapsing at all
  // (isSectionCollapsed above), so it's unaffected by hover either way.
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // contrastText in this codebase's palettes is always a 3-digit hex ("#fff"),
  // which breaks naive `${hex}99` alpha-suffix concatenation (produces the
  // invalid 5-digit "#fff99"). Use a literal translucent white instead of
  // trying to alpha-blend the hex string.
  const mutedTextColor = isDark
    ? "rgba(255, 255, 255, 0.5)"
    : colorPalette && colorPalette.primary && colorPalette.primary.contrastText
    ? "rgba(255, 255, 255, 0.6)"
    : colors.text?.muted ?? colors.primary.main;

  // Grouped by consecutive `section` so a whole group (heading + its items)
  // can share one hover region — otherwise a flat map has no single element
  // to attach onMouseEnter/onMouseLeave to that spans both the heading and
  // the items it toggles.
  const sectionGroups: { section?: string; items: LinkItem[] }[] = [];
  for (const item of linkItems) {
    const last = sectionGroups[sectionGroups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else sectionGroups.push({ section: item.section, items: [item] });
  }

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
    <nav className="pt-4 pb-4 h-full w-full flex flex-col box-border">
      <ScrollArea className="bg-transparent [&>div>div[style]]:block! min-h-0 flex-1">
        <ul className="flex flex-col gap-1 items-start px-2 justify-center w-full">
          {sectionGroups.map((group, groupIndex) => {
            const collapsedByToggle = isSectionCollapsed(group.section);
            const isHovered = !!group.section && hoveredSection === group.section;
            const collapsed = collapsedByToggle && !isHovered;
            // `<ul>` only permits `<li>` as a direct child, so the shared
            // hover region for a section (heading + its items, peeking a
            // collapsed section open without a permanent click-toggle) is
            // the same enter/leave pair repeated on every <li> in the group
            // rather than one wrapping <div> — moving the mouse between
            // sibling <li>s in the same group re-sets the same section on
            // enter right after the leave clears it, so it never visibly
            // flickers closed.
            const onGroupMouseEnter = () => group.section && setHoveredSection(group.section);
            const onGroupMouseLeave = () =>
              setHoveredSection((prev) => (prev === group.section ? null : prev));

            return (
              <React.Fragment key={groupIndex}>
                {group.section && (
                  <li
                    className="w-full list-none"
                    onMouseEnter={onGroupMouseEnter}
                    onMouseLeave={onGroupMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(group.section!)}
                      className="flex w-full items-center justify-between gap-1 px-3 pt-3 pb-1.5"
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: mutedTextColor }}
                      >
                        {group.section}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          collapsed && "-rotate-90"
                        )}
                        style={{ color: mutedTextColor }}
                      />
                    </button>
                  </li>
                )}
                {group.items.map((item) => (
                  <li
                    key={item.url}
                    className="w-full list-none"
                    onMouseEnter={onGroupMouseEnter}
                    onMouseLeave={onGroupMouseLeave}
                  >
                    {!collapsed && <Link
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
                        ? "color-mix(in srgb, var(--color-brand-primary) 28%, transparent)"
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
                          ? "color-mix(in srgb, var(--color-brand-primary) 20%, transparent)"
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
                            ? "var(--color-brand-primary-light)"
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
                </Link>}
                  </li>
                ))}
              </React.Fragment>
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
              {userImageUrl && !avatarError ? (
                <img
                  className="h-10 w-10 rounded-full border-2 object-cover shadow-md"
                  style={{
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : colors.border.light,
                  }}
                  src={userImageUrl}
                  alt="User avatar"
                  onError={() => setAvatarError(true)}
                />
              ) : userName ? (
                // Google-style fallback: first letter of the user's name on a colored circle.
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold shadow-md"
                  style={{
                    background: isDark
                      ? "linear-gradient(to bottom right, var(--color-brand-primary), var(--color-brand-primary-dark))"
                      : `linear-gradient(to bottom right, ${colors.primary.main}, ${
                          "dark" in colors.primary ? colors.primary.dark : colors.primary.main
                        })`,
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : colors.border.light,
                    color: "#fff",
                  }}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
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
                  backgroundColor: isDark ? "var(--color-success)" : colors.status?.success ?? "#10b981",
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
