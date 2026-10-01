import type { WhatsAppProvider, WhatsAppSendResult } from "../types";
import { formatNigerianPhone } from "@/gbc/utils/sms";

/**
 * Termii WhatsApp — same account/API key family as the SMS integration
 * already scaffolded in gbc/utils/sms.ts. Termii's WhatsApp product
 * requires a separate approval step on their dashboard (WhatsApp Business
 * sender registration) before this endpoint will actually deliver — verify
 * the request shape against Termii's current docs once that's approved,
 * since template/session-message requirements can differ from plain SMS.
 */
export const termiiProvider: WhatsAppProvider = {
  name: "termii",

  isConfigured() {
    return Boolean(process.env.TERMII_API_KEY && process.env.TERMII_WHATSAPP_SENDER_ID);
  },

  async sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_WHATSAPP_SENDER_ID;

    if (!apiKey || !senderId) {
      return { success: false, provider: "termii", error: "Termii WhatsApp credentials not configured" };
    }

    try {
      const formattedPhone = formatNigerianPhone(to);
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formattedPhone,
          from: senderId,
          sms: message,
          type: "plain",
          channel: "whatsapp",
          api_key: apiKey,
        }),
      });

      const data = await response.json();
      if (!data?.message_id) {
        return { success: false, provider: "termii", error: data?.message || "Termii WhatsApp send failed" };
      }
      return { success: true, provider: "termii", messageId: data.message_id };
    } catch (error) {
      return { success: false, provider: "termii", error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
