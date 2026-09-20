"use client";

import { Suspense } from "react";
import { AcceptInviteCard } from "@/components/auth/AcceptInviteCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";
import { useEditionFooterNote } from "@/gbc/hooks/useEditionFooterNote";

export default function GBCAcceptInvitePage() {
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
        <AcceptInviteCard
          platform={Platform.GBC}
          logoSrc="/gbc2/gbc2DarkLogo.png"
          logoAlt="GBC Admin"
          accent="#7C3AED"
          accentDark="#5B21B6"
          fallbackLoginHref="/gbc-restricted/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
