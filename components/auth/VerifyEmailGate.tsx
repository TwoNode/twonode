"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, Mail, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe, verifyEmailOtp, resendVerification } from "@/lib/auth/authApiClient";
import { useTheme } from "@/hooks/useTheme";
import type { Platform } from "@/utils/platform";

export type VerifyEmailGateProps = {
  platform: Platform;
  logoSrc: string;
  logoAlt: string;
  accent: string;
  accentDark?: string;
  loginHref: string;
  dashboardHref: string;
  initialEmail?: string;
  initialMethod?: "OTP" | "LINK";
};

export function VerifyEmailGate({
  platform,
  logoSrc,
  logoAlt,
  accent,
  accentDark,
  loginHref,
  dashboardHref,
  initialEmail,
  initialMethod,
}: VerifyEmailGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [loadingMe, setLoadingMe] = useState(!initialEmail || !initialMethod);
  const [email, setEmail] = useState<string>(initialEmail || searchParams?.get("email") || "");
  const [userId, setUserId] = useState<string | null>(null);
  const [method, setMethod] = useState<"OTP" | "LINK">(initialMethod || "OTP");
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  // OTP State
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [checkingLinkStatus, setCheckingLinkStatus] = useState(false);

  const dark = accentDark ?? accent;
  const headingColor = theme === "dark" ? "#fff" : dark;

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Load user status from /api/v1/auth/me
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        const result = await getMe(platform);
        if (cancelled) return;
        if (result.success && result.data) {
          const user = result.data;
          setEmail(user.email);
          setUserId(user.id);
          setMethod(user.verificationMethod);
          if (user.emailVerified) {
            setIsAlreadyVerified(true);
          }
        } else {
          // If we don't have an email from props or URL, flag unauthenticated
          if (!email && !searchParams?.get("email")) {
            setIsUnauthenticated(true);
          }
        }
      } catch {
        if (!cancelled && !email && !searchParams?.get("email")) {
          setIsUnauthenticated(true);
        }
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [platform]);

  // Focus first OTP input on mount when method is OTP
  useEffect(() => {
    if (!loadingMe && method === "OTP" && !isAlreadyVerified && !isUnauthenticated) {
      inputRefs.current[0]?.focus();
    }
  }, [loadingMe, method, isAlreadyVerified, isUnauthenticated]);

  // Handle OTP digit change
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    setErrorMessage(null);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...otp];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || "";
    }
    setOtp(updated);
    setErrorMessage(null);

    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  // Submit OTP
  const handleSubmitOtp = useCallback(async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setSubmittingOtp(true);
    setErrorMessage(null);

    try {
      const result = await verifyEmailOtp({
        platform,
        code: fullCode,
        ...(userId ? { userId } : {}),
      });

      if (!result.success) {
        setErrorMessage(result.error || "Invalid verification code. Please check and try again.");
        setSubmittingOtp(false);
        return;
      }

      setOtpSuccess(true);
      // Auto-redirect to dashboard after brief pause
      setTimeout(() => {
        router.push(dashboardHref);
        router.refresh();
      }, 1200);
    } catch {
      setErrorMessage("Couldn't reach the server. Please check your connection and try again.");
      setSubmittingOtp(false);
    }
  }, [otp, platform, userId, dashboardHref, router]);

  // Auto-submit OTP when 6th digit entered
  useEffect(() => {
    const code = otp.join("");
    if (code.length === 6 && !submittingOtp && !otpSuccess) {
      handleSubmitOtp(code);
    }
  }, [otp, submittingOtp, otpSuccess, handleSubmitOtp]);

  // Resend code or link
  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResendStatus(null);
    setErrorMessage(null);

    try {
      const res = await resendVerification({ platform, email });
      if (res.success) {
        setCooldown(60);
        setResendStatus(
          method === "OTP"
            ? "A fresh 6-digit verification code has been sent to your email."
            : "A new verification link has been sent to your email."
        );
      } else {
        setErrorMessage(res.error || "Failed to resend. Please try again later.");
      }
    } catch {
      setErrorMessage("Unable to connect to the server. Please try again later.");
    }
  };

  // Check link verification status
  const handleCheckLinkVerified = async () => {
    setCheckingLinkStatus(true);
    setErrorMessage(null);
    try {
      const result = await getMe(platform);
      if (result.success && result.data?.emailVerified) {
        setIsAlreadyVerified(true);
        router.push(dashboardHref);
        router.refresh();
      } else {
        setErrorMessage("Your email has not been verified yet. Please check your inbox and click the verification link.");
      }
    } catch {
      setErrorMessage("Couldn't verify status. Please try again.");
    } finally {
      setCheckingLinkStatus(false);
    }
  };

  return (
    <div className="bg-white dark:bg-surface dark:border dark:border-white/10 rounded-2xl shadow-xl dark:shadow-none p-8 max-w-md w-full flex flex-col items-center">
      {/* Brand Logo */}
      <div className="flex justify-center mb-6">
        <img
          src={logoSrc}
          alt={logoAlt}
          className="w-20 h-20 rounded-full shadow-lg border-4 object-contain bg-white"
          style={{ borderColor: `${accent}22` }}
        />
      </div>

      {/* Loading state */}
      {loadingMe && (
        <div className="w-full flex flex-col items-center gap-4 text-center py-6">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: accent }} />
          <h1 className="text-xl font-bold" style={{ color: headingColor }}>
            Checking verification status
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Please wait a moment...</p>
        </div>
      )}

      {/* Already verified state */}
      {!loadingMe && isAlreadyVerified && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
            Email Verified
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your email is confirmed and your account is active.
          </p>
          <Button
            onClick={() => {
              router.push(dashboardHref);
              router.refresh();
            }}
            className="w-full py-3 h-auto text-white rounded-lg font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Unauthenticated State (no active session & no email) */}
      {!loadingMe && !isAlreadyVerified && isUnauthenticated && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
            Sign In Required
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Please sign in to verify your email address or access your account.
          </p>
          <Link href={loginHref} className="w-full">
            <Button
              className="w-full py-3 h-auto text-white rounded-lg font-semibold shadow hover:opacity-90 transition"
              style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
            >
              Sign In
            </Button>
          </Link>
        </div>
      )}

      {/* OTP Verification View */}
      {!loadingMe && !isAlreadyVerified && !isUnauthenticated && method === "OTP" && (
        <div className="w-full flex flex-col items-center">
          {otpSuccess ? (
            <div className="w-full flex flex-col items-center gap-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
                Email Verified!
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your email has been confirmed. Redirecting to your dashboard...
              </p>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
                  Enter Verification Code
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {email || "your email"}
                  </span>
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="w-full p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Resend Success Note */}
              {resendStatus && (
                <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{resendStatus}</span>
                </div>
              )}

              {/* 6 Digit Inputs */}
              <div className="flex gap-2 sm:gap-2.5 my-3 justify-center">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${idx + 1}`}
                    disabled={submittingOtp}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-xl border border-gray-300 dark:border-white/15 bg-gray-50/60 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition disabled:opacity-50"
                    style={{
                      // When focused, apply accent ring
                      caretColor: accent,
                    }}
                  />
                ))}
              </div>

              {/* Submit Button */}
              <Button
                onClick={() => handleSubmitOtp()}
                disabled={submittingOtp || otp.join("").length !== 6}
                className="w-full py-3 h-auto text-white rounded-lg font-semibold shadow hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
              >
                {submittingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Email</span>
                )}
              </Button>

              {/* Resend action */}
              <div className="flex flex-col items-center gap-2 text-center text-xs text-gray-600 dark:text-gray-400 mt-2">
                <span>Didn't receive a code?</span>
                {cooldown > 0 ? (
                  <span className="text-gray-400 dark:text-gray-500 font-medium">
                    Resend code in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-semibold underline hover:opacity-80 transition inline-flex items-center gap-1 cursor-pointer"
                    style={{ color: accent }}
                  >
                    <RefreshCw className="h-3 w-3" /> Resend Code
                  </button>
                )}
              </div>

              <div className="pt-2">
                <Link
                  href={loginHref}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link Verification View */}
      {!loadingMe && !isAlreadyVerified && !isUnauthenticated && method === "LINK" && (
        <div className="w-full flex flex-col items-center gap-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
            style={{ background: `${accent}15`, color: accent }}
          >
            <Mail className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold" style={{ color: headingColor }}>
              Check Your Email
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              We've sent a verification link to{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {email || "your email"}
              </span>
              . Click the link in that email to confirm your account.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="w-full p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs text-left">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resend Success Note */}
          {resendStatus && (
            <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs text-left">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{resendStatus}</span>
            </div>
          )}

          <div className="w-full space-y-3 pt-2">
            <Button
              onClick={handleCheckLinkVerified}
              disabled={checkingLinkStatus}
              className="w-full py-3 h-auto text-white rounded-lg font-semibold shadow hover:opacity-90 transition flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(90deg, ${dark}, ${accent})` }}
            >
              {checkingLinkStatus ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking status...</span>
                </>
              ) : (
                <span>I've verified my email</span>
              )}
            </Button>

            <div className="flex flex-col items-center gap-2 text-center text-xs text-gray-600 dark:text-gray-400">
              <span>Didn't receive the email?</span>
              {cooldown > 0 ? (
                <span className="text-gray-400 dark:text-gray-500 font-medium">
                  Resend available in {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-semibold underline hover:opacity-80 transition inline-flex items-center gap-1 cursor-pointer"
                  style={{ color: accent }}
                >
                  <RefreshCw className="h-3 w-3" /> Resend verification link
                </button>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={loginHref}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
