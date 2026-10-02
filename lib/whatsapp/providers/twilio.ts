import type { WhatsAppProvider, WhatsAppSendResult } from "../types";
import { formatNigerianPhone } from "@/gbc/utils/sms";

/** Twilio WhatsApp API — https://www.twilio.com/docs/whatsapp */
export const twilioProvider: WhatsAppProvider = {
  name: "twilio",

  isConfigured() {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    );
  },

  async sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

    if (!accountSid || !authToken || !from) {
      return {
        success: false,
        provider: "twilio",
        error: "Twilio WhatsApp credentials not configured",
      };
    }

    try {
      const toFormatted = `whatsapp:${formatNigerianPhone(to)}`;
      const body = new URLSearchParams({
        From: from,
        To: toFormatted,
        Body: message,
      });
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          provider: "twilio",
          error: data?.message || "Twilio WhatsApp send failed",
        };
      }
      return { success: true, provider: "twilio", messageId: data?.sid };
    } catch (error) {
      return {
        success: false,
        provider: "twilio",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
