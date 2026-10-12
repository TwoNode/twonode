import type { GBCCertificateTicket } from "@/gbc/components/certificates/types";

const INK = "#1A1024";
const GOLD = "#C9A24B";
const PURPLE = "#5B21B6";
const MUTED = "#6B6472";
const RULE = "#E7DFD0";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DAY = { day: "numeric", month: "long", year: "numeric" } as const;

/** "15 March 2026", "15–16 March 2026" or "28 March – 2 April 2026". */
export function formatEventDates(
  start: Date | string,
  end: Date | string
): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
  if (fmt(s, DAY) === fmt(e, DAY)) return fmt(s, DAY);
  if (
    s.getUTCMonth() === e.getUTCMonth() &&
    s.getUTCFullYear() === e.getUTCFullYear()
  ) {
    return `${s.getUTCDate()}–${fmt(e, DAY)}`;
  }
  return `${fmt(s, { day: "numeric", month: "long" })} – ${fmt(e, DAY)}`;
}

/** Plain text to safe HTML paragraphs; blank lines split paragraphs. */
function messageToHtml(message: string): string {
  return message
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3F3947;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td valign="top" style="padding:9px 12px 9px 0;width:96px;border-top:1px solid ${RULE};font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:${MUTED};">${label}</td>
      <td valign="top" style="padding:9px 0;border-top:1px solid ${RULE};font-size:15px;font-weight:600;color:${INK};">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildCertificateEmailHtml({
  ticket,
  customMessage,
  certificateUrl,
}: {
  ticket: GBCCertificateTicket;
  customMessage: string;
  certificateUrl: string;
}): string {
  const edition = ticket.editionRef;
  const eventName = ticket.certificateEventName || edition.name;
  const theme = ticket.certificateTheme || edition.theme;
  const venue = ticket.certificateVenue || edition.venue;
  const dates = formatEventDates(
    ticket.certificateStartDate || edition.startDate,
    ticket.certificateEndDate || edition.endDate
  );
  const firstName = ticket.name.trim().split(/\s+/)[0] || ticket.name;

  const rows = [
    detailRow("Awarded to", ticket.name),
    detailRow("Event", eventName),
    theme ? detailRow("Theme", theme) : "",
    detailRow("Date", dates),
    venue ? detailRow("Venue", venue) : "",
    detailRow("Ticket no.", ticket.ticketNumber),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(eventName)} — Certificate of Attendance</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your certificate for ${escapeHtml(eventName)} is attached, with a link to verify it online.</div>
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:0 20px;color:${INK};">
    <div style="padding:22px 0;border-bottom:3px solid ${GOLD};">
      <span style="font-size:15px;font-weight:800;color:${PURPLE};letter-spacing:.02em;">GBC</span>
      <span style="font-size:12px;color:#888888;margin-left:8px;">by TwoNode Technologies</span>
    </div>

    <div style="padding:28px 0 8px;">
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
      <h2 style="margin:0 0 14px;font-size:20px;line-height:1.3;font-weight:700;color:${INK};">Your Certificate of Attendance</h2>
      ${messageToHtml(customMessage)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-bottom:1px solid ${RULE};">${rows}
      </table>

      <p style="margin:28px 0;">
        <a href="${certificateUrl}" style="background-color:${PURPLE};background-image:linear-gradient(135deg,#7C3AED,${PURPLE});color:#ffffff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">View &amp; verify certificate</a>
      </p>
      <p style="margin:0;color:#666666;font-size:13px;line-height:1.6;">Your certificate is attached as a PDF. Share the verification link with anyone who needs to confirm it is genuine.</p>
    </div>

    <div style="margin-top:24px;padding:20px 0;border-top:1px solid #e5e5e5;color:#888888;font-size:12px;line-height:1.7;">
      <a href="https://www.twonodetechnologies.com" style="color:${PURPLE};text-decoration:none;font-weight:600;">TwoNode Technologies</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:info@twonodetechnologies.com" style="color:#888888;text-decoration:none;">info@twonodetechnologies.com</a>
      <div style="margin-top:6px;color:#9b9b9b;">Questions about your certificate? Reply to this email and the GBC team will help.</div>
    </div>
  </div>
</body>
</html>`;
}
