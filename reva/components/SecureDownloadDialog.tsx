"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { revaApi, type DownloadTarget } from "@/reva/apiClient";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * ValidationError's top-level `error` is always the generic "Invalid
 * request" — the actual field-specific message (e.g. "Incorrect code")
 * lives in `details`, keyed by field name (this codebase's
 * ValidationError({ fieldName: message }) convention).
 */
function errorMessage(result: { error: string; details?: unknown }, fallback: string): string {
  const details = result.details as Record<string, string> | undefined;
  return details?.code || result.error || fallback;
}

type Props = {
  /** Button label, e.g. "Download Report" / "Download Document 1". */
  label: string;
  reference: string;
  target: DownloadTarget;
  /** Guest (one-time-request) path — required unless `authenticated` is set. */
  email?: string;
  /** Authenticated dashboard path — uses the logged-in user's own session/email, ignores `email`. */
  authenticated?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Every click starts a fresh OTP round — deliberately no "verified once,
 * skip next time" state — since a code is meant to be requested fresh for
 * every single download attempt, not cached across clicks or reloads.
 */
export function SecureDownloadDialog({ label, reference, target, email, authenticated, disabled, className }: Props) {
  const [step, setStep] = useState<"idle" | "requesting" | "code-entry" | "verifying">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestCode = async () => {
    setStep("requesting");
    setError(null);
    const result = authenticated
      ? await revaApi.properties.requestDownloadOtp(reference, target)
      : await revaApi.oneTimeProperties.requestDownloadOtp(reference, email!, target);

    if (!result.success) {
      toast.error(errorMessage(result, "Failed to send download code"));
      setStep("idle");
      return;
    }

    toast.success("A download code has been sent to your email");
    setCode("");
    startCooldown();
    setStep("code-entry");
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setStep("verifying");
    setError(null);

    const result = authenticated
      ? await revaApi.properties.verifyDownloadOtp(reference, target, code.trim())
      : await revaApi.oneTimeProperties.verifyDownloadOtp(reference, email!, target, code.trim());

    if (!result.success) {
      setError(errorMessage(result, "Incorrect or expired code"));
      setStep("code-entry");
      return;
    }

    window.open(result.data.url, "_blank");
    toast.success("Download started");
    closeDialog();
  };

  const closeDialog = () => {
    setStep("idle");
    setCode("");
    setError(null);
    setCooldown(0);
  };

  return (
    <>
      <Button
        type="button"
        onClick={requestCode}
        disabled={disabled || step === "requesting"}
        className={className}
      >
        {step === "requesting" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>

      <Dialog open={step === "code-entry" || step === "verifying"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter download code</DialogTitle>
            <DialogDescription>
              We sent a 6-digit code to your email. It expires in 10 minutes and can only be used once.
            </DialogDescription>
          </DialogHeader>

          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && verifyCode()}
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={requestCode}
              disabled={cooldown > 0 || step === "verifying"}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </Button>
            <Button type="button" onClick={verifyCode} disabled={!code.trim() || step === "verifying"}>
              {step === "verifying" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify &amp; Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
