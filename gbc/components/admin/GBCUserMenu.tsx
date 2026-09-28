"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";
import { gbcApi } from "@/gbc/apiClient";
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

interface SessionUser {
  firstName: string;
  lastName: string;
  email?: string;
  picture?: string | null;
  role?: string;
}

function getInitials(user: SessionUser): string {
  const a = user.firstName?.[0] ?? "";
  const b = user.lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "A";
}

interface GBCUserMenuProps {
  size?: number;
  className?: string;
}

export function GBCUserMenu({ size = 36, className }: GBCUserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    gbcApi.session
      .get()
      .then((result) => {
        if (!cancelled && result.success && result.data) {
          setUser(result.data as unknown as SessionUser);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    // Subtle skeleton placeholder while loading session
    return (
      <div
        className={cn("rounded-full bg-gray-200 animate-pulse", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin";
  const initials = getInitials(user);
  const style = { width: size, height: size };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
              className
            )}
            style={style}
            aria-label="User account menu"
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={fullName}
                className="rounded-full object-cover shadow-sm ring-1 ring-black/5"
                style={style}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                style={{
                  ...style,
                  background: "linear-gradient(135deg, #7C3AED, #9333EA)",
                }}
                title={fullName}
              >
                {initials}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56 p-1.5 shadow-lg rounded-xl border border-gray-200" align="end">
          <DropdownMenuLabel className="font-normal px-2 py-1.5">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                {fullName}
              </p>
              {user.email && (
                <p className="text-xs text-gray-500 truncate" title={user.email}>
                  {user.email}
                </p>
              )}
              {user.role && (
                <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 mt-0.5">
                  {user.role === "SUPERADMIN" ? "Super Admin" : "Admin"}
                </span>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2">
              <Link href="/gbc-restricted/profile" className="flex items-center gap-2 text-sm text-gray-700">
                <User className="h-4 w-4 text-gray-500" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2">
              <Link href="/gbc-restricted/settings" className="flex items-center gap-2 text-sm text-gray-700">
                <Settings className="h-4 w-4 text-gray-500" />
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
            className="cursor-pointer rounded-lg px-2.5 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
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
            <AlertDialogDescription>
              You&apos;ll need to sign in again to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                fetch("/api/auth/logout_redirect?from=gbc");
                router.push("/gbc-restricted/login");
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
