"use client";

import { Suspense } from "react";
import { AcceptInviteCard } from "@/components/auth/AcceptInviteCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

export default function GBCAcceptInvitePage() {
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
