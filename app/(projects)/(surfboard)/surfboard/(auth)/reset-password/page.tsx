"use client";

import { Suspense } from "react";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

export default function SurfboardResetPasswordPage() {
  return (
    <AuthSplitLayout
      accent="#0077B6"
      accentDark="#023E8A"
      eyebrow="Surfboard"
      headline="Making Your Survey Practice Stand Out."
      description="Sign in to make every of your survey plan more trusted, valuable, accessible and connected."
    >
      <Suspense>
        <ResetPasswordCard
          platform={Platform.SURFBOARD}
          logoSrc="/surfboard/surf_logo.svg"
          logoAlt="Surfboard Logo"
          accent="#0077B6"
          accentDark="#023E8A"
          loginHref="/surfboard/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
