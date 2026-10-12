# 0013. The bucket is private by default; public files live under `public/`

- **Status:** Proposed
- **Date:** 2026-10-12
- **Decided by:** roji-tech (to accept)
- **Related:** [ADR-0012](./0012-multi-provider-storage-and-surveyor-file-privacy.md), [TASK-0011](../tasks/0011-s3-privacy-and-key-layout.md), I-004, I-019 to I-023 in the [issues register](../issues/index.md), `gbc/utils/aws-s3.ts`, `app/(projects)/(reva)/reva/actions/awsActions.ts`, `lib/storage/utils.ts`
- **Enforced by:** review only until the policy and key builders change; then a test on each key builder and a curl check of the bucket policy (see TASK-0011)

## Context

One bucket (`reva-store`) serves three apps. Its policy lets anyone read every object (`s3:GetObject` on `*`), checked 2026-10-12. Object ACLs are disabled (`BucketOwnerEnforced`), so the policy is the only thing making files public.

What lives there (object counts, 2026-10-12): `surfboard/` 6,646 surveyor plans and drawings; `GBC2/` 505 (website photos and logos, plus ticket QR codes); `reva/uploads/` 139 and `uploads/` 469 (clients' documents, reports and site photos, plus an old import of survey plan scans).

Problems:

1. Private files are public. REVA's OTP download hands out short-lived links, but the permanent link is stored in the database and works for anyone.
2. Nothing in a key says whether a file is meant to be public, so the policy cannot be short or audited.
3. `GBC2/` is hard-coded for every GBC upload, although editions are now per-edition.
4. REVA keys are flat (`reva/uploads/<reference>-<timestamp>-<name>`), so a key does not say who owns the file.

## Decision

1. **Private by default.** The bucket policy allows anonymous read only on `public/*`, plus a short, explicit list of legacy prefixes that shrinks as files are moved or served with signed links.
2. **Public files go under `public/`.** GBC website images: `public/gbc/<edition>/{gallery,speakers,logos}/…`. `<edition>` is the per-edition settings key.
3. **New private files go under `private/`; Surfboard keeps its own layout.** New REVA uploads use `private/reva/<requestId>/…` and GBC ticket QR codes use `private/gbc/<edition>/qrcodes/…`. Links are signed after checking the database that the caller may see that request (REVA) or ticket (GBC). `surfboard/<userId>/…` stays exactly as ADR-0012 defines it, because the file gateway's ownership check depends on that prefix; it is private by default like everything else not under `public/`.
4. **Existing objects are not moved by default.** The database stores full URLs, so a move means rewriting rows and risking links already sent. Making them private needs only the policy change; signed links work from the stored key wherever it is. Moving is optional tidy-up, done per group with a copy first (TASK-0011 Phase 5).

## Consequences

- The policy becomes short and easy to check; a new folder cannot become public by accident.
- Private images in pages need a fresh signed link per page load, so the gateway needs a short cache header to avoid re-downloads. Cost: a code change on every page that shows a private file.
- During the transition the policy has an allow-list of legacy prefixes. Each removal needs its own check and a go.
- Surfboard is the one private folder outside `private/`; this ADR is where that is explained.
- Old and new layouts coexist for a while. Revisit if the old prefixes are still listed after one release cycle.
- Surveyor folders that are not user IDs (51 of 94) stay as they are and need a separate cleanup.

## Alternatives considered

- **Block Public Access on the whole bucket:** breaks the public GBC website images and QR codes.
- **A second bucket for public files:** clean, but needs new credentials, CORS and a one-off copy; the single policy above gets the same result sooner. Worth revisiting if CloudFront is added.
- **`private/` for Surfboard too:** the most consistent, but would supersede ADR-0012's `surfboard/<userId>/` key rule and change the gateway check for no extra safety, with 6,646 existing files staying at the old path. Surfboard is the one documented exception.
- **No `private/` root at all:** the policy alone keeps everything private, but a path would not say so and a broad allow rule added later could expose private files without anyone noticing.
- **Rename `GBC2/` in place:** copies about 500 files and breaks every stored and emailed link.
