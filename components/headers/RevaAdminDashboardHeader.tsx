import Link from "next/link";
import React from "react";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import Image from "next/image";
import { MenuItem, MenuProps } from "@/components/sidebars/menu";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva-colors";
import NotificationBell from "@/components/NotificationBell";
import { canAccessRevaSuperAdminPanel } from "@/permissions";
// import { ModeToggle } from "../mode-toggle";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  emailVerified: boolean;
}

interface DashboardNavbarProps extends MenuProps {
  userData?: UserData | any;
}

export const RevaAdminDashboardNavbar = ({
  items,
  userImageUrl = "",
  userData,
}: DashboardNavbarProps) => {
  return (
    <div
      className="w-full max-w-full h-[75px] max-md:h-[70px] px-[5%] justify-between items-center inline-flex"
      style={{ background: REVA_GRADIENTS.header }}
    >
      <Link
        href={"/reva-restricted/dashboard"}
        className="flex items-center gap-2.5"
      >
        <Image
          src="/reva/revaLogo.png"
          alt="REVA Logo"
          width={50}
          height={50}
          className="bg-white/70 rounded-full w-12 max-md:w-11"
        />

        <h1 className="text-2xl font-bold text-white">REVA Admin</h1>
      </Link>

      <div className="justify-start items-center gap-2.5 flex">
        <SheetMenu items={items} userImageUrl={userImageUrl} />

        <NotificationBell
          href="/reva-restricted/dashboard/notifications"
          size={30}
          color="#fff"
        />

        {/* <ModeToggle /> */}

        {userData &&
        userData?.role &&
        canAccessRevaSuperAdminPanel(userData.role) ? (
          <Link
            href="/reva-restricted/dashboard/superadmin"
            className="group relative inline-flex items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 ease-in-out hover:scale-105 hover:brightness-130"
            style={{
              background: `linear-gradient(to right, ${REVA_COLORS.primary.main}, ${REVA_COLORS.secondary.main})`,
            }}
          >
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: REVA_COLORS.text.light }}
            >
              Add New Admin
            </span>
          </Link>
        ) : (
          <Link
            href="/reva-restricted/dashboard/alluserrequests"
            className="group relative inline-flex items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 ease-in-out hover:scale-105 hover:brightness-130"
            style={{
              background: `linear-gradient(to right, ${REVA_COLORS.primary.main}, ${REVA_COLORS.secondary.main})`,
            }}
          >
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: REVA_COLORS.text.light }}
            >
              All Requests
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};
