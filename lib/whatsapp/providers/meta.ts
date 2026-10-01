import type { WhatsAppProvider, WhatsAppSendResult } from "../types";
import { formatNigerianPhone } from "@/gbc/utils/sms";

/** Meta WhatsApp Cloud API — https://developers.facebook.com/docs/whatsapp/cloud-api */
export const metaProvider: WhatsAppProvider = {
  name: "meta",

  isConfigured() {
    return Boolean(process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN);
  },

  async sendText(to: string, message: string): Promise<WhatsAppSendResult> {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return { success: false, provider: "meta", error: "Meta WhatsApp credentials not configured" };
    }

    try {
      const to234 = formatNigerianPhone(to).replace(/^\+/, "");
      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to234,
          type: "text",
          text: { body: message },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, provider: "meta", error: data?.error?.message || "Meta WhatsApp send failed" };
      }
      return { success: true, provider: "meta", messageId: data?.messages?.[0]?.id };
    } catch (error) {
      return { success: false, provider: "meta", error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
};
