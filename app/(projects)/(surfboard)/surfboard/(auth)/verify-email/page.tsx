"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyEmailCard } from "@/components/auth/VerifyEmailCard";
import { RegisterVerifyLinkCard } from "@/components/auth/RegisterVerifyLinkCard";
import { VerifyEmailGate } from "@/components/auth/VerifyEmailGate";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";
import { SURFBOARD_GRADIENTS } from "@/surfboard/colors";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const pendingRegistrationId = searchParams?.get("pid");

  // A `pid` alongside the token means this link came from OTP-first
  // registration's LINK method (lib/auth/pendingRegistration.ts) — no
  // account exists yet, completing registration is what this click does.
  // Without it, it's the existing-account verify-email link.
  if (token && pendingRegistrationId) {
    return (
      <RegisterVerifyLinkCard
        platform={Platform.SURFBOARD}
        logoSrc="/surfboard/surf_logo.svg"
        logoAlt="Surfboard Logo"
        accent="#233dff"
        accentDark="#141c4d"
        loginHref="/surfboard/login"
        dashboardHref="/surfboard/dashboard"
      />
    );
  }

  if (token) {
    return (
      <VerifyEmailCard
        platform={Platform.SURFBOARD}
        logoSrc="/surfboard/surf_logo.svg"
        logoAlt="Surfboard Logo"
        accent="#233dff"
        accentDark="#141c4d"
        loginHref="/surfboard/login"
      />
    );
  }

  return (
    <VerifyEmailGate
      platform={Platform.SURFBOARD}
      logoSrc="/surfboard/surf_logo.svg"
      logoAlt="Surfboard Logo"
      accent="#233dff"
      accentDark="#141c4d"
      loginHref="/surfboard/login"
      dashboardHref="/surfboard/dashboard"
    />
  );
}

export default function SurfboardVerifyEmailPage() {
  return (
    <AuthSplitLayout
      accent="#233dff"
      accentDark="#141c4d"
      background={SURFBOARD_GRADIENTS.hero}
      eyebrow="Surfboard"
      headline="Making Your Survey Practice Stand Out."
      description="Sign in to make every of your survey plan more trusted, valuable, accessible and connected."
    >
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
