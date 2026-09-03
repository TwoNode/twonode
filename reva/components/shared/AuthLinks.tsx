"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs";
import { REVA_COLORS } from "@/reva/colors";

interface AuthLinksProps {
  dashboardType?: "user" | "admin";
  customLoginRedirect?: string;
  customRegisterRedirect?: string;
  showRegister?: boolean;
}

export const AuthLinks = ({
  dashboardType = "user",
  customLoginRedirect,
  customRegisterRedirect,
  showRegister = true,
}: AuthLinksProps) => {
  // Default redirect URLs based on dashboard type
  const defaultLoginRedirect =
    customLoginRedirect ||
    (dashboardType === "admin"
      ? "/api/auth/success/reva-restricted"
      : "/api/auth/success/reva");
  const defaultRegisterRedirect =
    customRegisterRedirect ||
    (dashboardType === "admin"
      ? "/api/auth/success/reva-restricted"
      : "/api/auth/success/reva");

  return (
    <div className="mt-6 flex justify-center gap-4">
      <LoginLink postLoginRedirectURL={defaultLoginRedirect}>
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
      </LoginLink>
      {showRegister && (
        <RegisterLink postLoginRedirectURL={defaultRegisterRedirect}>
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
        </RegisterLink>
      )}
    </div>
  );
};
