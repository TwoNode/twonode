"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Platform } from "@/utils/platform";

export default function GBCAdminLogin() {
  return (
    <AuthSplitLayout
      accent="#7C3AED"
      accentDark="#5B21B6"
      eyebrow="GBC Admin"
      headline="Geospatial Builders Conference."
      description="Administrator access only — manage editions, tickets, and attendee records."
      footerNote="Geospatial Builders Conference 2.0"
      notice={
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 shrink-0" />
            <p className="text-sm text-amber-800">
              Only pre-registered administrators can access this area. If you
              need admin access, please contact the system administrator.
            </p>
          </div>
        </div>
      }
    >
      <NativeAuthCard
        platform={Platform.GBC}
        logoSrc="/gbc2/gbc2DarkLogo.png"
        logoAlt="GBC Admin"
        title="GBC Admin Portal"
        subtitle="Administrator Access Only"
        accent="#7C3AED"
        accentDark="#5B21B6"
        resolveRedirect={() => "/gbc-restricted"}
        alternateAuth={
          <LoginLink postLoginRedirectURL="/api/auth/success/gbc-restricted">
            <Button
              variant="outline"
              className="w-full px-6 py-3 h-auto rounded-lg font-semibold text-base bg-white border-gray-300 text-[#3c4043] hover:bg-gray-50 flex items-center justify-center gap-3"
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
