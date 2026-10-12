import type { GBCCertificateTicket } from "@/gbc/components/certificates/types";

const INK = "#1A1024";
const GOLD = "#C9A24B";
const PURPLE = "#5B21B6";
const CREAM = "#FBF8F2";
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

function detailRow(label: string, value: string, last = false): string {
  return `
    <tr>
      <td class="stack stack-label" valign="top" style="padding:11px 0;${last ? "" : `border-bottom:1px solid ${RULE};`}width:112px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">${label}</td>
      <td class="stack" valign="top" style="padding:11px 0;${last ? "" : `border-bottom:1px solid ${RULE};`}font-size:15px;font-weight:600;color:${INK};">${escapeHtml(value)}</td>
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
    detailRow("Date", dates),
    venue ? detailRow("Venue", venue) : "",
    detailRow("Ticket no.", ticket.ticketNumber, true),
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(eventName)} — Certificate of Attendance</title>
  <style>
    @media only screen and (max-width: 480px) {
      .px { padding-left: 22px !important; padding-right: 22px !important; }
      .stack { display: block !important; width: auto !important; border-bottom: 0 !important; padding: 0 !important; }
      .stack-label { padding-top: 12px !important; }
      .h1 { font-size: 24px !important; }
      .btn a { display: block !important; }
      .dot { display: none !important; }
      .flink { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#EFEAE1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your certificate for ${escapeHtml(eventName)} is attached, with a link to verify it online.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE1;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${CREAM};border-radius:10px;overflow:hidden;">
        <tr><td class="px" style="background:${INK};padding:36px 36px 30px;border-bottom:3px solid ${GOLD};">
          <div style="font-size:12px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${GOLD};">Certificate of Attendance</div>
          <div class="h1" style="margin-top:12px;font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;">${escapeHtml(eventName)}</div>
          ${theme ? `<div style="margin-top:10px;font-size:14px;line-height:1.5;color:#CDBEE6;">${escapeHtml(theme)}</div>` : ""}
        </td></tr>

        <tr><td class="px" style="padding:34px 36px 8px;">
          <div style="font-size:22px;line-height:1.3;font-weight:700;color:${INK};margin-bottom:16px;">Congratulations, ${escapeHtml(firstName)}.</div>
          ${messageToHtml(customMessage)}
        </td></tr>

        <tr><td class="px" style="padding:8px 36px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${RULE};border-radius:8px;">
            <tr><td style="padding:6px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="px" align="center" style="padding:28px 36px 6px;">
          <table role="presentation" class="btn" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${certificateUrl}" style="display:inline-block;background:${PURPLE};color:#ffffff;padding:15px 34px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">View &amp; verify certificate</a>
          </td></tr></table>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">Your certificate is attached as a PDF. Share the verification link with anyone who needs to confirm it is genuine.</p>
        </td></tr>

        <tr><td class="px" style="padding:26px 36px 34px;font-size:15px;line-height:1.6;color:${INK};">
          Best regards,<br>
          <strong>The GBC Team</strong><br>
          <span style="color:${MUTED};">TwoNode Technologies</span>
        </td></tr>

        <tr><td class="px" align="center" style="background:#ffffff;border-top:1px solid ${RULE};padding:22px 36px;font-size:13px;line-height:1.7;color:${MUTED};">
          <a class="flink" href="https://www.twonodetechnologies.com" style="color:${PURPLE};text-decoration:none;">twonodetechnologies.com</a>
          <span class="dot">&nbsp;&middot;&nbsp;</span>
          <a class="flink" href="mailto:info@twonodetechnologies.com" style="color:${PURPLE};text-decoration:none;">info@twonodetechnologies.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
