// src/lib/sms.ts
import nodemailer from "nodemailer";

// Create Zoho SMTP transporter - using same config as working email utility
const transporter = nodemailer.createTransport({
  service: "Zoho",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM_EMAIL = process.env.EMAIL_USER || "info@twonodetechnologies.com";
const SMS_ENABLED =
  process.env.ENABLE_SMS_NOTIFICATIONS === "true" ||
  process.env.ENABLE_SMS_NOTIFICATIONS === "1";

/**
 * Format phone number for Nigeria
 * Accepts: 08012345678, 2348012345678, +2348012345678
 * Returns: +2348012345678
 */
export function formatNigerianPhone(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle different formats
  if (cleaned.startsWith("234")) {
    // Already has country code
    return `+${cleaned}`;
  } else if (cleaned.startsWith("0")) {
    // Local format (08012345678)
    return `+234${cleaned.substring(1)}`;
  } else if (cleaned.length === 10) {
    // Without leading zero (8012345678)
    return `+234${cleaned}`;
  }

  return phone; // Return as-is if format is unclear
}

/**
 * Validate Nigerian phone number
 */
export function isValidNigerianPhone(phone: string): boolean {
  const formatted = formatNigerianPhone(phone);
  // Nigeria phone numbers are 13 digits including country code
  return /^\+234[0-9]{10}$/.test(formatted);
}

/**
 * Send SMS using Email-to-SMS gateway
 * Note: You'll need to configure an SMS gateway that accepts email-to-SMS
 */
export async function sendSMS(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!SMS_ENABLED) {
    console.log("SMS notifications disabled");
    return { success: false, error: "SMS notifications are disabled" };
  }

  try {
    // Format phone number
    const formattedPhone = formatNigerianPhone(phone);

    if (!isValidNigerianPhone(formattedPhone)) {
      return { success: false, error: "Invalid phone number" };
    }

    // For SMS gateway integration, you'll typically:
    // 1. Use an SMS API like Twilio, Africa's Talking, or Termii
    // 2. Or use Email-to-SMS if your provider supports it

    // Example using Email-to-SMS (configure your gateway)
    const smsGateway = process.env.SMS_GATEWAY_DOMAIN;

    if (!smsGateway) {
      console.log("SMS gateway not configured");
      return { success: false, error: "SMS gateway not configured" };
    }

    const smsEmail = `${formattedPhone}@${smsGateway}`;

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: smsEmail,
      subject: "", // Some gateways ignore subject
      text: message,
    });

    console.log(`SMS sent to ${formattedPhone}`);
    return { success: true };
  } catch (error) {
    console.error("SMS sending error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send ticket confirmation SMS
 */
export async function sendGBCTicketSMS(
  phone: string,
  name: string,
  ticketNumber: string,
  eventDate: string
): Promise<void> {
  const message = `
Hello ${name}! Your GBC 2.0 ticket is confirmed.

Ticket: ${ticketNumber}
Date: ${eventDate}
Venue: Lagos, Nigeria

Present your QR code at entrance. Check your email for details.

GBC Team
  `.trim();

  await sendSMS(phone, message);
}

/**
 * Send check-in reminder SMS (day before event)
 */
export async function sendGBCCheckInReminderSMS(
  phone: string,
  name: string,
  ticketNumber: string
): Promise<void> {
  const message = `
Hi ${name}! GBC 2.0 is tomorrow!

Ticket: ${ticketNumber}

Remember to:
- Bring valid ID
- Have QR code ready
- Arrive early

See you there!
GBC Team
  `.trim();

  await sendSMS(phone, message);
}

/**
 * Send bulk SMS
 */
export async function sendBulkSMS(
  recipients: Array<{ phone: string; message: string }>
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ phone: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ phone: string; error: string }>,
  };

  for (const recipient of recipients) {
    const result = await sendSMS(recipient.phone, recipient.message);

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        phone: recipient.phone,
        error: result.error || "Unknown error",
      });
    }

    // Add delay to avoid rate limiting (adjust as needed)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Send SMS to all ticket holders
 */
export async function sendGBCBroadcastSMS(
  message: string,
  ticketHolders: Array<{ phone: string; name: string }>
): Promise<{
  success: number;
  failed: number;
}> {
  const recipients = ticketHolders
    .filter((holder) => holder.phone)
    .map((holder) => ({
      phone: holder.phone,
      message: `Hi ${holder.name}! ${message}`,
    }));

  const results = await sendBulkSMS(recipients);

  console.log(
    `Broadcast SMS: ${results.success} sent, ${results.failed} failed`
  );

  return {
    success: results.success,
    failed: results.failed,
  };
}

/**
 * Alternative: Direct SMS API integration example (Termii - Nigerian SMS provider)
 */
export async function sendSMSViaTermii(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const TERMII_API_KEY = process.env.TERMII_API_KEY;
  const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || "GBC2.0";

  if (!TERMII_API_KEY) {
    return { success: false, error: "Termii API key not configured" };
  }

  try {
    const formattedPhone = formatNigerianPhone(phone);

    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    if (data.message_id) {
      return { success: true };
    } else {
      return { success: false, error: data.message || "Failed to send SMS" };
    }
  } catch (error) {
    console.error("Termii SMS error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Alternative: Africa's Talking SMS integration
 */
export async function sendSMSViaAfricasTalking(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const AT_API_KEY = process.env.AFRICAS_TALKING_API_KEY;
  const AT_USERNAME = process.env.AFRICAS_TALKING_USERNAME;

  if (!AT_API_KEY || !AT_USERNAME) {
    return { success: false, error: "Africa's Talking not configured" };
  }

  try {
    const formattedPhone = formatNigerianPhone(phone);

    const params = new URLSearchParams({
      username: AT_USERNAME,
      to: formattedPhone,
      message: message,
    });

    const response = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: AT_API_KEY,
        },
        body: params,
      }
    );

    const data = await response.json();

    if (data.SMSMessageData?.Recipients?.[0]?.status === "Success") {
      return { success: true };
    } else {
      return { success: false, error: "Failed to send SMS" };
    }
  } catch (error) {
    console.error("Africa's Talking SMS error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
