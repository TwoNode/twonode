"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyEmailCard } from "@/components/auth/VerifyEmailCard";
import { RegisterVerifyLinkCard } from "@/components/auth/RegisterVerifyLinkCard";
import { VerifyEmailGate } from "@/components/auth/VerifyEmailGate";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";
import { useEditionFooterNote } from "@/gbc/hooks/useEditionFooterNote";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const pendingRegistrationId = searchParams?.get("pid");

  if (token && pendingRegistrationId) {
    return (
      <RegisterVerifyLinkCard
        platform={Platform.GBC}
        logoSrc="/gbc2/gbc2DarkLogo.png"
        logoAlt="GBC Admin"
        accent="#7C3AED"
        accentDark="#5B21B6"
        loginHref="/gbc-restricted/login"
        dashboardHref="/gbc-restricted"
      />
    );
  }

  if (token) {
    return (
      <VerifyEmailCard
        platform={Platform.GBC}
        logoSrc="/gbc2/gbc2DarkLogo.png"
        logoAlt="GBC Admin"
        accent="#7C3AED"
        accentDark="#5B21B6"
        loginHref="/gbc-restricted/login"
      />
    );
  }

  return (
    <VerifyEmailGate
      platform={Platform.GBC}
      logoSrc="/gbc2/gbc2DarkLogo.png"
      logoAlt="GBC Admin"
      accent="#7C3AED"
      accentDark="#5B21B6"
      loginHref="/gbc-restricted/login"
      dashboardHref="/gbc-restricted"
    />
  );
}

export default function GBCVerifyEmailPage() {
  const footerNote = useEditionFooterNote();

  return (
    <AuthSplitLayout
      accent="#7C3AED"
      accentDark="#5B21B6"
      eyebrow="GBC Admin"
      headline="Geospatial Builders Conference."
      description="Administrator access only — manage editions, tickets, and attendee records."
      footerNote={footerNote}
    >
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
