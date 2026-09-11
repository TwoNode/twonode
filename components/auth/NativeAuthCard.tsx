"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login, register, requestPasswordReset } from "@/lib/auth/authApiClient";
import { useTheme } from "@/hooks/useTheme";
import type { Platform } from "@/utils/platform";

export type NativeAuthCardProps = {
  platform: Platform;
  logoSrc: string;
  logoAlt: string;
  title: string;
  subtitle: string;
  /** Brand accent used for the primary button, focus rings and links. */
  accent: string;
  accentDark?: string;
  /** Where to send the user after a successful login/register, given their role. */
  resolveRedirect: (role: string) => string;
  /** Show the "Don't have an account? Register" toggle and the register form. Off for invite-only admin portals. */
  allowRegister?: boolean;
  /** Rendered below the "or" divider — typically a Kinde LoginLink/RegisterLink button. */
  alternateAuth?: ReactNode;
  registerNotice?: string;
};

export function NativeAuthCard({
  platform,
  logoSrc,
  logoAlt,
  title,
  subtitle,
  accent,
  accentDark,
  resolveRedirect,
  allowRegister = false,
  alternateAuth,
  registerNotice,
}: NativeAuthCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const dark = accentDark ?? accent;
  // accentDark is a near-black navy for every product — fine on the light
  // card, unreadable on the dark one, so the heading swaps to white instead.
  const headingColor = theme === "dark" ? "#fff" : dark;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (mode === "forgot") {
      setIsSubmitting(true);
      try {
        await requestPasswordReset({ platform, email });
        // Always shows the same confirmation regardless of the API result —
        // the request-password-reset route already returns a generic
        // response either way (see its doc comment); a distinct UI state
        // here for a failure would defeat that.
        setForgotSubmitted(true);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === "login"
          ? await login({ platform, email, password, rememberMe })
          : await register({ platform, email, password, firstName, lastName });

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push(resolveRedirect(result.data.role));
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  function backToLogin() {
    setError(null);
    setForgotSubmitted(false);
    setMode("login");
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
      <h1
        className="text-3xl font-extrabold mb-2 text-center"
        style={{ color: headingColor }}
      >
        {mode === "login" ? title : mode === "register" ? "Create your account" : "Reset your password"}
      </h1>
      <p
        className="mb-6 text-base font-medium text-center"
        style={{ color: accent }}
      >
        {mode === "login"
          ? subtitle
          : mode === "register"
            ? (registerNotice ?? subtitle)
            : "Enter your account email and we'll send you a link to reset your password."}
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4 text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === "forgot" && forgotSubmitted ? (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <MailCheck className="h-10 w-10" style={{ color: accent }} />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            If <strong>{email}</strong> is registered, we've sent a link to
            reset your password. It expires in 1 hour.
          </p>
          <button
            type="button"
            onClick={backToLogin}
            className="underline font-semibold text-sm hover:opacity-80"
            style={{ color: accent }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
        {mode === "register" && (
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
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        {mode !== "forgot" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("forgot");
                  }}
                  className="text-xs font-semibold hover:opacity-80"
                  style={{ color: accent }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 6 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
        )}

        {mode === "register" && (
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
        )}

        {mode === "login" && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              style={{ accentColor: accent }}
            />
            Keep me signed in
          </label>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 h-auto text-white rounded-lg font-semibold text-lg shadow hover:opacity-90 transition"
          style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : mode === "login" ? (
            "Sign in"
          ) : mode === "register" ? (
            "Create account"
          ) : (
            "Send reset link"
          )}
        </Button>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={backToLogin}
            className="text-sm font-semibold hover:opacity-80 text-center"
            style={{ color: accent }}
          >
            Back to sign in
          </button>
        )}
      </form>
      )}

      {allowRegister && mode !== "forgot" && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 text-center">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
            className="underline font-semibold hover:opacity-80"
            style={{ color: accent }}
          >
            {mode === "login" ? "Register here" : "Sign in"}
          </button>
        </p>
      )}

      {alternateAuth && mode !== "forgot" && (
        <>
          <div className="w-full flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            <span className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">or</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
          </div>
          <div className="w-full">{alternateAuth}</div>
        </>
      )}
    </div>
  );
}
