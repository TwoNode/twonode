"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPassword } from "@/lib/auth/authApiClient";
import { useTheme } from "@/hooks/useTheme";
import type { Platform } from "@/utils/platform";

export type ResetPasswordCardProps = {
  platform: Platform;
  logoSrc: string;
  logoAlt: string;
  /** Brand accent used for the primary button and links. */
  accent: string;
  accentDark?: string;
  loginHref: string;
};

/**
 * The landing page for the link sendPasswordResetEmail (utils/email.ts)
 * mails out — one shared component wired into each product's own
 * /reset-password page (Surfboard/REVA/GBC each pass their own branding),
 * the same pattern NativeAuthCard already uses. Deliberately its own
 * component rather than a fourth NativeAuthCard mode: this one is reached
 * from an emailed link carrying a token, not from clicking around the login
 * form, and doesn't share login/register's field set.
 */
export function ResetPasswordCard({
  platform,
  logoSrc,
  logoAlt,
  accent,
  accentDark,
  loginHref,
}: ResetPasswordCardProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { theme } = useTheme();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const dark = accentDark ?? accent;
  const headingColor = theme === "dark" ? "#fff" : dark;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) {
      setError("This link is missing its token. Request a new one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword({ platform, token, newPassword });
      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

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

      {success ? (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
          <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
            Password updated
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You can now sign in with your new password.
          </p>
          <Link href={loginHref}>
            <Button
              className="px-6 py-3 h-auto text-white rounded-lg font-semibold shadow hover:opacity-90 transition"
              style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
            >
              Continue to sign in
            </Button>
          </Link>
        </div>
      ) : !token ? (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
            Invalid link
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This password reset link is missing or malformed. Request a new
            one from the sign-in page.
          </p>
          <Link
            href={loginHref}
            className="underline font-semibold text-sm hover:opacity-80"
            style={{ color: accent }}
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1
            className="text-3xl font-extrabold mb-2 text-center"
            style={{ color: headingColor }}
          >
            Set a new password
          </h1>
          <p
            className="mb-6 text-base font-medium text-center"
            style={{ color: accent }}
          >
            Choose a new password for your account.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 h-auto text-white rounded-lg font-semibold text-lg shadow hover:opacity-90 transition"
              style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
