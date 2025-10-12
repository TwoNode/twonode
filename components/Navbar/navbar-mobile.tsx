"use client";

import { SidebarItems } from "@/types";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Menu, X, Newspaper } from "lucide-react";
import Link from "next/link";
import { SidebarButtonSheet as SidebarButton } from "./sidebar-button";
import { usePathname } from "next/navigation";

interface SidebarMobileProps {
  sidebarItems: SidebarItems;
}

export function SidebarMobile({ sidebarItems }: SidebarMobileProps) {
  const pathname = usePathname();

  const featurednewspage = {
    label: "Featured News",
    href: "/featurednews",
    icon: Newspaper,
  };

  return (
    <Sheet>
      <div className="z-[200] w-full overflow-y-auto flex h-[54px] justify-between items-center gap-[80px]">
        <Link href={"/"} className="justify-start items-center flex">
          <img alt="" className="w-[202px] h-11" src="/logo.svg" />
        </Link>

        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="">
            <Menu color="red" size={20} />
          </Button>
        </SheetTrigger>
      </div>

      <SheetContent
        side="left"
        className="z-[999] bg-blue-100 px-3 py-4"
        hideClose
      >
        <SheetHeader className="flex flex-row justify-between items-center space-y-0 pb-6 pt-5 pr-3">
          <Link href={"/"} className="justify-start items-center flex">
            <img alt="" className="w-[200px] h-11" src="/logo.svg" />
          </Link>

          <SheetClose asChild>
            <Button className="h-7 w-7 p-0" variant="ghost">
              <X size={15} color="red" className="border border-red-300" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="h-full mt-5 flex flex-col w-full gap-1 overflow-y-auto">
          <div className="space-y-2 py-2">
            {sidebarItems.links.map((item, ind) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <div key={ind} className="mb-2">
                  <Link
                    href={item.href}
                    className={`group flex items-center w-full p-3 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? "bg-gray-100 text-blue-600 font-semibold"
                        : "text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {Icon && (
                      <div
                        className={`mr-3 flex-shrink-0 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                    )}
                    <span className="text-base">{item.label}</span>
                    {item.important && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700">
                        New
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}

            {/* Featured News */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                More
              </h3>
              <Link
                href={featurednewspage.href}
                className={`group flex items-center w-full p-3 rounded-lg transition-colors duration-200 ${
                  pathname === featurednewspage.href
                    ? "bg-gray-100 text-blue-600 font-semibold"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                <Newspaper
                  size={20}
                  className={`mr-3 ${
                    pathname === featurednewspage.href
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                />
                <span className="text-base">{featurednewspage.label}</span>
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="mt-8 space-y-3 pt-4 border-t border-gray-200">
              <Link
                href={"/signup"}
                className="block w-full px-4 py-2.5 text-center text-sm font-medium text-sky-950 bg-white border border-sky-950 rounded-full hover:bg-gray-50 transition-colors duration-200"
              >
                Sign Up
              </Link>
              <Link
                href={"/login"}
                className="block w-full px-4 py-2.5 text-center text-sm font-medium text-white bg-sky-950 rounded-full hover:bg-sky-900 transition-colors duration-200"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
