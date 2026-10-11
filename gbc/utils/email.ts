// src/lib/email.ts
import nodemailer from "nodemailer";
import type { GBCCertificateTicket } from "@/gbc/components/certificates/types";
import { getSiteUrl } from "@/lib/siteUrl";

// Create Zoho SMTP transporter - using same config as working email utility
const transporter = nodemailer.createTransport({
  service: "Zoho",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM_EMAIL = process.env.EMAIL_USER || "info@twonodetechnologies.com";

interface GBCTicketEmailData {
  name: string;
  email: string;
  phone?: string;
  ticketNumber: string;
  ticketType: string;
  price: number;
  qrCodeBase64: string;
  eventDate: string;
  eventLocation: string;
  eventVenue: string;
  /** Attached alongside the QR ticket when payment verification generated one — see ensureQRAndEmail. */
  receiptPdfBuffer?: Buffer;
}

/**
 * Generate ticket confirmation email HTML
 */
function generateGBCTicketEmailHTML(data: GBCTicketEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GBC 2.0 Ticket Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .ticket-info {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .ticket-info h3 {
      margin: 0 0 15px 0;
      color: #667eea;
      font-size: 18px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6c757d;
    }
    .info-value {
      color: #212529;
    }
    .qr-section {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .qr-section h3 {
      color: #667eea;
      margin-bottom: 15px;
    }
    .qr-code {
      max-width: 250px;
      margin: 0 auto;
    }
    .important-note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .important-note strong {
      color: #856404;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Ticket Confirmed!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Geospatial Builders Conference 2026</p>
    </div>

    <div class="content">
      <p>Dear <strong>${data.name}</strong>,</p>

      <p>Thank you for registering for <strong>GBC 2.0</strong>! We're excited to have you join us for this premier geospatial technology conference.</p>

      <div class="ticket-info">
        <h3>📋 Ticket Details</h3>
        <div class="info-row">
          <span class="info-label">Ticket Number:</span>
          <span class="info-value"><strong>${data.ticketNumber}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Ticket Type:</span>
          <span class="info-value">${data.ticketType.replace("_", " ")}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount Paid:</span>
          <span class="info-value">₦${data.price.toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Event Date:</span>
          <span class="info-value">${data.eventDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Venue:</span>
          <span class="info-value">${data.eventVenue}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location:</span>
          <span class="info-value">${data.eventLocation}</span>
        </div>
      </div>

      <div class="qr-section">
        <h3>🎫 Your Ticket Pass</h3>
        <p>Present this QR code at the entrance for check-in:</p>
        <img src="${data.qrCodeBase64}" alt="Ticket QR Code" class="qr-code" />
        <p style="margin-top: 15px; font-size: 12px; color: #6c757d;">Save this email or download the QR code</p>
      </div>

      <div class="important-note">
        <strong>⚠️ Important:</strong> Please bring a valid ID and this ticket (digital or printed) to the event. Each ticket is unique and can only be used once.
      </div>

      <h3 style="color: #667eea; margin-top: 30px;">What to Expect</h3>
      <ul style="line-height: 2;">
        <li>Networking with industry leaders and innovators</li>
        <li>Cutting-edge geospatial technology showcases</li>
        <li>Expert-led sessions and panel discussions</li>
        <li>Investment opportunities and partnerships</li>
        <li>Insights on Land Administration and Energy transformation</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${getSiteUrl()}" class="button">Visit Conference Website</a>
      </div>

      <p>Looking forward to seeing you at GBC 2.0!</p>
      
      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The GBC Team</strong><br>
        Two Node Technologies
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Contact Us</strong></p>
      <p>
        📧 <a href="mailto:info@twonodetechnologies.com">info@twonodetechnologies.com</a><br>
        📞 +234-916-0002-740<br>
        📍 No. 58 Kudirat Abiola Way, Oregun, Ikeja, Lagos State
      </p>
      <p style="margin-top: 20px; font-size: 12px;">
        #GBC2.0 | Theme: "Geospatial Capital: A Catalyst for Inclusive Growth"
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        © 2025 Two Node Technologies. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send ticket confirmation email
 */
export async function sendGBCTicketConfirmation(
  data: GBCTicketEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log("📧 sendGBCTicketConfirmation called with:", {
      email: data.email,
      name: data.name,
      ticketNumber: data.ticketNumber,
      ticketType: data.ticketType,
    });

    console.log("📧 SMTP Configuration:", {
      service: "Zoho",
      user: process.env.EMAIL_USER,
      from: FROM_EMAIL,
      hasPassword: !!process.env.EMAIL_PASS,
    });

    console.log("📧 Sending email via transporter...");

    // Convert base64 data URI to CID attachment for better email client compatibility
    const base64Data = data.qrCodeBase64.replace(
      /^data:image\/(png|jpeg|jpg);base64,/,
      ""
    );
    const htmlContent = generateGBCTicketEmailHTML({
      ...data,
      qrCodeBase64: "cid:qrcode@twonodetechnologies.com",
    });

    const info = await transporter.sendMail({
      from: `"GBC 2.0" <${FROM_EMAIL}>`,
      to: data.email,
      subject: `GBC 2.0 Ticket Confirmation - ${data.ticketNumber}`,
      html: htmlContent,
      attachments: [
        {
          filename: "qrcode.png",
          content: base64Data,
          encoding: "base64",
          cid: "qrcode@twonodetechnologies.com",
        },
        ...(data.receiptPdfBuffer
          ? [
              {
                filename: `GBC-Receipt-${data.ticketNumber}.pdf`,
                content: data.receiptPdfBuffer,
                contentType: "application/pdf",
              },
            ]
          : []),
      ],
    });

    console.log("✅ Email sent successfully! MessageID: %s", info.messageId);
    console.log("Email info:", info);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("❌ Failed to send ticket confirmation email:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send contact inquiry confirmation
 */
export async function sendGBCContactConfirmation(
  name: string,
  email: string,
  subject: string
): Promise<{ success: boolean }> {
  try {
    const html = `
      <h2>Thank you for contacting GBC 2.0</h2>
      <p>Dear ${name},</p>
      <p>We have received your inquiry regarding: <strong>${subject}</strong></p>
      <p>Our team will review your message and respond within 24-48 hours.</p>
      <p>Best regards,<br>The GBC Team</p>
    `;

    await transporter.sendMail({
      from: `"GBC 2.0" <${FROM_EMAIL}>`,
      to: email,
      subject: "GBC 2.0 - Inquiry Received",
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send contact confirmation:", error);
    return { success: false };
  }
}

/**
 * Send admin notification for new inquiry
 */
export async function sendGBCAdminNotification(
  type: string,
  name: string,
  email: string,
  phone: string | undefined,
  subject: string,
  message: string
): Promise<void> {
  try {
    const html = `
      <h2>New ${type} Inquiry - GBC 2.0</h2>
      <p><strong>From:</strong> ${name} (${email})</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <hr>
      <p><small>Received at: ${new Date().toLocaleString()}</small></p>
    `;

    await transporter.sendMail({
      from: `"GBC System" <${FROM_EMAIL}>`,
      to: FROM_EMAIL,
      subject: `[GBC Admin] New ${type} Inquiry`,
      html,
    });
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}

/**
 * Send check-in confirmation email
 */
export async function sendGBCCheckInConfirmation(
  name: string,
  email: string,
  ticketNumber: string,
  checkedInAt: Date
): Promise<void> {
  try {
    const html = `
      <h2>Welcome to GBC 2.0!</h2>
      <p>Dear ${name},</p>
      <p>You have been successfully checked in at <strong>${checkedInAt.toLocaleString()}</strong></p>
      <p>Ticket Number: <strong>${ticketNumber}</strong></p>
      <p>Enjoy the conference!</p>
      <p>Best regards,<br>The GBC Team</p>
    `;

    await transporter.sendMail({
      from: `"GBC 2.0" <${FROM_EMAIL}>`,
      to: email,
      subject: "GBC 2.0 - Check-In Confirmed",
      html,
    });
  } catch (error) {
    console.error("Failed to send check-in confirmation:", error);
  }
}

/**
 * Send reply to inquiry
 */
export async function sendGBCInquiryReply(
  recipientEmail: string,
  recipientName: string,
  replySubject: string,
  replyMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .content {
            padding: 40px 30px;
          }
          .message-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GBC 2.0 - Response to Your Inquiry</h1>
          </div>
          
          <div class="content">
            <p>Dear <strong>${recipientName}</strong>,</p>
            
            <p>Thank you for reaching out to us. We're pleased to respond to your inquiry.</p>
            
            <div class="message-box">
              ${replyMessage.replace(/\n/g, "<br>")}
            </div>
            
            <p>If you have any further questions, please don't hesitate to contact us.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The GBC Team</strong><br>
              Two Node Technologies
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Contact Us</strong></p>
            <p>
              📧 <a href="mailto:info@twonodetechnologies.com">info@twonodetechnologies.com</a><br>
              📞 +234-916-0002-740<br>
              📍 No. 58 Kudirat Abiola Way, Oregun, Ikeja, Lagos State
            </p>
            <p style="margin-top: 20px; font-size: 12px;">
              #GBC2.0 | Theme: "Geospatial Capital: A Catalyst for Inclusive Growth"
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
              © 2025 Two Node Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"GBC 2.0" <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: replySubject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send inquiry reply:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("Email server is ready to send messages");
    return true;
  } catch (error) {
    console.error("Email server verification failed:", error);
    return false;
  }
}

/**
 * Send Certificate of Attendance email. Generates the certificate PDF
 * server-side (same renderer the download route uses — see
 * certificatePdfService) and attaches it directly, instead of only linking to
 * the print-only web page as before.
 */
export async function sendGBCCertificateEmail(
  ticket: GBCCertificateTicket & { email: string },
  customMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { generateCertificatePdfBuffer, getCertificateVerificationUrl } =
      await import("@/gbc/services/certificatePdfService");
    const certificateUrl = getCertificateVerificationUrl(
      ticket.ticketNumber,
      ticket.certificatePublicId
    );
    const pdfBuffer = await generateCertificatePdfBuffer(ticket);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1A1024; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #FBF8F2; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #1A1024; color: white; padding: 30px 20px; text-align: center; border-bottom: 3px solid #C9A24B; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
          .header p { margin: 6px 0 0; font-size: 12px; color: #C9A24B; letter-spacing: 1px; }
          .content { padding: 40px 30px; text-align: center; }
          .message-box { background: #ffffff; border-left: 4px solid #5B21B6; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: left; white-space: pre-wrap; word-wrap: break-word; color: #4b5563; }
          .button { display: inline-block; background: #5B21B6; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 30px 0; font-size: 16px; }
          .attach-note { font-size: 13px; color: #6B6472; }
          .footer { background: #ffffff; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #e5e5e5; }
          .footer a { color: #5B21B6; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${ticket.editionRef.name} — Certificate of Attendance</h1>
            <p>GEOSPATIAL BUILDERS COURSE</p>
          </div>
          <div class="content">
            <p style="font-size: 18px;">Dear <strong>${ticket.name}</strong>,</p>

            <div class="message-box">
              ${customMessage.replace(/\n/g, "<br>")}
            </div>

            <p class="attach-note">Your certificate is attached to this email as a PDF. You can also view and verify it online:</p>

            <a href="${certificateUrl}" class="button" style="color: #ffffff;">View & Verify Certificate</a>

            <p style="margin-top: 30px; text-align: left;">
              Best regards,<br>
              <strong>The GBC Team</strong><br>
              TwoNode Technologies
            </p>
          </div>
          <div class="footer">
            <p>
              <a href="https://www.twonodetechnologies.com">twonodetechnologies.com</a>
              &nbsp;&middot;&nbsp;
              <a href="mailto:info@twonodetechnologies.com">info@twonodetechnologies.com</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
              #${ticket.editionRef.name.replace(/\s+/g, "")} | Theme: "${ticket.editionRef.theme}"
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${ticket.editionRef.name} · TwoNode Technologies" <${FROM_EMAIL}>`,
      to: ticket.email,
      subject: `Your ${ticket.editionRef.name} Certificate of Attendance`,
      html,
      attachments: [
        {
          filename: `${ticket.editionRef.name.replace(/\s+/g, "-")}-Certificate-${ticket.ticketNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send certificate email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendGBCCertificateOtpEmail({
  to,
  name,
  code,
}: {
  to: string;
  name?: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const siteUrl = getSiteUrl();
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1A1024; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #1A1024; color: white; padding: 24px 20px; text-align: center; border-bottom: 3px solid #C9A24B; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
          .content { padding: 32px 24px; text-align: center; }
          .code-box { background: #F3E8FF; border: 1px dashed #7C3AED; color: #5B21B6; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 16px; margin: 24px 0; border-radius: 6px; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Certificate Download Verification</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; text-align: left;">Hello${name ? ` <strong>${name}</strong>` : ""},</p>
            <p style="text-align: left; color: #374151;">Use the verification code below to download your Geospatial Builders Conference (GBC) certificate:</p>
            <div class="code-box">${code}</div>
            <p style="font-size: 14px; color: #6b7280; text-align: left;">This code expires in <strong>10 minutes</strong> and can only be used once.</p>
            <p style="font-size: 13px; color: #9ca3af; text-align: left; margin-top: 24px;">
              Enter it on <a href="${siteUrl}" style="color: #5B21B6;">${siteUrl.replace(/^https?:\/\//, "")}</a>. We will never ask you for this code by phone, chat, or email. If you did not request this, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>TwoNode Technologies &middot; GBC</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"GBC Certificates · TwoNode Technologies" <${FROM_EMAIL}>`,
      to,
      subject: `Your GBC Certificate Verification Code: ${code}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send certificate OTP email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
