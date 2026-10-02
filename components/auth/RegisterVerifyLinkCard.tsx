"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { registerComplete } from "@/lib/auth/authApiClient";
import { useTheme } from "@/hooks/useTheme";
import type { Platform } from "@/utils/platform";

export type RegisterVerifyLinkCardProps = {
  platform: Platform;
  logoSrc: string;
  logoAlt: string;
  accent: string;
  accentDark?: string;
  loginHref: string;
  dashboardHref: string;
};

/**
 * The landing page for a LINK-method OTP-first registration email (see
 * lib/auth/pendingRegistration.ts) — distinct from VerifyEmailCard, which
 * handles the link for an *already-created* account. Here, `pid` +
 * `token` in the URL are the only inputs: completing registration (not
 * just marking a flag) happens automatically on mount, same as
 * VerifyEmailCard's auto-run pattern, just against the registration
 * completion endpoint instead.
 */
export function RegisterVerifyLinkCard({
  platform,
  logoSrc,
  logoAlt,
  accent,
  accentDark,
  loginHref,
  dashboardHref,
}: RegisterVerifyLinkCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingRegistrationId = searchParams.get("pid");
  const token = searchParams.get("token");
  const { theme } = useTheme();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const [error, setError] = useState<string | null>(null);
  const executedRef = useRef(false);

  const dark = accentDark ?? accent;
  const headingColor = theme === "dark" ? "#fff" : dark;

  useEffect(() => {
    if (!pendingRegistrationId || !token) {
      setStatus("error");
      setError(
        "This link is missing information it needs. Please register again."
      );
      return;
    }

    if (executedRef.current) return;
    executedRef.current = true;

    (async () => {
      try {
        const result = await registerComplete({
          platform,
          pendingRegistrationId,
          code: token,
        });
        if (!result.success) {
          setError(result.error || "Something went wrong. Please try again.");
          setStatus("error");
          return;
        }
        setStatus("success");
        setTimeout(() => {
          router.push(dashboardHref);
        }, 1200);
      } catch {
        setError(
          "Couldn't reach the server. Check your connection and try again."
        );
        setStatus("error");
      }
    })();
  }, [platform, pendingRegistrationId, token, router, dashboardHref]);

  return (
    <div className="bg-white dark:bg-surface dark:border dark:border-white/10 rounded-2xl shadow-xl dark:shadow-none p-8 max-w-md w-full flex flex-col items-center">
      <div className="flex justify-center mb-6">
        <img
          src={logoSrc}
          alt={logoAlt}
          className="w-20 h-20 rounded-full shadow-lg border-4 object-contain bg-white"
          style={{ borderColor: `${accent}22` }}
        />
      </div>

      {status === "pending" && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <Loader2
            className="h-10 w-10 animate-spin"
            style={{ color: accent }}
          />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Creating your account
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Just a moment...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Account created
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your email is verified. Taking you to your dashboard...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Couldn't complete registration
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
          <Link
            href={loginHref}
            className="underline font-semibold text-sm hover:opacity-80"
            style={{ color: accent }}
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
