"use client";

import React from "react";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform, SurfboardRole } from "@/utils/platform";
import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";

export default function SurfboardLoginPage() {
  return (
    <AuthSplitLayout
      accent="#2563EB"
      accentDark="#1D4ED8"
      background={SURFBOARD_GRADIENTS.hero}
      eyebrow="Surfboard"
      headline="Making Your Survey Practice Stand Out."
      description="Sign in to make every of your survey plan more trusted, valuable, accessible and connected."
    >
      <NativeAuthCard
        platform={Platform.SURFBOARD}
        logoSrc="/surfboard/surf_logo.svg"
        logoAlt="Surfboard Logo"
        title="Sign in to Surfboard"
        subtitle="Access your Surfboard dashboard and manage your survey plans securely."
        registerNotice="Set up your Surfboard account to create and track survey plans."
        accent="#2563EB"
        accentDark="#1D4ED8"
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
              className="w-full px-6 py-3 h-auto rounded-lg font-semibold text-base bg-white border-gray-300 text-[#3c4043] hover:bg-gray-50 dark:bg-white/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10 flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </LoginLink>
        }
      />
    </AuthSplitLayout>
  );
}
