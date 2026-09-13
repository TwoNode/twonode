import type { WhatsAppProvider, WhatsAppProviderName, WhatsAppSendResult } from "./types";
import { metaProvider } from "./providers/meta";
import { twilioProvider } from "./providers/twilio";
import { termiiProvider } from "./providers/termii";

const PROVIDERS: Record<WhatsAppProviderName, WhatsAppProvider> = {
  meta: metaProvider,
  twilio: twilioProvider,
  termii: termiiProvider,
};

/**
 * WHATSAPP_PROVIDER selects which of the three providers below actually
 * sends — flip it in .env without touching any call site. Each provider
 * degrades gracefully (returns { success: false, error: "... not
 * configured" }) if its own credentials are missing, so switching providers
 * is just: set new env vars, change WHATSAPP_PROVIDER, redeploy.
 */
function getActiveProvider(): WhatsAppProvider {
  const configured = (process.env.WHATSAPP_PROVIDER as WhatsAppProviderName) || "meta";
  return PROVIDERS[configured] ?? PROVIDERS.meta;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<WhatsAppSendResult> {
  const provider = getActiveProvider();

  if (!provider.isConfigured()) {
    console.log(`WhatsApp (${provider.name}) not configured — message not sent`);
    return { success: false, provider: provider.name, error: `${provider.name} WhatsApp is not configured` };
  }

  return provider.sendText(to, message);
}

export async function sendWhatsAppOTP(to: string, code: string, purpose: "password-reset" | "login" = "login"): Promise<WhatsAppSendResult> {
  const label = purpose === "password-reset" ? "password reset" : "login";
  const message = `Your TwoNode ${label} code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
  return sendWhatsAppMessage(to, message);
}

export async function sendWhatsAppPlanCreated(to: string, planTitle: string, planId: string): Promise<WhatsAppSendResult> {
  return sendWhatsAppMessage(
    to,
    `Your Surfboard plan "${planTitle}" has been created (ref: ${planId}). We'll notify you here once it's lodged.`
  );
}

export async function sendWhatsAppPlanLodged(to: string, planTitle: string, planId: string): Promise<WhatsAppSendResult> {
  return sendWhatsAppMessage(
    to,
    `Your Surfboard plan "${planTitle}" (ref: ${planId}) has been lodged successfully.`
  );
}

export async function sendWhatsAppSubscriptionExpiryReminder(to: string, planName: string, daysLeft: number): Promise<WhatsAppSendResult> {
  const when = daysLeft <= 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  return sendWhatsAppMessage(
    to,
    `Your "${planName}" subscription expires ${when}. Renew now to keep uninterrupted access.`
  );
}

export type { WhatsAppProviderName, WhatsAppSendResult } from "./types";
