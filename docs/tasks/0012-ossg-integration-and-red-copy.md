# TASK-0012: OSSG integration and the red copy flow (planning, paused)

- **Status:** Planned. Paused 2026-10-12; resume from "Where we stopped".
- **Priority:** High (the red copy decision blocks Phase 1 of [TASK-0011](./0011-s3-privacy-and-key-layout.md))
- **Assignee:** Maintainer / Agent
- **Created:** 2026-10-12 UTC

---

## Where we stopped

1. **Red copy files: private (recommended, awaiting roji-tech's yes).** They are stamped cadastral plans (confidential, ADR-0012), the OSSG flow sends file bytes so no public link is needed, and viewing already works through the gateway. If OSSG ever needs to fetch by link, use a signed link that expires after a day or two. Recorded in [ADR-0013](../adr/0013-bucket-key-layout-public-and-private-prefixes.md).
2. **OSSG submission: hash ledger first, QR after OSSG confirms.** Drafted as [ADR-0014](../adr/0014-ossg-submissions-recorded-in-a-hash-ledger.md) (Proposed).
3. **Not started:** any code. Nothing here changes production.

## The flow, as roji-tech described it (2026-10-12)

1. The surveyor submits the record copy PDF. Geometry check runs, then payment.
2. After payment the plan goes to the MDA, where several officers work on it.
3. **Record-II** is the final approver. When they approve, we convert the red copy PDF to PNG or JPEG.
4. We add a QR code, barcode or number to the image, and send it to the OSSG API as one image. (Alternative: hash the image first, save the hash, then send, instead of stamping.)
5. The OSSG API returns the certificate. We download it and store it in the surveyor's certificate folder in the bucket.
6. Why: this is government, and someone could post documents to OSSG through their own server. We want to track every record we submitted through TwoNode.

## What we found (read-only, 2026-10-12)

- `SurfboardPlan` has `redCopyFileUrl`, `redCopyStatus` (NOT_SUBMITTED 2,264, SUBMITTED 72, APPROVED 32, QUERIED 5), `redCopySubmittedAt`, `redCopyError`. 213 plans have a file (104 of them still NOT_SUBMITTED).
- Files sit at `surfboard/<plan number>/redcopy/<timestamp>__<random>__<name>`: 303 files, 136 referenced, 167 unreferenced; 77 stored links point at files that do not exist (66 in one plan-number series). Target key: `surfboard/<userId>/redcopy/<plan number, normalised>.<ext>`.
- `submitRedCopy` (`surfboard/services/planService.ts`) posts the file's permanent URL to `https://api.redcopy.com/submit`. That host does not resolve from the dev machine, and no Surfboard screen was found calling the route; red copies seem to arrive through the "record copy" upload in `AmendPlanModal.tsx`. The OSSG integration replaces this.
- `/api/webhooks/redcopy` skips its secret check when `REDCOPY_WEBHOOK_SECRET` is unset (I-018). The OSSG callback must fail closed.
- Plan numbers are free text (I-024): see Phase 1b in TASK-0011.

## Questions for OSSG

- Accepted file types, size and resolution? Will they accept an image with a QR added in the margin?
- Response immediate, or by webhook (and how is it signed)?
- How do they authenticate us (key, IP allow-list, request signing)? Can they reject submissions without our credentials?
- Do they echo our submission reference in the returned certificate?
- Sandbox available? Retention of submitted data? Rate limits?

## Work breakdown

- [ ] **Decide:** red copy private (ADR-0013) and the hash-ledger approach (ADR-0014). _(Waiting on: roji-tech)_
- [ ] Send the questions above to OSSG. _(Waiting on: roji-tech / OSSG)_
- [ ] Prove PDF to PNG rendering on Vercel with real survey plans (library choice, large sheets, 300 DPI size).
- [ ] Ledger table and migration (migrate-deploy first); background job with states APPROVED, PREPARED, SENT, CERTIFICATE_RECEIVED, FAILED; admin re-send.
- [ ] Optional QR stamp in a margin, bound to a random token (not the plan number), once OSSG confirms.
- [ ] Callback route that verifies a signature and fails closed; retire `submitRedCopy`, `api.redcopy.com` and `REDCOPY_WEBHOOK_SECRET` (I-018).
- [ ] Store the returned certificate at `surfboard/<userId>/certificate/<plan number>.pdf`, private, with its hash.
