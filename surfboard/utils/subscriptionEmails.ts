/**
 * The two Surfboard subscription emails: the expiry reminder and the thank-you
 * after a new subscription or a renewal. Pure (no sending), so the wording is
 * tested; `subscriptionReminderService` and `subscriptionThanksService` send them.
 */

export type SubscriptionEmail = { subject: string; text: string; html: string };

/** "USMAN" and "usman" both read as "Usman"; mixed case is left as typed. */
export function friendlyName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "there";
  return n === n.toUpperCase() || n === n.toLowerCase()
    ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
    : n;
}

/** "October 15, 2026" */
export function longDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Lagos",
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function layout(args: {
  title: string;
  name: string;
  paragraphs: { html: string; strong?: boolean }[];
  buttonLabel: string;
  buttonUrl: string;
}) {
  const body = args.paragraphs
    .map((p) =>
      p.strong
        ? `<h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">${p.html}</h2>`
        : `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151;">${p.html}</p>`
    )
    .join("\n                  ");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(args.title)}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #1a1a1a;">
    <div style="max-width: 520px; margin: 0 auto; padding: 24px 20px;">
      <div style="padding: 20px 0 16px; border-bottom: 3px solid #233dff;">
        <span style="font-size: 16px; font-weight: 700; color: #141c4d; letter-spacing: .02em;">Surfboard</span>
        <span style="font-size: 13px; color: #888888; margin-left: 8px;">by TwoNode Technologies</span>
      </div>
      <div style="padding: 28px 0 20px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #111827; font-weight: 500;">Hi ${esc(args.name)},</p>
        ${body}
        <div style="margin: 28px 0;">
          <a href="${args.buttonUrl}" style="background-color: #233dff; background-image: linear-gradient(135deg, #233dff, #141c4d); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">${esc(args.buttonLabel)}</a>
        </div>
      </div>
      <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888888; font-size: 12px; line-height: 1.6;">
        <a href="https://www.twonodetechnologies.com" style="color: #141c4d; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:info@twonodetechnologies.com" style="color: #888888; text-decoration: none;">info@twonodetechnologies.com</a>
        <p style="margin: 6px 0 0; color: #9ca3af; font-size: 11px;">This is an automated notification from Surfboard. Please do not reply directly to this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

/** Sent about 3 days before a subscription ends. `daysLeft` is 0 or less on the day it ends. */
export function expiryReminderEmail(args: {
  firstName: string | null | undefined;
  daysLeft: number;
  expiresAt: Date;
  renewUrl: string;
}): SubscriptionEmail {
  const name = friendlyName(args.firstName);
  const date = longDate(args.expiresAt);
  const when =
    args.daysLeft <= 0
      ? `Your subscription expires today, ${date}.`
      : `Your subscription expires in ${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"}, on ${date}.`;
  const lines = [
    "Great work gets you recommended.",
    "Keep building trust, standing out, and giving your clients a reason to come back with Surfboard.",
    when,
  ];
  return {
    subject: "Keep your Survey Practice one step ahead",
    text: `Hi ${name},\n\n${lines.join("\n\n")}\n\nRenew: ${args.renewUrl}\n\n— Surfboard by TwoNode Technologies`,
    html: layout({
      title: "Keep your Survey Practice one step ahead",
      name,
      paragraphs: [
        { html: esc(lines[0]), strong: true },
        { html: esc(lines[1]) },
        { html: esc(when).replace(date, `<strong>${esc(date)}</strong>`) },
      ],
      buttonLabel: "Renew",
      buttonUrl: args.renewUrl,
    }),
  };
}

/** Sent once for each payment that buys time: a new subscription or a renewal. */
export function subscriptionThanksEmail(args: {
  firstName: string | null | undefined;
  dashboardUrl: string;
}): SubscriptionEmail {
  const name = friendlyName(args.firstName);
  const lines = [
    "Thank you for choosing Surfboard.",
    "Every survey plan tells a story of work, expertise, and trust. We’re glad to be part of how you organise that work, serve your clients, and build a reputation that gets you recommended.",
    "Here’s to great work and the relationships it builds.",
  ];
  return {
    subject: "Thank you for choosing Surfboard",
    text: `Hi ${name},\n\n${lines.join("\n\n")}\n\nExplore Surfboard: ${args.dashboardUrl}\n\n— Surfboard by TwoNode Technologies`,
    html: layout({
      title: "Thank you for choosing Surfboard",
      name,
      paragraphs: lines.map((l) => ({ html: esc(l) })),
      buttonLabel: "Explore Surfboard",
      buttonUrl: args.dashboardUrl,
    }),
  };
}
