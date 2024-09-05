"use client";

import Link from "next/link";
import React from "react";

import { SidebarMobile } from "./navbar-mobile";
import { navbarItems } from "./navbarItems";
import { usePathname } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

const Navbar = () => {
  const pathname = usePathname();

  return (
    <>
      <div className="h-[90px] w-full" />
      <div className="absolute top-0 right-0 left-0 z-50 inline-flex w-full h-[90px] px-[1%] pt-[19px] pb-5 bg-white justify-center items-center">
        <div className="w-full hidden lg:flex h-[54px] justify-between items-center gap-[80px]">
          <div className="w-full h-[84px] px-[3%] md:px-[4%] lg:px-[8%] py-5 bg-white flex-col justify-center items-center gap-2.5 inline-flex">
            <div className="w-full justify-between items-center inline-flex">
              <Link href={"/"} className="justify-start items-center flex">
                <img alt="" className="" src="/logo.svg" />
              </Link>
              <div className="justify-start items-center gap-[35px] flex">
                {navbarItems.links.map((item, ind) => (
                  <Link
                    key={ind}
                    href={item.href}
                    className={`text-center text-sky-950 text-base leading-7 ${
                      pathname === item.href ? "font-bold" : "font-normal"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="hidden 2xl:flex items-center justify-end gap-3">
                <Link
                  href={"/signup"}
                  className="cursor-pointer w-[120px] h-11 px-5 py-2 bg-white text-sky-950 border border-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                >
                  <div className="text-center text-sky-950 text-base font-semibold  leading-7">
                    Sign Up
                  </div>
                </Link>
                <Link
                  href={"/login"}
                  className="cursor-pointer w-[120px] h-11 px-5 py-2 bg-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
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
                        className="cursor-pointer w-[120px] h-11 px-5 py-2 bg-white text-sky-950 border border-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
                      >
                        <div className="text-center text-sky-950 text-base font-semibold  leading-7">
                          Sign Up
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link
                        href={"/login"}
                        className="cursor-pointer w-[120px] h-11 px-5 py-2 bg-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
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
        <div className="w-full  z-[90] h-full lg:hidden">
          <SidebarMobile sidebarItems={navbarItems} />
        </div>
      </div>
    </>
  );
};

export default Navbar;
