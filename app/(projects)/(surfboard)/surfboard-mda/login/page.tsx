"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform } from "@/utils/platform";

const postLoginRedirectURL = "/api/auth/success/surf-mda";

export default function SurfMDALoginPage() {
  return (
    <AuthSplitLayout
      accent="#6D28D9"
      accentDark="#4C1D95"
      eyebrow="MDA Portal"
      headline="Ministries, Departments & Agencies."
      description="Sign in to your MDA workspace to manage submissions, approvals, and inter-agency records."
      networkVariant="mda"
    >
      <NativeAuthCard
        platform={Platform.SURFBOARD}
        logoSrc="/OSSG_Logo.png"
        logoAlt="MDA Logo"
        title="MDA Portal"
        subtitle="Ministry, Department & Agency access."
        accent="#6D28D9"
        accentDark="#4C1D95"
        resolveRedirect={() => "/surfboard-mda/dashboard"}
        alternateAuth={
          <LoginLink postLoginRedirectURL={postLoginRedirectURL}>
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
