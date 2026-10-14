"use client";

import React from "react";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Suspense } from "react";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";
import { Button } from "@/components/ui/button";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform, SurfboardRole } from "@/utils/platform";
import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";

export default function SurfboardLoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SetCookieFromClient
          param="post_login_redirect_url"
          cookieName="my_redirect_url"
        />
      </Suspense>
      <AuthSplitLayout
        // Matches SURFBOARD_GRADIENTS.hero's own two endpoints (electric blue /
        // navy) so the heading, subtitle, and Sign-in button read as the same
        // "new blue" identity as the background panel, instead of the older
        // flat #2563EB blue.
        accent="#233dff"
        accentDark="#141c4d"
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
          accent="#233dff"
          accentDark="#141c4d"
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
    </>
  );
}
