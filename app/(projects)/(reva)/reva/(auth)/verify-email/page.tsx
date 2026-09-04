"use client";

import { Suspense } from "react";
import { VerifyEmailCard } from "@/components/auth/VerifyEmailCard";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Platform } from "@/utils/platform";

export default function RevaVerifyEmailPage() {
  return (
    <AuthSplitLayout
      accent="#008cff"
      accentDark="#032740"
      eyebrow="REVA Workspace"
      headline="Track valuations with confidence."
      description="Sign in to manage property requests, approvals, and valuation reports — all in one place."
    >
      <Suspense>
        <VerifyEmailCard
          platform={Platform.REVA}
          logoSrc="/reva/revaLogo.png"
          logoAlt="REVA Logo"
          accent="#008cff"
          accentDark="#032740"
          loginHref="/reva/login"
        />
      </Suspense>
    </AuthSplitLayout>
  );
}
