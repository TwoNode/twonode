# TASK-0014 addendum: R2 research findings (2026-10-18)

Status: **Paused by decision (2026-10-18).** Nothing is provisioned. Resume from "Decisions needed". This corrects parts of ADR-0016 and TASK-0014 (single public bucket, DNS assumption).

## Corrections to the earlier plan

1. **One public bucket does not work.** R2 public access is per bucket: every custom domain (and `r2.dev`) exposes the whole bucket. There are no per-prefix rules. Connecting `storage.twonodetechnologies.com` to a bucket holding all 7,344 objects would expose survey plans, record copies and QR codes. Design needed: a private `twonode-store` (no public access, presigned links only) plus, if public serving is wanted, a separate public bucket (e.g. `twonode-public`).
2. **Custom domain needs the domain as a Cloudflare zone** in the same account. `twonodetechnologies.com` is on Vercel nameservers. Partial (CNAME) setup is Business/Enterprise only. Options: move nameservers (risky, not recommended), use a separate cheap media domain on Cloudflare, serve public images through an app route, or `r2.dev` (rate-limited, no cache/WAF, dev only).
3. **CORS:** one `*` per origin is valid and can span dots (`https://*.twonodetechnologies.com` does not match the bare domain). Ports cannot be wildcarded: list each (`3000`, `3211`). Replace `https://*.vercel.app` with the project's exact preview domain. Browser presigned flows need only `GET`, `PUT`, `HEAD`. Purge the CDN cache after CORS changes.
4. **Sippy** copies only on `GetObject` (not `HeadObject`), never refreshes after the first copy, and copies only `x-amz-meta-` metadata. Objects uploaded to S3 after the bulk copy and never read stay missing, so cutover needs a final Super Slurper run in **Skip** mode. Presigned-URL behaviour is undocumented: test on staging.
5. **Super Slurper:** needs `s3:Get*`/`s3:List*`; never deletes at source; skips Glacier tiers (except Instant Retrieval) and objects over 1 TB; ETags may differ (verify by count and bytes, not ETag); Content-Type preservation not documented (HEAD a PDF and an image after the copy); speed and price not documented ("10 to 15 minutes" is a guess).
6. **Pricing:** free tier 10 GB storage, 1M Class A, 10M Class B per month, free egress; then $0.015/GB-month. Slurper and Sippy have their own charges (amounts not on the pricing page); check the dashboard before running. AWS egress for ~3.7 GB is about $0.33 at list price, possibly free under AWS's allowance (not checked for this account).

## Facts from the code and inventory

- Public GBC images: about 241 objects, 22 MB. Everything else (about 3.7 GB: `surfboard/` 3.1 GB, `uploads/` 630 MB, `reva/` ~100 MB) is private.
- Only Surfboard goes through `lib/storage`. Still on the AWS SDK or hand-built S3 URLs: `app/(projects)/(reva)/reva/actions/awsActions.ts`, `gbc/utils/aws-s3.ts`, `getSurfboardFileUrl` in `surfboardUtils.ts`, and URL building in `lib/storage/providers/s3.ts`. `STORAGE_PROVIDER=r2` today would move only Surfboard and split data across two stores.
- Database rows hold full S3 URLs. `extractKeyFromUrl` handles private files; public GBC URLs are used directly by browsers and would break at cutover unless handled.

## Recommended order

1. Update ADR-0016 and TASK-0014 with the corrections above (docs).
2. Design doc: move REVA and GBC onto `lib/storage`; URL strategy (leave public GBC images on S3 for the first cutover, then store keys instead of URLs; a DB rewrite needs the full guarded-transaction process).
3. Provision (user, in the dashboard): R2 enabled, private `twonode-store` with no public access, bucket-scoped token (keys straight into Vercel), corrected CORS, read-only IAM user for Slurper.
4. Slurper into the private bucket (Overwrite once), verify count and bytes. No app config change.
5. Move REVA/GBC to the abstraction behind a flag; test on staging with `STORAGE_PROVIDER=r2` (browser presigned upload, Sippy read).
6. Prod cutover: final Skip-mode Slurper run, then env change; keep S3 as warm standby 30 days.
7. Decide public GBC serving separately; do not block steps 3 to 6 on it.

## Decisions needed (roji-tech)

1. Public GBC images: separate media domain on Cloudflare, app route, or leave on S3 for now?
2. Confirm the main domain's nameservers stay off-limits for this migration.
3. Go-ahead for the ADR/TASK edits and the design doc.

Sources: Cloudflare docs for public buckets, CORS, Sippy, Super Slurper, R2 pricing and partial DNS setup (developers.cloudflare.com, read 2026-10-18).
