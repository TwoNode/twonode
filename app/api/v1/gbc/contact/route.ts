import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { contactSubmissionSchema } from "@/gbc/utils/validations";
import {
  checkContactGuard,
  CONTACT_TURNSTILE_ACTION,
} from "@/gbc/utils/contactGuard";
import { submitContactForm } from "@/gbc/services/contactService";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { isTurnstileEnabled, verifyTurnstile } from "@/lib/security/turnstile";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const THANKS = "Thank you! We'll get back to you soon.";

/**
 * Public, so anyone can call it, and each call emails a stranger (the sender
 * types the address) — a script used it as a mail relay on 2026-11-02 (I-057).
 * Layers: a hidden honeypot and a minimum fill time, a limit per client
 * address, a Cloudflare Turnstile check (when its keys are set), then limits
 * per sender address and, for the confirmation mail only, overall. Rotating
 * addresses get past the per-client limit, which is why the confirmation mail
 * is also fixed text (it repeats nothing the sender wrote).
 */
export async function POST(req: NextRequest) {
  try {
    const { fax, fillTimeMs, turnstileToken, ...data } = await validateBody(
      req,
      contactSubmissionSchema
    );

    const guard = checkContactGuard({ fax, fillTimeMs });
    if (guard === "honeypot") {
      // Answer as if it worked, and keep and send nothing.
      return NextResponse.json({ success: true, data: { message: THANKS } });
    }
    if (guard === "too-fast") {
      return NextResponse.json(
        {
          success: false,
          error:
            "That was very quick. Please check your message and send it again.",
        },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(req);
    const tooMany = NextResponse.json(
      { success: false, error: "Too many messages. Please try again later." },
      { status: 429 }
    );
    if (
      !(await consumeRateLimit(`contact-ip:${clientIp}`, undefined, {
        max: 5,
        windowMs: HOUR_MS,
      }))
    ) {
      return tooMany;
    }

    // After the cheap checks, so a flood of tokenless requests does not turn
    // into a flood of calls to Cloudflare. Off until both keys are set.
    if (isTurnstileEnabled()) {
      const check = await verifyTurnstile({
        token: turnstileToken,
        action: CONTACT_TURNSTILE_ACTION,
        remoteIp: clientIp,
        requestHost:
          req.headers.get("x-forwarded-host") || req.headers.get("host"),
      });
      if (!check.ok) {
        // Why, without who: so "visitors are being blocked" can be diagnosed
        // (a changed domain shows as wrong-hostname, a bad secret as rejected).
        console.warn(
          "[contact] Turnstile refused:",
          check.reason,
          check.codes ?? []
        );
        if (check.reason === "unavailable") {
          return NextResponse.json(
            {
              success: false,
              error:
                "Verification is temporarily unavailable. Please try again in a moment.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { success: false, error: "Verification failed. Please try again." },
          { status: 403 }
        );
      }
    }

    if (
      !(await consumeRateLimit(
        `contact-email:${data.email.trim().toLowerCase()}`,
        undefined,
        { max: 2, windowMs: DAY_MS }
      ))
    ) {
      return tooMany;
    }
    // Over the overall limit the inquiry is still saved and the team notified;
    // only the mail to the sender's address is skipped.
    const sendConfirmation = await consumeRateLimit(
      "contact-confirmation-all",
      undefined,
      { max: 10, windowMs: HOUR_MS }
    );

    const inquiry = await submitContactForm(data, { sendConfirmation });
    return NextResponse.json({
      success: true,
      data: { inquiry, message: THANKS },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
