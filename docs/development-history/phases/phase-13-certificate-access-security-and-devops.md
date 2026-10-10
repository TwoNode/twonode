# Phase 13: Certificate Access Security & DevOps Hardening (October 8–9, 2026)

**Status:** Completed. **Date:** 2026-10-09. **Branch/PRs:** PR #314, PR #315, PR #316.

## Why

1. GBC certificates previously exposed download endpoints via sequential or guessable identifiers without authentication or one-time challenge gates.
2. The manual certificate generation and email delivery path needed atomic attempt tracking and cryptographic verification URLs.
3. Database migrations lacked strict environment boundaries between staging (`twonode_staging`) and production (`twonode_db`), posing accidental mutation risks.

## Scope

- [x] **Certificate Access Security Overhaul ([ADR-0008](../../adr/0008-gbc-certificate-access.md)):**
  - Generated non-enumerable, collision-resistant `publicId` (CUID/UUIDv4) for certificate verification.
  - Implemented public verification route at `/gbc/verify/[publicId]`.
  - Added atomic, rate-limited email OTP challenge for downloading high-resolution certificate PDFs.
  - Applied schema migration `20261009100000_gbc_certificate_access`.
- [x] **GBC Edition Versioning ([ADR-0009](../../adr/0009-gbc-edition-2-is-the-april-2026-event.md)):**
  - Clarified and formalized GBC 2.0 (April 2026) and upcoming GBC 3.0 event schemas.
- [x] **DevOps & Branch Strategy Hardening ([ADR-0010](../../adr/0010-guarded-production-data-changes.md), [ADR-0011](../../adr/0011-branches-and-environments.md)):**
  - Formalized branch-to-database mapping: `dev` (integration), `main` (staging / `twonode_staging`), and `prod` (production / `twonode_db`).
  - Added guarded CI workflows: automatic staging deployment on push to `main`, and manual dispatch with typed database confirmation (`twonode_db`) for production.
  - Sanitized database mapping in `DEPLOYMENT.md` ([PR #315](https://github.com/TwoNode/twonode/pull/315)).

## Verification Plan & Completion Report

- Migration `20261009100000_gbc_certificate_access` deployed cleanly to staging.
- Security tests in `gbc/services/__tests__/certificateOtpService.test.ts` and `certificateRoutes.test.ts` passing.
- Merged to `dev` and promoted to `main` via [PR #316](https://github.com/TwoNode/twonode/pull/316).
