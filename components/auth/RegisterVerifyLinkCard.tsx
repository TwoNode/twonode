"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerComplete, describeFailure } from "@/lib/auth/authApiClient";
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
 * handles the link for an *already-created* account. `pid` + `token` in the
 * URL identify the pending signup; the user then re-enters the password they
 * registered with. That step is deliberate: the link proves the address is
 * theirs, the password proves they're also the person who chose it, so
 * someone who resubmitted the address with a password of their own can't
 * turn the victim's click into an account they control. (It also can't be
 * skipped by remembering the password in the browser — the link is often
 * opened on a different device than the form was filled in on.)
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
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"form" | "submitting" | "success">(
    "form"
  );
  const [error, setError] = useState<string | null>(null);

  const dark = accentDark ?? accent;
  const headingColor = theme === "dark" ? "#fff" : dark;
  const linkIncomplete = !pendingRegistrationId || !token;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (linkIncomplete || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const result = await registerComplete({
        platform,
        pendingRegistrationId,
        code: token,
        password,
      });
      if (!result.success) {
        setError(describeFailure(result));
        setStatus("form");
        return;
      }
      setStatus("success");
      setTimeout(() => {
        router.push(dashboardHref);
        router.refresh();
      }, 1200);
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again."
      );
      setStatus("form");
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

      {linkIncomplete && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Couldn't complete registration
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This link is missing information it needs. Please register again.
          </p>
          <Link
            href={loginHref}
            className="underline font-semibold text-sm hover:opacity-80"
            style={{ color: accent }}
          >
            Back to sign in
          </Link>
        </div>
      )}

      {!linkIncomplete && status !== "success" && (
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4 text-left"
        >
          <div className="text-center">
            <h1
              className="text-2xl font-extrabold mb-2"
              style={{ color: headingColor }}
            >
              Finish creating your account
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enter the password you chose when you registered to confirm it's
              you.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Password</Label>
            <PasswordInput
              id="confirm-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={status === "submitting" || !password}
            className="w-full px-6 py-3 h-auto text-white dark:text-white rounded-lg font-semibold text-lg shadow hover:opacity-90 transition"
            style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
          >
            {status === "submitting" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Verify & create account"
            )}
          </Button>

          <Link
            href={loginHref}
            className="text-sm font-semibold hover:opacity-80 text-center"
            style={{ color: accent }}
          >
            Back to sign in
          </Link>
        </form>
      )}

      {!linkIncomplete && status === "success" && (
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
    </div>
  );
}
