"use client";

import { Suspense } from "react";
import { AcceptInviteCard } from "@/components/auth/AcceptInviteCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

export default function RevaAcceptInvitePage() {
  return (
    <AuthSplitLayout
      accent="#008cff"
      accentDark="#032740"
      eyebrow="REVA Workspace"
      headline="Track valuations with confidence."
      description="Sign in to manage property requests, approvals, and valuation reports — all in one place."
    >
      <Suspense>
        <AcceptInviteCard
          platform={Platform.REVA}
          logoSrc="/reva/revaLogo.png"
          logoAlt="REVA Logo"
          accent="#008cff"
          accentDark="#032740"
          fallbackLoginHref="/reva-restricted/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
