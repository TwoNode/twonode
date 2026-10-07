# 0008. GBC certificate access: verify publicly, download with an emailed code

- **Status:** Proposed
- **Date:** 2026-10-07
- **Related:** PR #295 (wrong-name fix), PR #310 (long names), `app/(projects)/(GBC)/gbc/certificate/`, `app/api/v1/gbc/tickets/[ticketNumber]/certificate-pdf`

## Context

The certificate page and the PDF are public and need only a ticket number (`GBC2_` plus 6 hex characters, which is guessable). The page does not check that anyone qualifies: 93 of the 240 tickets were never checked in, yet each opens a "Certificate of Attendance". Every PDF download runs a render process. A lookup bug (#295) showed one person's name on every link. Certificates also read the edition live, so editing an edition changes certificates already given out.

## Decision (agreed so far)

- A public verification page shows the holder's **full name**, the event, the date and the status, with no download. It uses a long random identifier, is rate limited and `noindex`.
- The **admin decides who gets a certificate**. It is not tied to check-in.
- The PDF is downloaded after an **emailed one-time code**, sent only to the **email on the ticket** and never to a typed address, with capped attempts and the same reply whether or not a certificate exists.
- Existing `/gbc/certificate/<ticketNumber>` links keep working, as verify-only.
- Event details are copied onto the ticket when the certificate is issued, so a later edit cannot change it.

## Open

The detailed design (data model, limits, code storage) is to be written when the access proposal arrives. Until then this record stays Proposed.

## Consequences

- Certificates can no longer be harvested by guessing ticket numbers, and a never-issued certificate cannot be downloaded.
- Holders need access to the ticket email. A lost mailbox needs a documented recovery path.
- Group tickets list several attendees, and each gets their own certificate through the email on their own ticket line.
