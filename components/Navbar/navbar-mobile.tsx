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

export function SidebarMobile(props: SidebarMobileProps) {
  const pathname = usePathname();

  const featurednewspage = {
    label: "Featured News",
    href: "/featurednews",
    icon: Newspaper,
  };

  return (
    <Sheet>
      <div className="w-full overflow-y-auto flex h-[54px] justify-between items-center gap-[80px]">
        <Link href={"/"} className="justify-start items-center flex">
          <img alt="" className="w-[202px] h-11" src="/logo.svg" />
        </Link>

        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="">
            <Menu color="red" size={20} />
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent side="left" className="bg-transparent px-3 py-4" hideClose>
        <SheetHeader className="bg-white flex flex-row justify-between items-center space-y-0 pb-6 pt-5 pr-3">
          <Link href={"/"} className="justify-start items-center flex">
            <img alt="" className="w-[200px] h-11" src="/logo.svg" />
          </Link>

          <SheetClose asChild>
            <Button className="h-7 w-7 p-0" variant="ghost">
              <X size={15} color="red" className="border border-red-300" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="h-full mt-5 flex flex-col w-full gap-1">
          <div className="-my-6 divide-y divide-gray-500/10">
            <div className="space-y-2 py-6">
              <div className="flex flex-col justify-start items-center gap-[10px]">
                {props.sidebarItems.links.map((item, ind) => {
                  return (
                    <Link
                      key={ind}
                      href={item.href}
                      className={`group rounded-xl w-full p-0 items-center flex cursor-pointer hover:bg-gray-600`}
                    >
                      <SidebarButton
                        variant="link"
                        // variant={pathname === item.href ? "secondary" : "ghost"}
                        icon={item.icon}
                        className={`group-hover:translate-x-1 py-6 duration-200 w-full flex items-center leading-5 ${
                          pathname === item.href
                            ? "font-extrabold"
                            : "font-normal"
                        }`}
                      >
                        <span
                          className={`text-white text-xl ${
                            item.important ? "glow-link" : ""
                          }`}
                        >
                          {item.label}
                        </span>
                      </SidebarButton>
                    </Link>
                  );
                })}
                <Link
                  href={featurednewspage.href}
                  className="group rounded-xl w-full p-0 items-center flex cursor-pointer hover:bg-gray-600"
                >
                  <SidebarButton
                    variant="link"
                    // variant={pathname === item.href ? "secondary" : "ghost"}
                    icon={featurednewspage.icon}
                    className={`group-hover:translate-x-1 py-9 duration-200 w-full flex items-center  leading-7 ${
                      pathname === featurednewspage.href
                        ? "font-extrabold"
                        : "font-normal"
                    }`}
                  >
                    <span className="text-white text-xl">
                      {featurednewspage.label}
                    </span>
                  </SidebarButton>
                </Link>
                <Link
                  href={"/signup"}
                  className="cursor-pointer h-10 w-full bg-white text-sky-950 border border-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                >
                  <div className="text-center text- text-base font-semibold  leading-7">
                    Sign Up
                  </div>
                </Link>
                <Link
                  href={"/login"}
                  className="cursor-pointer w-full h-10 bg-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                >
                  <div className="text-center text-white text-base font-semibold  leading-7">
                    Login
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
