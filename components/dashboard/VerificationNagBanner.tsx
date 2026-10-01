"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { getMe } from "@/lib/auth/authApiClient";
import type { Platform } from "@/utils/platform";
import { cn } from "@/lib/utils";

export type VerificationNagBannerProps = {
  platform: Platform;
  verifyHref: string;
  className?: string;
};

export function VerificationNagBanner({
  platform,
  verifyHref,
  className,
}: VerificationNagBannerProps) {
  const [visible, setVisible] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [graceDateStr, setGraceDateStr] = useState<string | null>(null);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissKey = `nag_dismissed_${platform}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey) === "true") {
      return;
    }

    let cancelled = false;
    async function checkVerification() {
      try {
        const result = await getMe(platform);
        if (cancelled) return;
        if (result.success && result.data) {
          const user = result.data;
          // Show nag only if not verified and not already locked out (mustVerifyNow = false)
          if (!user.emailVerified && !user.mustVerifyNow) {
            if (user.verificationGraceEndsAt) {
              const endsAt = new Date(user.verificationGraceEndsAt);
              const diffMs = endsAt.getTime() - Date.now();
              const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              setDaysRemaining(days);
              setGraceDateStr(
                endsAt.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              );
            }
            setVisible(true);
          }
        }
      } catch {
        // Silently ignore errors in layout banner
      }
    }

    checkVerification();
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`nag_dismissed_${platform}`, "true");
    }
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Email verification required"
      className={cn(
        "mb-4 p-4 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs backdrop-blur-xs transition-all duration-200",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Email Verification Required
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
              {daysRemaining !== null ? (
                daysRemaining > 0 ? (
                  <>
                    Please verify your email within{" "}
                    <span className="font-bold">
                      {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
                    </span>
                    {graceDateStr ? ` (before ${graceDateStr})` : ""} to avoid losing access to your
                    dashboard.
                  </>
                ) : (
                  <>
                    Your verification grace period expires today. Please verify your email now to
                    prevent interruption.
                  </>
                )
              ) : (
                <>Please verify your email address to confirm your account and secure your access.</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link
            href={verifyHref}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950 shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <span>Verify Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner for this session"
            className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
