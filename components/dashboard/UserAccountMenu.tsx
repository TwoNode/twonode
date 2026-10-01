"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "U";
}

export interface UserAccountMenuProps {
  name: string;
  email?: string;
  picture?: string | null;
  /** e.g. "Super Admin", "Admin", "Facilitator" — omitted entirely if not given. */
  roleLabel?: string;
  profileHref: string;
  settingsHref: string;
  /** Called after the user confirms the "Log out?" dialog — do the actual
   * fetch/redirect here (this component has no opinion on auth provider). */
  onLogout: () => void;
  size?: number;
  className?: string;
  /** CSS color for the avatar-fallback gradient and role badge — defaults to Surfboard blue. */
  accentColor?: string;
  accentColorDark?: string;
}

/**
 * Same account-menu pattern GBC admin already had (GBCUserMenu) — name,
 * email, role badge, Profile/Settings links, Sign Out — generalized so
 * Surfboard's facilitator navbar and admin/MDA DashboardShell can use it
 * too. Deliberately provider-agnostic: it takes an `onLogout` callback
 * instead of importing Kinde's LogoutLink directly, since Surfboard's
 * admin/MDA/facilitator sessions are native-JWT and must log out via
 * /api/auth/logout_redirect + router.push, not Kinde's hosted flow.
 */
export function UserAccountMenu({
  name,
  email,
  picture,
  roleLabel,
  profileHref,
  settingsHref,
  onLogout,
  size = 36,
  className,
  accentColor = "#2563EB",
  accentColorDark = "#1D4ED8",
}: UserAccountMenuProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const initials = getInitials(name || "User");
  const style = { width: size, height: size };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2",
              className,
            )}
            style={{ ...style, ["--tw-ring-color" as string]: accentColor }}
            aria-label="User account menu"
          >
            {picture ? (
              <img
                src={picture}
                alt={name}
                className="rounded-full object-cover shadow-sm ring-1 ring-black/5"
                style={style}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{
                  ...style,
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColorDark})`,
                }}
                title={name}
              >
                {initials}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 p-1.5 shadow-lg rounded-xl border border-gray-200 dark:border-white/10" align="end">
          <DropdownMenuLabel className="font-normal px-2 py-1.5">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                {name}
              </p>
              {email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={email}>
                  {email}
                </p>
              )}
              {roleLabel && (
                <span
                  className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-0.5"
                  style={{
                    backgroundColor: `${accentColor}14`,
                    color: accentColorDark,
                    borderColor: `${accentColor}33`,
                  }}
                >
                  {roleLabel}
                </span>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2">
              <Link href={profileHref} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2">
              <Link href={settingsHref} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setLogoutOpen(true);
            }}
            className="cursor-pointer rounded-lg px-2.5 py-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>You&apos;ll need to sign in again to continue.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
