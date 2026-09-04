"use client";

import { Suspense } from "react";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

export default function GBCResetPasswordPage() {
  return (
    <AuthSplitLayout
      accent="#7C3AED"
      accentDark="#5B21B6"
      eyebrow="GBC Admin"
      headline="Geospatial Builders Conference."
      description="Administrator access only — manage editions, tickets, and attendee records."
      footerNote="Geospatial Builders Conference 2.0"
    >
      <Suspense>
        <ResetPasswordCard
          platform={Platform.GBC}
          logoSrc="/gbc2/gbc2DarkLogo.png"
          logoAlt="GBC Admin"
          accent="#7C3AED"
          accentDark="#5B21B6"
          loginHref="/gbc-restricted/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
