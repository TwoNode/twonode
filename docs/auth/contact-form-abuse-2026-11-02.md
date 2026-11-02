# Scripted abuse of the public contact form and sign-in (found 2026-11-02)

Prompted by the maintainer noticing unexpected "GBC 2.0 - Inquiry Received" and "[GBC Admin] New GENERAL Inquiry" mails in the notification mailbox's Sent folder. Read-only: nothing was changed on prod. The raw request records are kept in the git-ignored `out/dev/bot-evidence-2026-11-02.jsonl` (country and user agent only; no addresses, no IPs).

## Verdict

It is an automated client, not a person and not a break-in. Nothing in what we can see shows it got into an account. It is using the public contact form as a mail relay and probing the sign-in.

## What the logs show (production, UTC, the 12 hours the CDN log keeps)

- One browser fingerprint (Chrome 142 on macOS) made 481 requests from exit points that rotate across Sweden, Germany, the Netherlands and France. Rounds start at about 08:54, 12:41, 14:05, 15:21, 16:24, 19:07 and 19:47.
- Every `POST /api/v1/gbc/contact` today came from it: 9 in all, 6 accepted (200) and 3 rejected by validation (400, five seconds apart). Each POST follows a `GET /gbc/contact` by 1.7 to 2.3 seconds, which is too fast for a person to fill four fields.
- Every failed `POST /api/v1/auth/login` today came from it: 12 wrong-password answers (401), in bursts of three, five seconds apart, plus 3 validation failures (400). It had no successful sign-in (the 7 successful sign-ins in the window are other clients).
- One round walks the site: a few marketing pages, the contact form, `/surfboard/login` with three tries, `/api/auth/login` (a redirect to Kinde), then `/reva`, `/reva/login` and `/reva/onetimerequest`.
- Separately, a Windows client from Hong Kong requested `/.git/config` and ten `.env*` files at 18:01. Vercel's firewall answered all of them with 403 (denied). Routine scanner noise; nothing was served.

## Why the contact form is attractive to it

`POST /api/v1/gbc/contact` has no sign-in, no rate limit, no captcha and no honeypot. After saving the row, `submitContactForm` (`gbc/services/contactService.ts`) sends two mails through the Zoho account: a confirmation **to whatever address the sender typed** (so to a stranger, with `Dear {name}` and the subject), and an admin notice to ourselves. `gbc/utils/email.ts` puts `name`, `subject` and `message` into the HTML without escaping, so the sender controls markup, links and images in both mails. The three recipients seen on the phone are third parties (businesses and a personal address), not TwoNode staff.

Costs: our sender reputation (and a possible Zoho suspension, which would also stop ticket and certificate mail), clutter in the admin Inquiries page, and attacker-controlled links in a mail that looks like it comes from us.

## What the sign-in limiter does and does not stop

`lib/auth/rateLimit.ts` allows 5 attempts per 5 minutes, keyed by client IP plus email. Three tries per round from a different exit each time stays under that. The log does not record the email tried or the platform, so which accounts were targeted is not known.

## Unknown

The submitted `message` text (the payload), which is the best clue to the goal. It is in the `gbc_contact_inquiries` table and in the admin mail's body in the Sent folder. The maintainer said yes to a read-only query of the last 24 hours on 2026-11-02, but the session's permission classifier refused the way it tried to reach prod (pulling the production environment variables to get the database URL), so it was **not read**. The maintainer can run the query below, or add a permission rule that allows it, or open the 17:24 admin mail in the Sent folder.

Read-only query for the maintainer (or for a Claude session with a go):

```sql
SET TRANSACTION READ ONLY;
SELECT "createdAt", type, status, length(message) AS msg_len, left(subject, 80) AS subject, left(message, 300) AS message
FROM gbc_contact_inquiries
WHERE "createdAt" > now() - interval '24 hours'
ORDER BY "createdAt" DESC;
```

## Recommended fixes (in order)

Item 1 is merged to `dev` (PR #536). Item 2 is built for the contact form only (PR #537, open); the sign-in half is not started. Items 3 to 5 are not started.

1. Contact form: a per-IP and per-email limit with `consumeRateLimit`; escape `name`, `subject`, `message` and `type` in both mails (`escapeHtml` already exists in `gbc/utils/certificateEmailTemplate.ts`); a hidden honeypot field and a minimum time between page load and submit; make the confirmation mail a fixed text that does not repeat what the sender typed.
2. A challenge (Cloudflare Turnstile) on the contact form and on sign-in. **Contact form: built** (`lib/security/turnstile.ts`, `components/security/TurnstileWidget.tsx`; off until `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` are set; the widget must list every hostname). **Sign-in: not started**; it touches every web login page and the scripted client tried three wrong passwords per round from rotating exits, so it needs a decision (always show it on the web sign-in, or only after failures counted per account across all IPs).
3. Sign-in: an account-wide slow-down across all IPs (mind I-013, an attacker locking a real user out), and log the platform and a hash of the email on failure so a campaign can be traced.
4. A Vercel Firewall rate-limit rule on those two POST routes as a quick stopgap while the code fix is built (changes production settings; maintainer's go).
5. Clean up: the inquiry rows from this campaign can be set to CLOSED or deleted once the payload is read.

## Evidence expires

On the Hobby plan the CDN request log keeps 12 hours and the runtime log 1 hour; older data cannot be fetched. The `out/` file above is the only copy of today's records.
