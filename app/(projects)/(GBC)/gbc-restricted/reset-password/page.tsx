"use client";

import { Suspense } from "react";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";
import { useEditionFooterNote } from "@/gbc/hooks/useEditionFooterNote";

export default function GBCResetPasswordPage() {
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
