"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyEmailCard } from "@/components/auth/VerifyEmailCard";
import { RegisterVerifyLinkCard } from "@/components/auth/RegisterVerifyLinkCard";
import { VerifyEmailGate } from "@/components/auth/VerifyEmailGate";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

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
        platform={Platform.REVA}
        logoSrc="/reva/revaLogo.png"
        logoAlt="REVA Logo"
        accent="#008cff"
        accentDark="#032740"
        loginHref="/reva/login"
        dashboardHref="/reva/dashboard"
      />
    );
  }

  if (token) {
    return (
      <VerifyEmailCard
        platform={Platform.REVA}
        logoSrc="/reva/revaLogo.png"
        logoAlt="REVA Logo"
        accent="#008cff"
        accentDark="#032740"
        loginHref="/reva/login"
      />
    );
  }

  return (
    <VerifyEmailGate
      platform={Platform.REVA}
      logoSrc="/reva/revaLogo.png"
      logoAlt="REVA Logo"
      accent="#008cff"
      accentDark="#032740"
      loginHref="/reva/login"
      dashboardHref="/reva/dashboard"
    />
  );
}

export default function RevaVerifyEmailPage() {
  return (
    <AuthSplitLayout
      accent="#008cff"
      accentDark="#032740"
      eyebrow="REVA Workspace"
      headline="Track valuations with confidence."
      description="Sign in to manage property requests, approvals, and valuation reports — all in one place."
    >
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
