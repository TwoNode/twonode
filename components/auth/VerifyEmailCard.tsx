"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/auth/authApiClient";
import { useTheme } from "@/hooks/useTheme";
import type { Platform } from "@/utils/platform";

export type VerifyEmailCardProps = {
  platform: Platform;
  logoSrc: string;
  logoAlt: string;
  /** Brand accent used for the primary button and links. */
  accent: string;
  accentDark?: string;
  loginHref: string;
};

/**
 * The landing page for the link sendVerificationEmail (utils/email.ts)
 * mails out — same wiring pattern as ResetPasswordCard (one shared
 * component, each product's own /verify-email page passes its branding),
 * but there's no form here: the token in the URL is the only input, so
 * verification runs automatically on mount instead of waiting on a submit.
 */
export function VerifyEmailCard({
  platform,
  logoSrc,
  logoAlt,
  accent,
  accentDark,
  loginHref,
}: VerifyEmailCardProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { theme } = useTheme();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const [error, setError] = useState<string | null>(null);

  const dark = accentDark ?? accent;
  const headingColor = theme === "dark" ? "#fff" : dark;

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError(
        "This link is missing its token. Request a new one from your account settings."
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await verifyEmail({ platform, token });
        if (cancelled) return;
        if (!result.success) {
          setError(result.error || "Something went wrong. Please try again.");
          setStatus("error");
          return;
        }
        setStatus("success");
      } catch {
        if (!cancelled) {
          setError(
            "Couldn't reach the server. Check your connection and try again."
          );
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [platform, token]);

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
            Verifying your email
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
            Email verified
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your email address has been confirmed.
          </p>
          <Link href={loginHref}>
            <Button
              className="px-6 py-3 h-auto text-white dark:text-white rounded-lg font-semibold shadow hover:opacity-90 transition"
              style={{
                background: `linear-gradient(90deg, ${dark}, ${accent})`,
              }}
            >
              Continue to sign in
            </Button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Verification failed
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
