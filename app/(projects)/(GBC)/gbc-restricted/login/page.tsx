"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { NativeAuthCard } from "@/components/auth/NativeAuthCard";
import { Platform } from "@/utils/platform";

export default function GBCAdminLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 to-purple-100 px-4 py-12">
      <div className="max-w-md w-full mb-4">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 shrink-0" />
            <p className="text-sm text-amber-800">
              Only pre-registered administrators can access this area. If you
              need admin access, please contact the system administrator.
            </p>
          </div>
        </div>
      </div>

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
              className="w-full px-6 py-3 h-auto rounded-lg font-semibold text-base border-purple-200 text-purple-900 hover:bg-purple-50"
            >
              Continue with Google
            </Button>
          </LoginLink>
        }
      />

      <p className="text-sm text-gray-500 mt-4">
        Geospatial Builders Conference 2.0
      </p>
    </div>
  );
}
