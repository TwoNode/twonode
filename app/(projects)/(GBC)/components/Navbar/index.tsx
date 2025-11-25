"use client";

import Link from "next/link";
import { SidebarMobile } from "./navbar-mobile";
import { gbcNavbarItems } from "./navbarItems";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface NavbarItemProps {
  href: string;
  label: string;
  icon?: LucideIcon;
  important?: boolean;
  className?: string;
}

const GBC2Navbar = () => {
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
            : `text-sky-950 hover:text-blue-600 ${
                isActive ? "font-bold" : "font-normal"
              }`
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
      <div className="h-[90px] w-full" />
      <div className="absolute top-0 right-0 left-0 z-999 inline-flex w-full h-[90px] px-[1%] pt-[19px] pb-5 bg-white justify-center items-center">
        <div className="w-full hidden lg:flex h-[54px] justify-between items-center gap-[80px]">
          <div className="w-full h-[84px] px-[3%] md:px-[4%] lg:px-[8%] py-5 bg-white flex-col justify-center items-center gap-2.5 inline-flex">
            <div className="w-full justify-between items-center inline-flex">
              <Link href={"/"} className="justify-start items-center flex">
                <img alt="" className="" src="/logo.svg" />
              </Link>

              <div className="justify-start items-center xl:gap-[25px] gap-[15px] flex transition-all duration-300 ease-in-out">
                {gbcNavbarItems.links.map((item) => renderNavItem(item))}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE NAVBAR RESPONSIVE */}
        <div className="lg:hidden w-full">
          <SidebarMobile sidebarItems={gbcNavbarItems} />
        </div>
      </div>
    </>
  );
};

export default GBC2Navbar;
