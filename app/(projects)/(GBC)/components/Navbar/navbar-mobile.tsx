"use client";

import { SidebarItems } from "@/types";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X, Newspaper } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarMobileProps {
  sidebarItems: SidebarItems;
}

export function SidebarMobile({ sidebarItems }: SidebarMobileProps) {
  const pathname = usePathname();

  return (
    <Sheet>
      <div className="z-200 w-full overflow-y-auto flex h-[54px] justify-between items-center gap-[80px]">
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
        className="z-999 bg-blue-100 px-3 py-4"
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
                        className={`mr-3 shrink-0 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                    )}
                    <span className="text-base">{item.label}</span>
                    {item.important && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-linear-to-r from-blue-100 to-blue-50 text-blue-700">
                        New
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
