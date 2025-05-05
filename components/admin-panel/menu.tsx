"use client";

import Link from "next/link";
import { Ellipsis, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  calendarSvgIcon,
  exploreSvgIcon,
  homeSvgIcon,
  notificationSvgIcon,
} from "../svgs";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

interface MenuProps {
  isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const { user } = useKindeBrowserClient();

  const isActive = (url: string) => {
    return pathname === url;
  };
  const activeClassName = "bg-[#008cff6e] text-[#032740]";
  const inactiveClassName = "text-[#032740]";
  const activeIconClassName = "text-[#032740]";
  const inactiveIconClassName = "text-[#032740]";

  const dashboardUrl = "/reva/dashboard";

  const menuList = [
    { icon: homeSvgIcon, label: "Home", url: dashboardUrl },
    {
      icon: exploreSvgIcon,
      label: "All Requests",
      url: `${dashboardUrl}/allrequests`,
    },
    {
      icon: calendarSvgIcon,
      label: "New Request",
      url: `${dashboardUrl}/newrequest`,
    },
    {
      icon: notificationSvgIcon,
      label: "Settings",
      url: `${dashboardUrl}/settings`,
    },
    {
      element: (
        <LogoutLink
          // postLogoutRedirectURL="/dashboard"
          className="flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-lg"
        >
          <span className="w-max lg:mx-auto">
            <LogOut />
          </span>
          <span className="text-center text-[#032740] text-[10px] font-medium font-['Eudoxus Sans']">
            Logout
          </span>
        </LogoutLink>
      ),
      label: "Logout",
      url: "/login",
    },
  ];

  return (
    <ScrollArea className="bg-[#f0f2f4] [&>div>div[style]]:!block h-full">
      <nav className="pt-14 h-full w-full flex flex-col justify-between overflow-y-auto box-border max-h-[85vh]">
        <ul className="flex flex-col gap-6 items-start space-y-1 px-2 justify-center">
          {menuList.map((item, index) =>
            item?.element ? (
              item?.element
            ) : (
              <Link
                className={cn(
                  "flex flex-col items-center justify-center gap-2.5 w-full h-[60px] rounded-lg",
                  isActive(item.url) ? activeClassName : inactiveClassName,
                  isActive(item.url)
                    ? activeIconClassName
                    : inactiveIconClassName
                )}
                href={item.url}
                key={index}
              >
                <span className="w-max lg:mx-auto">{item.icon}</span>
                <span className="text-center text-[#032740] text-[10px] font-medium font-['Eudoxus Sans']">
                  {item.label}
                </span>
              </Link>
            )
          )}
        </ul>

        <div className="mt-20 pb-12">
          <div className="image ">
            <img
              className="w-20 h-20 rounded-full mx-auto"
              src={user?.picture!}
            />
          </div>
        </div>
      </nav>
    </ScrollArea>
  );
}
