"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  acceptInvitation,
  getInvitation,
  type InvitationDetails,
  describeFailure,
} from "@/lib/auth/authApiClient";
import { useTheme } from "@/hooks/useTheme";
import type { Platform } from "@/utils/platform";

export type AcceptInviteCardProps = {
  platform: Platform;
  logoSrc: string;
  logoAlt: string;
  /** Brand accent used for the primary button and links. */
  accent: string;
  accentDark?: string;
  /** Where "Back to sign in" goes when the link is unusable; a valid link supplies its own. */
  fallbackLoginHref: string;
};

/**
 * Landing page for the link sendAdminInvitationEmail (utils/email.ts) mails
 * out. Shared across the three products the same way ResetPasswordCard is.
 * The invitee has no account yet: this loads the invitation for the token,
 * lets them confirm their name and choose a password, and creating that
 * account is the acceptance.
 */
export function AcceptInviteCard({
  platform,
  logoSrc,
  logoAlt,
  accent,
  accentDark,
  fallbackLoginHref,
}: AcceptInviteCardProps) {
  const token = useSearchParams().get("token");
  const { theme } = useTheme();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginPath, setLoginPath] = useState<string | null>(null);

  const dark = accentDark ?? accent;
  const headingColor = theme === "dark" ? "#fff" : dark;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getInvitation({ platform, token })
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setInvitation(res.data);
          setFirstName(res.data.firstName);
          setLastName(res.data.lastName);
        } else {
          setLoadError(res.error);
        }
      })
      .catch(
        () =>
          !cancelled &&
          setLoadError(
            "Couldn't reach the server. Check your connection and try again."
          )
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [platform, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await acceptInvitation({
        platform,
        token,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (!result.success) {
        setError(describeFailure(result));
        setIsSubmitting(false);
        return;
      }
      setLoginPath(result.data.loginPath);
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again."
      );
      setIsSubmitting(false);
    }
  }

  const gradient = { background: `linear-gradient(90deg, ${dark}, ${accent})` };

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

      {loginPath ? (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Your account is ready
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You can now sign in with your email and password.
          </p>
          <Link href={loginPath}>
            <Button
              className="px-6 py-3 h-auto text-white dark:text-white rounded-lg font-semibold shadow hover:opacity-90 transition"
              style={gradient}
            >
              Continue to sign in
            </Button>
          </Link>
        </div>
      ) : loading ? (
        <Loader2
          className="h-8 w-8 animate-spin my-8"
          style={{ color: accent }}
        />
      ) : !token || loadError || !invitation ? (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h1
            className="text-2xl font-extrabold"
            style={{ color: headingColor }}
          >
            Invitation unavailable
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {token && loadError
              ? loadError
              : "This invitation link is missing or malformed. Ask the person who invited you to send a new one."}
          </p>
          <Link
            href={fallbackLoginHref}
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
            Accept your invitation
          </h1>
          <p
            className="mb-6 text-base font-medium text-center"
            style={{ color: accent }}
          >
            You&apos;ve been invited as {invitation.roleLabel}. Set a password
            to activate <strong>{invitation.email}</strong>.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-4 text-left"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
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
              className="w-full px-6 py-3 h-auto text-white dark:text-white rounded-lg font-semibold text-lg shadow hover:opacity-90 transition"
              style={gradient}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Activate account"
              )}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
