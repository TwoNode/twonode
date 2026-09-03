"use client";

import React from "react";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { Platform, SurfboardRole } from "@/utils/platform";

export default function SurfboardLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-teal-50 to-blue-100 px-4 py-12">
      <NativeAuthCard
        platform={Platform.SURFBOARD}
        logoSrc="/surfboard/surf_logo.svg"
        logoAlt="Surfboard Logo"
        title="Sign in to Surfboard"
        subtitle="Access your Surfboard dashboard and manage your survey plans securely."
        registerNotice="Set up your Surfboard account to create and track survey plans."
        accent="#0077B6"
        accentDark="#023E8A"
        allowRegister
        resolveRedirect={(role) =>
          role.toUpperCase() === SurfboardRole.USER
            ? "/surfboard/dashboard"
            : "/surfboard-restricted/dashboard"
        }
        alternateAuth={
          <LoginLink postLoginRedirectURL="/api/auth/success/surfboard">
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
