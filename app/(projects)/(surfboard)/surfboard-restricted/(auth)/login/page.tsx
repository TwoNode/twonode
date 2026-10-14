"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Suspense } from "react";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform } from "@/utils/platform";
import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";

const postLoginRedirectURL = "/api/auth/success/surf-restricted";

export default function SurfRestrictedLoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SetCookieFromClient
          param="post_login_redirect_url"
          cookieName="my_redirect_url"
        />
      </Suspense>
      <AuthSplitLayout
        // Same hero gradient + matching accent as the surveyor login page, so
        // admin reads as the same brand identity instead of falling back to a
        // different flat blue formula.
        accent="#233dff"
        accentDark="#141c4d"
        background={SURFBOARD_GRADIENTS.hero}
        eyebrow="Surfboard Restricted"
        headline="Restricted operations access."
        description="This area is limited to authorized Surfboard staff. Contact your administrator if you believe you should have access."
        notice={
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 shrink-0" />
              <p className="text-sm text-amber-800">
                Restricted area. Authorized staff only.
              </p>
            </div>
          </div>
        }
      >
        <NativeAuthCard
          platform={Platform.SURFBOARD}
          logoSrc="/surfboard/surf_logo.svg"
          logoAlt="Surfboard Logo"
          title="Restricted Access"
          subtitle="Authorized users only. Please sign in to continue."
          accent="#233dff"
          accentDark="#141c4d"
          resolveRedirect={() => "/surfboard-restricted/dashboard"}
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
    </>
  );
}
