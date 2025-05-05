import Link from "next/link";
import React from "react";
import { SheetMenu } from "../admin-panel/sheet-menu";
import Image from "next/image";
// import { ModeToggle } from "../mode-toggle";

export const RevaUserDashboardNavbar = () => {
  return (
    <div className="w-full max-w-full h-[75px] max-md:h-[70px] px-[5%] bg-gradient-to-r from-blue-800 to-gray-900 justify-between items-center inline-flex">
      <Link href={"/reva"}>
        <Image
          src="/reva/revaLogo.png"
          alt="REVA Logo"
          width={50}
          height={50}
          className="bg-white/70 rounded-full w-12 max-md:w-11"
        />
      </Link>

      <div className="justify-start items-center gap-2.5 flex">
        <SheetMenu />

        {/* <ModeToggle /> */}
        <Link
          href="/reva/dashboard/newrequest"
          className="group relative inline-flex items-center justify-center rounded-2xl px-6 py-2 bg-gradient-to-r from-blue-700 to-blue-900 transition-all duration-300 ease-in-out hover:scale-105 hover:brightness-130"
        >
          <span className="text-sm text-[#f0f0f1] group-hover:text-white font-medium transition-colors duration-300">
            Make Request
          </span>
        </Link>
      </div>
    </div>
  );
};
