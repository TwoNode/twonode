"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LucideIcon } from "lucide-react";
import { LucideUser } from "lucide-react";
import { REVA_COLORS } from "@/reva-colors";

interface LinkItem {
  icon: LucideIcon;
  label: string;
  url: string;
}

interface ElementItem {
  element: any;
}

export type MenuItem = LinkItem | ElementItem;

export interface MenuProps {
  items: MenuItem[];
  userImageUrl?: string;
}

export function Menu({ items, userImageUrl = "" }: MenuProps) {
  const pathname = usePathname();

  const isActive = (url: string) => pathname === url;

  return (
    <ScrollArea className="bg-transparent [&>div>div[style]]:!block h-full">
      <nav className="pt-16 h-full w-full flex flex-col justify-between overflow-y-auto box-border max-h-[85vh]">
        <ul className="flex flex-col gap-3 items-start space-y-1 px-2 justify-center">
          {items.map((item, index) =>
            "element" in item ? (
              <div key={index} className="w-full">
                {item?.element}
              </div>
            ) : (
              <Link
                key={index}
                href={item.url}
                className={cn(
                  "group flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-xl transition-all duration-200 ease-in-out",
                  "hover:scale-105 hover:shadow-sm"
                )}
                style={{
                  background: isActive(item.url)
                    ? `linear-gradient(to right, ${REVA_COLORS.transparency.blue20}, ${REVA_COLORS.transparency.blue30})`
                    : "transparent",
                  borderLeft: isActive(item.url)
                    ? `2px solid ${REVA_COLORS.primary.light}`
                    : "none",
                  color: isActive(item.url)
                    ? REVA_COLORS.text.primary
                    : REVA_COLORS.text.secondary,
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.url)) {
                    e.currentTarget.style.backgroundColor = `${REVA_COLORS.primary.light}10`;
                    e.currentTarget.style.color = REVA_COLORS.primary.light;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.url)) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = REVA_COLORS.text.secondary;
                  }
                }}
              >
                <span
                  className="w-max lg:mx-auto p-1.5 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isActive(item.url)
                      ? `${REVA_COLORS.primary.light}20`
                      : "transparent",
                  }}
                >
                  <item.icon
                    className="w-5 h-5 transition-all duration-200"
                    style={{
                      color: isActive(item.url)
                        ? REVA_COLORS.primary.light
                        : REVA_COLORS.text.muted,
                    }}
                  />
                </span>
                <span
                  className="text-center text-[10px] font-medium font-['Eudoxus Sans'] transition-colors duration-200"
                  style={{
                    color: isActive(item.url)
                      ? REVA_COLORS.text.primary
                      : REVA_COLORS.text.secondary,
                    fontWeight: isActive(item.url) ? "600" : "500",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            )
          )}
        </ul>

        <div className="mt-16 pb-8 w-full">
          <div className="relative w-full flex justify-center">
            {userImageUrl ? (
              <div className="relative group">
                <img
                  className="w-16 h-16 rounded-full border-2 shadow-md transition-all duration-200 group-hover:shadow-lg"
                  style={{
                    borderColor: REVA_COLORS.border.light,
                    objectFit: "cover"
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
