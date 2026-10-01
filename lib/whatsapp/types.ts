export type WhatsAppSendResult = {
  success: boolean;
  provider: WhatsAppProviderName;
  messageId?: string;
  error?: string;
};

export type WhatsAppProviderName = "meta" | "twilio" | "termii";

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  /** Whether this provider has the env vars it needs to actually send. */
  isConfigured(): boolean;
  sendText(to: string, message: string): Promise<WhatsAppSendResult>;
}
