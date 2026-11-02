import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { contactSubmissionSchema } from "@/gbc/utils/validations";
import { checkContactGuard } from "@/gbc/utils/contactGuard";
import { submitContactForm } from "@/gbc/services/contactService";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rateLimit";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const THANKS = "Thank you! We'll get back to you soon.";

/**
 * Public, so anyone can call it, and each call emails a stranger (the sender
 * types the address) — a script used it as a mail relay on 2026-11-02 (I-057).
 * Layers: a hidden honeypot and a minimum fill time, then limits per client
 * address, per sender address and, for the confirmation mail only, overall.
 * Rotating addresses get past the per-client limit, which is why the
 * confirmation mail is also fixed text (it repeats nothing the sender wrote).
 */
export async function POST(req: NextRequest) {
  try {
    const { fax, fillTimeMs, ...data } = await validateBody(
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

    const tooMany = NextResponse.json(
      { success: false, error: "Too many messages. Please try again later." },
      { status: 429 }
    );
    if (
      !(await consumeRateLimit(`contact-ip:${getClientIp(req)}`, undefined, {
        max: 5,
        windowMs: HOUR_MS,
      }))
    ) {
      return tooMany;
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
