"use client";

import { Suspense } from "react";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

export default function SurfboardResetPasswordPage() {
  return (
    <AuthSplitLayout
      accent="#2563EB"
      accentDark="#1D4ED8"
      eyebrow="Surfboard"
      headline="Making Your Survey Practice Stand Out."
      description="Sign in to make every of your survey plan more trusted, valuable, accessible and connected."
    >
      <Suspense>
        <ResetPasswordCard
          platform={Platform.SURFBOARD}
          logoSrc="/surfboard/surf_logo.svg"
          logoAlt="Surfboard Logo"
          accent="#2563EB"
          accentDark="#1D4ED8"
          loginHref="/surfboard/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
