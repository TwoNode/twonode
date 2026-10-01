"use client";

import React from "react";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform, RevaRole } from "@/utils/platform";

export default function RevaLogin() {
  return (
    <AuthSplitLayout
      accent="#008cff"
      accentDark="#032740"
      eyebrow="REVA Workspace"
      headline="Track valuations with confidence."
      description="Sign in to manage property requests, approvals, and valuation reports — all in one place."
    >
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
