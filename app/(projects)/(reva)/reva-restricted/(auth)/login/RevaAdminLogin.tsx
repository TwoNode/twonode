"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform } from "@/utils/platform";

export default function RevaAdminLogin() {
  return (
    <AuthSplitLayout
      accent="#008cff"
      accentDark="#032740"
      eyebrow="REVA Admin"
      headline="Administrator console."
      description="Manage REVA operations, users, and requests from a single dashboard."
      notice={
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 shrink-0" />
            <p className="text-sm text-amber-800">
              Admin access only. If you need access to this portal, please
              contact the system administrator.
            </p>
          </div>
        </div>
      }
    >
      <NativeAuthCard
        platform={Platform.REVA}
        logoSrc="/reva/revaLogo.png"
        logoAlt="REVA Logo"
        title="REVA Admin Login"
        subtitle="Admin access only. Please sign in to continue."
        accent="#008cff"
        accentDark="#032740"
        resolveRedirect={() => "/reva-restricted/dashboard"}
        alternateAuth={
          <LoginLink postLoginRedirectURL="/api/auth/success/reva-restricted">
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
