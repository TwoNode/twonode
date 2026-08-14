"use client";

import Link from "next/link";
import { SidebarMobile } from "./navbar-mobile";
import { navbarItems } from "./navbarItems";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

interface NavbarItemProps {
  href: string;
  label: string;
  icon?: LucideIcon;
  important?: boolean;
  className?: string;
}

const Navbar = () => {
  const pathname = usePathname();

  const renderNavItem = (item: NavbarItemProps) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`text-center text-base leading-7 transition-all duration-200 ${
          item.important
            ? `${item.className || ""} hover:opacity-90 hover:scale-105`
            : `text-sky-950 hover:text-blue-600 ${isActive ? "font-bold" : "font-normal"}`
        }`}
      >
        {item.important && Icon ? (
          <span className="flex items-center gap-1.5">
            <Icon className="w-4 h-4" />
            {item.label}
          </span>
        ) : (
          item.label
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="h-22.5 w-full" />
      <div className="absolute top-0 right-0 left-0 z-999 inline-flex w-full h-22.5 px-[1%] pt-4.75 pb-5 bg-white justify-center items-center">
        <div className="w-full hidden lg:flex h-13.5 justify-between items-center gap-20">
          <div className="w-full h-21 px-[3%] md:px-[4%] lg:px-[8%] py-5 bg-white flex-col justify-center items-center gap-2.5 inline-flex">
            <div className="w-full justify-between items-center inline-flex">
              <Link href={"/"} className="justify-start items-center flex">
                <img alt="" className="" src="/logo.svg" />
              </Link>
              <div className="justify-start items-center xl:gap-6.25 gap-3.75 flex transition-all duration-300 ease-in-out">
                {navbarItems.links.map((item) => renderNavItem(item))}
              </div>

              <div className="hidden 2xl:flex items-center justify-end gap-3">
                <Link
                  href={"/signup"}
                  className="cursor-pointer w-30 h-11 px-5 py-2 bg-white text-sky-950 border border-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                >
                  <div className="text-center text-sky-950 text-base font-semibold  leading-7">
                    Sign Up
                  </div>
                </Link>
                <Link
                  href={"/login"}
                  className="cursor-pointer w-30 h-11 px-5 py-2 bg-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                >
                  <div className="text-center text-white text-base font-semibold  leading-7">
                    Login
                  </div>
                </Link>
              </div>
              <div className="2xl:hidden flex">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <User />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel></DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link
                        href={"/signup"}
                        className="cursor-pointer w-30 h-11 px-5 py-2 bg-white text-sky-950 border border-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                      >
                        <div className="text-center text-sky-950 text-base font-semibold  leading-7">
                          Sign Up
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link
                        href={"/login"}
                        className="cursor-pointer w-30 h-11 px-5 py-2 bg-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                      >
                        <div className="text-center text-white text-base font-semibold  leading-7">
                          Login
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE NAVBAR RESPONSIVE */}
        <div className="lg:hidden w-full">
          <SidebarMobile sidebarItems={navbarItems} />
        </div>
      </div>
    </>
  );
};

export default Navbar;
