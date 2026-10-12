# 0014. Every submission to OSSG is recorded in a hash ledger before it is sent

- **Status:** Proposed
- **Date:** 2026-10-12
- **Decided by:** roji-tech (to accept)
- **Related:** [TASK-0012](../tasks/0012-ossg-integration-and-red-copy.md), [ADR-0012](./0012-multi-provider-storage-and-surveyor-file-privacy.md), [ADR-0013](./0013-bucket-key-layout-public-and-private-prefixes.md), I-018, I-024
- **Enforced by:** review only until built; then tests on the submission state machine and a check that nothing is sent without a ledger row

## Context

After Record-II approves a plan, the red copy goes to the OSSG API and a certificate comes back. This is a government system, and documents could reach OSSG through someone else's server. We need to say which submissions came from TwoNode and prove what we sent and when. Two ideas were discussed: add a QR code, barcode or number to the image before sending, or hash the image and store the hash first.

## Decision (proposed)

1. **Hash ledger first.** Each submission gets an append-only ledger row, written before anything is sent: plan, approver, random token, SHA-256 of the original PDF and of the exact image sent, storage keys, time. After sending, the row gets the OSSG reference, response status, and the certificate's key and hash.
2. **Send the exact stored bytes** (idempotency key = submission id), so a re-send has the same hash. Send file content, not a public link.
3. **Optional visible token or QR** in a margin, never over the plan, linked to the token (not the plan number) and a verify page. Only after OSSG confirms it accepts a modified image.
4. **Ask OSSG to authenticate us** (credentials, ideally request signing) and to echo our reference. Only OSSG can reject someone else's direct submissions; the ledger lets us disown anything that is not in it.
5. **Red copy files and returned certificates are private** (ADR-0013). Certificates go to `surfboard/<userId>/certificate/<plan number>.pdf`.
6. **Background job**, not the approval request: APPROVED, PREPARED, SENT, CERTIFICATE_RECEIVED, FAILED, with retries and an admin re-send. The OSSG callback verifies a signature and fails closed.

## Consequences

- We can answer "did TwoNode send this exact document, and when" from our own records. A QR alone could not.
- More moving parts: a table, a job, rendering PDF to image, a callback. PDF to PNG on Vercel is untested; large survey sheets may produce very large images.
- If OSSG does not accept an altered image, only the ledger remains. That is still the part that matters.
- Revisit if OSSG offers its own signed submission or verification.

## Alternatives considered

- **QR or number only:** visible, but copyable onto another document and not tied to the content, and it alters the plan.
- **Hash only, no visible mark:** what this ADR starts with; nothing visible helps a human check a printout.
- **Do nothing:** leaves us unable to show which submissions were ours.
