"use client";

import React from "react";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { Platform, RevaRole } from "@/utils/platform";

export default function RevaLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 to-blue-100 px-4 py-12">
      <NativeAuthCard
        platform={Platform.REVA}
        logoSrc="/reva/revaLogo.png"
        logoAlt="REVA Logo"
        title="Sign in to REVA"
        subtitle="Access your REVA dashboard and manage your requests securely."
        registerNotice="Set up your REVA account to submit and track requests."
        accent="#008cff"
        accentDark="#032740"
        allowRegister
        resolveRedirect={(role) =>
          role.toUpperCase() === RevaRole.USER
            ? "/reva/dashboard"
            : "/reva-restricted/dashboard"
        }
        alternateAuth={
          <LoginLink postLoginRedirectURL="/api/auth/success/reva">
            <Button
              variant="outline"
              className="w-full px-6 py-3 h-auto rounded-lg font-semibold text-base border-blue-200 text-blue-900 hover:bg-blue-50"
            >
              Continue with Google
            </Button>
          </LoginLink>
        }
      />
    </div>
  );
}
