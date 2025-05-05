import React from "react";
import Link from "next/link";

import { User, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const LanndingPageHeader = () => {
  return (
    <div className="w-full h-[90px] px-[5%] bg-[#f1b807] justify-between items-center inline-flex">
      <img src={"/logo.svg"} />
      <div className="max-sm:hidden justify-start items-center gap-2.5 flex">
        <Link
          href={"/login"}
          className="px-10 py-3 rounded border border-[#021f33] justify-center items-center gap-2.5 flex"
        >
          <span className="whitespace-nowrap text-center text-[#021f33] text-xl font-bold">
            Log In
          </span>
        </Link>
        <Link
          href={"/register"}
          className="px-10 py-3 bg-[#086cb4] rounded justify-center items-center gap-2.5 flex"
        >
          <span className="whitespace-nowrap text-center text-[#f0f0f1] text-xl font-bold font-['Eudoxus Sans']">
            Sign Up
          </span>
        </Link>
      </div>

      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Menu</Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/login">
                  <User className="mr-2 h-4 w-4" />
                  <span>Log In</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/register">
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Sign Up</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
