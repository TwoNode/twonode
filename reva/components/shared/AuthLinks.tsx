"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { REVA_COLORS } from "@/reva/colors";

interface AuthLinksProps {
  dashboardType?: "user" | "admin";
  customLoginRedirect?: string;
  customRegisterRedirect?: string;
  showRegister?: boolean;
}

/**
 * Both buttons point at the native login page (`/reva/login` or
 * `/reva-restricted/login`) rather than Kinde's LoginLink/RegisterLink —
 * REVA's user/admin sessions are native-JWT-only, and that page's
 * NativeAuthCard already has its own login<->register toggle
 * (`allowRegister`), so "Register" just needs to land on the same page.
 */
export const AuthLinks = ({
  dashboardType = "user",
  customLoginRedirect,
  customRegisterRedirect,
  showRegister = true,
}: AuthLinksProps) => {
  const loginHref =
    customLoginRedirect ||
    (dashboardType === "admin" ? "/reva-restricted/login" : "/reva/login");
  const registerHref =
    customRegisterRedirect ||
    (dashboardType === "admin" ? "/reva-restricted/login" : "/reva/login");

  return (
    <div className="mt-6 flex justify-center gap-4">
      <Link href={loginHref}>
        <Button
          className="px-6 py-3 text-lg hover:border-2 transition-all"
          style={{
            backgroundColor: REVA_COLORS.primary.light,
            borderColor: REVA_COLORS.secondary.light,
            color: REVA_COLORS.text.light,
          }}
        >
          Sign In
        </Button>
      </Link>
      {showRegister && (
        <Link href={registerHref}>
          <Button
            className="px-6 py-3 text-lg hover:border-2 transition-all"
            style={{
              backgroundColor: REVA_COLORS.gray[600],
              borderColor: REVA_COLORS.gray[500],
              color: REVA_COLORS.text.light,
            }}
          >
            Register
          </Button>
        </Link>
      )}
    </div>
  );
};
