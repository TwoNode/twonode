"use client";

import { Suspense } from "react";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";
import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";

export default function SurfboardResetPasswordPage() {
  return (
    <AuthSplitLayout
      accent="#233dff"
      accentDark="#141c4d"
      background={SURFBOARD_GRADIENTS.hero}
      eyebrow="Surfboard"
      headline="Making Your Survey Practice Stand Out."
      description="Sign in to make every of your survey plan more trusted, valuable, accessible and connected."
    >
      <Suspense>
        <ResetPasswordCard
          platform={Platform.SURFBOARD}
          logoSrc="/surfboard/surf_logo.svg"
          logoAlt="Surfboard Logo"
          accent="#233dff"
          accentDark="#141c4d"
          loginHref="/surfboard/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
