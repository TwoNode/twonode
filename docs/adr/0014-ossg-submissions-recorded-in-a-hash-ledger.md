# 0014. Every submission to OSSG is recorded in a hash ledger before it is sent

- **Status:** Accepted
- **Date:** 2026-10-12
- **Decided by:** roji-tech (2026-10-12: no QR or other mark on the record copy, convert to `.jpg`, keep the hashes)
- **Related:** [TASK-0012](../tasks/0012-ossg-integration-and-red-copy.md), [ADR-0012](./0012-multi-provider-storage-and-surveyor-file-privacy.md), [ADR-0013](./0013-bucket-key-layout-public-and-private-prefixes.md), I-018, I-024
- **Enforced by:** review only until built; then tests on the submission state machine and a check that nothing is sent without a ledger row

## Context

After Record-II approves a plan, the red copy goes to the OSSG API and a certificate comes back. This is a government system, and documents could reach OSSG through someone else's server. We need to say which submissions came from TwoNode and prove what we sent and when. Two ideas were discussed: add a QR code, barcode or number to the image before sending, or hash the image and store the hash first.

## Decision

1. **The record copy is not modified.** No QR code, barcode or number is added to the document, so nobody can claim we altered it. Only the file format changes: the PDF is converted to `.jpg`, the file type OSSG uses (confirmed by roji-tech 2026-10-12).
2. **Hash ledger.** Each submission gets an append-only ledger row, written before anything is sent: plan, approver, random submission id, SHA-256 of the original PDF and of the exact `.jpg` sent, the conversion settings (tool and version, resolution, quality), storage keys, time. After sending, the row gets the OSSG reference, response status, and the returned certificate's key and hash.
3. **Send the exact stored bytes** (idempotency key = submission id), so a re-send has the same hash. A JPEG is not byte-identical if converted twice, so the file is converted once, stored, and that stored file is what gets hashed and sent. The original PDF is kept untouched next to it. Send file content, not a public link.
4. **Ask OSSG to authenticate us** (credentials, ideally request signing) and to echo our submission id. Only OSSG can reject someone else's direct submissions; the ledger lets us disown anything that is not in it.
5. **Red copy files and returned certificates are private** (ADR-0013). Certificates go to `surfboard/<userId>/certificate/<plan number>.pdf`.
6. **Background job**, not the approval request: APPROVED, PREPARED, SENT, CERTIFICATE_RECEIVED, FAILED, with retries and an admin re-send. The OSSG callback verifies a signature and fails closed.

## Consequences

- We can answer "did TwoNode send this exact document, and when" from our own records, and show the `.jpg` is only a format conversion of the untouched PDF (settings are in the ledger).
- Nothing visible on the document links it to us; a printout cannot be checked by eye. Accepted trade-off.
- More moving parts: a table, a job, rendering PDF to image, a callback. PDF to PNG on Vercel is untested; large survey sheets may produce very large images.
- Revisit if OSSG offers its own signed submission or verification.

## Alternatives considered

- **QR or number on the image:** visible, but copyable onto another document, not tied to the content, and it alters the document, which could be used to claim tampering. Rejected by roji-tech.
- **Hash plus a visible mark later:** not pursued; revisit only if OSSG asks for a mark.
- **Do nothing:** leaves us unable to show which submissions were ours.
