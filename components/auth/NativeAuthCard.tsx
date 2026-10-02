"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  login,
  registerSendOtp,
  registerComplete,
  registerResendOtp,
  requestPasswordReset,
} from "@/lib/auth/authApiClient";
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

// useSearchParams() requires a Suspense boundary above it or Next.js bails
// the whole page out of static prerendering at build time (confirmed live:
// broke the Vercel build with "useSearchParams() should be wrapped in a
// suspense boundary" on every page using this card). The public export stays
// a drop-in NativeAuthCard; the actual implementation moves one level down.
export function NativeAuthCard(props: NativeAuthCardProps) {
  return (
    <Suspense fallback={<div className="w-full max-w-md" />}>
      <NativeAuthCardInner {...props} />
    </Suspense>
  );
}

function NativeAuthCardInner({
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
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [mode, setMode] = useState<
    "login" | "register" | "register-otp" | "forgot"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // register-otp: step 2 of registration, verifying the code/link sent to
  // `email`. `registrationMethod` decides which UI this step shows — OTP
  // boxes, or a "check your inbox" state for a link — per the platform's
  // admin-configured verification method (returned by send-otp, since
  // that's where it's actually decided, not guessed client-side).
  const [pendingRegistrationId, setPendingRegistrationId] = useState<
    string | null
  >(null);
  const [registrationMethod, setRegistrationMethod] = useState<"OTP" | "LINK">(
    "OTP"
  );
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (mode === "register-otp" && registrationMethod === "OTP")
      otpInputRefs.current[0]?.focus();
  }, [mode, registrationMethod]);

  // Middleware (proxy.ts) attaches this when it bounces an unauthenticated
  // visit to login, so a session expiring (or a stale link) mid-task can
  // return the user to where they actually were instead of always to the
  // role's default dashboard. Restricted to a same-origin relative path —
  // never follow an absolute/protocol-relative URL from a query param.
  const returnTo = searchParams.get("post_login_redirect_url");
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : null;

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
        setError(
          "Couldn't reach the server. Check your connection and try again."
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === "register") {
      setIsSubmitting(true);
      try {
        const result = await registerSendOtp({
          platform,
          email,
          password,
          firstName,
          lastName,
        });
        if (!result.success) {
          setError(result.error || "Something went wrong. Please try again.");
          setIsSubmitting(false);
          return;
        }
        setPendingRegistrationId(result.data.pendingRegistrationId);
        setRegistrationMethod(result.data.method);
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setMode("register-otp");
      } catch {
        setError(
          "Couldn't reach the server. Check your connection and try again."
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ platform, email, password, rememberMe });

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Only honor the return-to path on a login, not a fresh registration —
      // a brand-new account has no reason to land back on whatever gated
      // page bounced the visitor to login in the first place.
      //
      // No router.refresh() here — it was firing right after push() and
      // intermittently racing it: refresh() re-fetches the RSC payload for
      // the *current* (login) route, and if that lands before push()'s own
      // navigation commits, it can cancel the pending push outright, so the
      // redirect silently never happens (this was the root cause of the
      // "sometimes login just doesn't redirect" reports — reproduced
      // locally as a ~1-in-3 failure rate with this call present). push()
      // already fetches a fresh RSC payload for the destination route on
      // its own, so refresh() was redundant here even when it didn't race.
      router.push(
        mode === "login" && safeReturnTo
          ? safeReturnTo
          : resolveRedirect(result.data.role)
      );
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again."
      );
      setIsSubmitting(false);
    }
  }

  function backToLogin() {
    setError(null);
    setForgotSubmitted(false);
    setMode("login");
  }

  function handleOtpDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "");
    const updated = [...otp];
    updated[index] = cleaned ? cleaned.slice(-1) : "";
    setOtp(updated);
    setError(null);
    if (cleaned && index < 5) otpInputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitOtp();
      return;
    }
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const updated = [...otp];
    for (let i = 0; i < 6; i++) updated[i] = pasted[i] || "";
    setOtp(updated);
    setError(null);
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmitOtp(codeOverride?: string) {
    if (submittingOtp) return;
    const code = codeOverride || otp.join("");
    if (code.length !== 6 || !pendingRegistrationId) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setSubmittingOtp(true);
    setError(null);
    try {
      const result = await registerComplete({
        platform,
        pendingRegistrationId,
        code,
      });
      if (!result.success) {
        setError(result.error || "Invalid code. Please check and try again.");
        setSubmittingOtp(false);
        return;
      }
      router.push(resolveRedirect(result.data.role));
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again."
      );
      setSubmittingOtp(false);
    }
  }

  useEffect(() => {
    if (registrationMethod !== "OTP") return;
    const code = otp.join("");
    if (code.length === 6 && !submittingOtp) handleSubmitOtp(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, registrationMethod]);

  async function handleResendOtp() {
    if (resendCooldown > 0 || !pendingRegistrationId) return;
    setError(null);
    setResendStatus(null);
    try {
      const res = await registerResendOtp({ platform, pendingRegistrationId });
      if (res.success) {
        setResendCooldown(60);
        setResendStatus(
          registrationMethod === "OTP"
            ? "A fresh 6-digit code has been sent to your email."
            : "A new verification link has been sent to your email."
        );
      } else {
        setError(res.error || "Failed to resend. Please try again later.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again later.");
    }
  }

  function backToRegisterForm() {
    setError(null);
    setResendStatus(null);
    setPendingRegistrationId(null);
    setMode("register");
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
        {mode === "login"
          ? title
          : mode === "register"
            ? "Create your account"
            : mode === "register-otp"
              ? "Verify your email"
              : "Reset your password"}
      </h1>
      <p
        className="mb-6 text-base font-medium text-center"
        style={{ color: accent }}
      >
        {mode === "login" ? (
          subtitle
        ) : mode === "register" ? (
          (registerNotice ?? subtitle)
        ) : mode === "register-otp" ? (
          registrationMethod === "OTP" ? (
            <>
              Enter the 6-digit code we sent to <strong>{email}</strong>.
            </>
          ) : (
            <>
              We've sent a verification link to <strong>{email}</strong>.
            </>
          )
        ) : (
          "Enter your account email and we'll send you a link to reset your password."
        )}
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
      ) : mode === "register-otp" ? (
        <div className="w-full flex flex-col items-center gap-4">
          {registrationMethod === "OTP" ? (
            <>
              <div className="flex gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpInputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={submittingOtp}
                    onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-12 text-center text-xl font-bold rounded-lg border border-gray-300 dark:border-white/15 dark:bg-white/5 dark:text-white focus:outline-none focus:ring-2"
                    style={{
                      caretColor: accent,
                      ["--tw-ring-color" as string]: accent,
                    }}
                  />
                ))}
              </div>

              <Button
                type="button"
                disabled={submittingOtp || otp.some((d) => !d)}
                onClick={() => handleSubmitOtp()}
                className="w-full px-6 py-3 h-auto text-white rounded-lg font-semibold text-lg shadow hover:opacity-90 transition"
                style={{
                  background: `linear-gradient(90deg, ${dark}, ${accent})`,
                }}
              >
                {submittingOtp ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify & create account"
                )}
              </Button>
            </>
          ) : (
            // LINK method — nothing to submit here; completion happens when
            // the user clicks the emailed link, which lands on a dedicated
            // page (RegisterVerifyLinkCard) that calls registerComplete
            // directly with the pendingRegistrationId + token from the URL.
            <MailCheck className="h-10 w-10" style={{ color: accent }} />
          )}

          {resendStatus && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
              {resendStatus}
            </p>
          )}

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0}
            className="text-sm font-semibold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: accent }}
          >
            {resendCooldown > 0
              ? `Resend (${resendCooldown}s)`
              : registrationMethod === "OTP"
                ? "Resend code"
                : "Resend link"}
          </button>

          <button
            type="button"
            onClick={backToRegisterForm}
            className="text-sm text-gray-500 dark:text-gray-400 hover:opacity-80"
          >
            ← Use a different email
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4 text-left"
        >
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
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
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

      {allowRegister && mode !== "forgot" && mode !== "register-otp" && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 text-center">
          {mode === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
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

      {alternateAuth && mode !== "forgot" && mode !== "register-otp" && (
        <>
          <div className="w-full flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            <span className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
              or
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
          </div>
          <div className="w-full">{alternateAuth}</div>
        </>
      )}
    </div>
  );
}
