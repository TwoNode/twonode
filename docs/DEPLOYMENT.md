# Branches & Environments

The branch names in this repo do **not** map to environments the way
they conventionally would — this has tripped up assumptions before, so
it's written down explicitly.

| Branch | Environment         | Notes                                    |
| :----- | :------------------ | :--------------------------------------- |
| `dev`  | Integration         | Feature PRs land here first.             |
| `main` | **Staging**         | Still being tested; not customer-facing. |
| `prod` | **Live production** | Currently serving real traffic.          |

The periodic "Promote dev to main" PRs move `dev`'s accumulated work
into staging (`main`) for testing. A change only reaches real users
once it's separately merged into `prod`.

`prod` can lag significantly behind `main`/`dev` — as of 2026-09-27 it
was 377 commits behind `main` and missing entire config sections (e.g.
`outputFileTracingIncludes` in `next.config.mjs` didn't exist on `prod`
at all). Before merging a PR targeting `prod`, check whether it depends
on something `prod` doesn't have yet; a fix that reads as "already
shipped" on `main`/`dev` may need a separate cherry-pick onto `prod`
first.

## Vercel deploy notes

The `twonodetech` Vercel project (team `rojitechs-projects`) has `prod`
as its production branch (checked 2026-11-15 with the project API);
`main` is the staging (Preview) deployment. See
[`development-history/`](development-history/) for the write-up of the
"Deploying outputs" platform failure that was traced to
`outputFileTracingIncludes`'s `node_modules/@react-pdf` glob (fixed via
PR #166) — worth checking first if a deploy starts failing at the
"Extracting deployment files" step again.

## Domains

Six names answer on the `twonodetech` project. Checked 2026-11-16 with
the project's domain list
(`vercel api "/v9/projects/twonodetech/domains" --scope rojitechs-projects`).

| Name                              | What it does                                                                                                                                                                                                                                                                                                    |
| :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `www.twonodetechnologies.com`     | **The main address.** Serves the site itself.                                                                                                                                                                                                                                                                   |
| `twonodetechnologies.com`         | 308 to `www.twonodetechnologies.com`.                                                                                                                                                                                                                                                                           |
| `twonodetech.vercel.app`          | 308 to `www.twonodetechnologies.com`.                                                                                                                                                                                                                                                                           |
| `twonodetechnologies.tech`        | **Second address, added 2026-11-15.** Serves the same site itself (no redirect), so the browser keeps `.tech` in the address bar.                                                                                                                                                                               |
| `www.twonodetechnologies.tech`    | 308 to `twonodetechnologies.tech`.                                                                                                                                                                                                                                                                              |
| `staging.twonodetechnologies.com` | **Staging, added 2026-11-16.** Linked to the `main` branch (`gitBranch: main`): it always shows the latest `main` preview deployment. Behind Vercel preview protection, so a browser logs in with Vercel and the mobile app sends the project's bypass header. It is the address the app's staging builds call. |

**The `.tech` address is an alias, and the maintainer's rule is that it
must not change how the main site behaves** (2026-11-15: "without
tampering with the behaviour of https://www.twonodetechnologies.com/").
Adding it changed only the project's domain list: no environment
variable, no code and no deployment changed (the production deployment
of 2026-11-04 is still the latest). Keep it that way: never set
`BASE_URL`, `NEXT_PUBLIC_SITE_URL` or any `KINDE_*` variable to the
`.tech` address. Emails, payment callbacks and share links are built by
`lib/siteUrl.ts` from `BASE_URL`, never from the request's `Host`, so
they point at the main domain whichever address the visitor used.

**Registrar and DNS.** `twonodetechnologies.tech` is registered at
Namify (namify.get.tech). Its nameservers are `ns1.vercel-dns.com` and
`ns2.vercel-dns.com`, set by hand in the registrar's panel (Your domains
\> Manage \> DNS \> Nameservers \> Edit nameservers \> Custom nameservers;
Namify blocks the change while the domain is being transferred). The
zone is therefore Vercel's: change records with `vercel dns`, not in
Namify, whose own DNS records are ignored once custom nameservers are
set. Vercel issues the certificate by itself. The zone has no MX records
(no email on this domain) and no DNSSEC record (Vercel's nameservers do
not sign zones according to community posts; Vercel states nothing
either way).

**What differs on the `.tech` address.** Six pages (`/`, `/contact`,
`/our-story`, `/surfboard`, `/reva`, `/gbc`) were byte-identical on both
addresses on 2026-11-15. These are the differences found:

- **Kinde sign-in does not complete from `.tech` (I-060).**
  `KINDE_SITE_URL` fixes Kinde's return address to
  `https://www.twonodetechnologies.com/api/auth/kinde_callback`, and the
  sign-in's state cookies belong to the host the person started on. The
  REVA login pages link to it; the other login pages showed no Kinde
  link. Not run end to end.
- **Search engines see two identical sites (I-061).** Neither address
  has a `<link rel="canonical">`, and `og:url` is `https://twonode.tech`
  on both (the fallback in `app/(site)/layout.tsx`).
- **Cloudflare Turnstile** is not on the live contact page (2026-11-15).
  If it is switched on, add the `.tech` hostname to the widget in
  Cloudflare and to `TURNSTILE_HOSTNAMES`.
- **No email on the `.tech` domain.** Add MX records with
  `vercel dns add` if wanted.

**Commands.** The Vercel CLI must be logged in (the maintainer's machine
has 65.8.0 in the npx cache). Run it from a scratch folder, always with
the team scope. `vercel api` prints a banner line before the JSON.

```bash
S="--scope rojitechs-projects"; D=twonodetechnologies.tech

vercel domains add $D $S                    # adds it to the team and creates its DNS zone
vercel domains add $D twonodetech $S        # attaches the apex to the project
vercel domains add www.$D twonodetech $S    # attaches www
# www forwards to the apex (the apex serves the site):
vercel api "/v9/projects/twonodetech/domains/www.$D" -X PATCH -F redirect=$D -F redirectStatusCode=308 $S
# a name that forwards can serve the site itself again; a JSON body is needed to null the redirect:
echo '{"redirect":null}' | vercel api "/v9/projects/twonodetech/domains/$D" -X PATCH -H "Content-Type: application/json" --input - $S

# check:
vercel api "/v6/domains/$D/config" $S       # "misconfigured": false
dig +short NS $D @1.1.1.1                   # ns1.vercel-dns.com. ns2.vercel-dns.com.
curl -sI https://$D/ | head -1              # HTTP/2 200
```

`vercel domains inspect` kept listing the old registrar nameservers with
a red cross after the domain was already live: trust the config call and
`dig`, not that screen. To undo, remove the two `.tech` names from the
project (dashboard: `twonodetech` > Settings > Domains, or
`vercel api "/v9/projects/twonodetech/domains/<name>" -X DELETE $S`);
`vercel domains remove $D $S` also drops the domain from the team. The
undo commands were not run. The main site's entries are not involved. A
longer copy with the checks used on 2026-11-15 is in
`out/domain-twonodetechnologies-tech-commands.md`; `out/` is git-ignored,
so it is not on a fresh clone.

## Database migrations

Three Postgres databases back the environments:

- **Production (`prod`)**: `<prod-db>` (live production database serving real traffic, configured via `PROD_DATABASE_URL`).
- **Staging (`main`)**: `<staging-db>` (staging database backing the preview deployment, configured via `STAGING_DATABASE_URL`). _Note: Historical test databases from earlier development phases are superseded and detached from the active pipeline._
- **Local/Integration (`dev`)**: `<local-db>` (local development database instance, configured via `DATABASE_URL`).

Schema lives in `prisma/schema/*.prisma` (one file per product plus `core`/`gis`, wired up by `prisma.config.ts`) and migrations in `prisma/migrations/`.

| Workflow                                   | Trigger                                                               | Does                                                                                                                                                                                                       |
| :----------------------------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/migration-check.yml`    | PR into `dev`, `main` or `prod` touching `prisma/**`                  | **Read-only.** `prisma validate`, then prints the diff between staging (`<staging-db>` via `STAGING_DATABASE_URL`) and the branch's schema. Never writes.                                                  |
| `.github/workflows/migrate-staging.yml`    | push to `main` touching `prisma/migrations/**` or `prisma/schema/**`  | `prisma migrate deploy` against staging (`<staging-db>` via `STAGING_DATABASE_URL`), then `migrate status`.                                                                                                |
| `.github/workflows/migrate-production.yml` | **Manual only** (`workflow_dispatch`), typed confirmation `<prod-db>` | `migrate status` → `migrate deploy` → `migrate status` against `<prod-db>`. Scoped to the `Production` GitHub Environment (restricted to the `prod` branch; `PROD_DATABASE_URL` is readable nowhere else). |

Nothing touches production automatically: verify the migration on staging, merge to `prod`, then run `gh workflow run migrate-production.yml --ref prod` (or use the Actions tab).

**When the new code reads a new column, the migration goes first.** The workflow only runs from `prod`, so the files have to be merged into `prod` before they can be applied. If the code in the same promotion selects the new column (any Prisma query on that model does), merging the code first leaves a gap in which those requests fail. Instead: merge a PR to `prod` that carries only the new `prisma/migrations/**` folders (identical files, no `schema.prisma`, no code; the migrations must be additive), run the workflow, check the post-flight `migrate status`, and only then merge the code. The identical files merge without a conflict later. This is the plan for the mobile batch (PR #533 first, then #521).

### The `0_init` baseline (2026-10-01)

The historical migrations were squashed into one baseline, `prisma/migrations/0_init/migration.sql` (it includes `CREATE EXTENSION IF NOT EXISTS "postgis"`, which used to be set up out-of-band). A **fresh** database simply runs it. A database that already has the schema — staging and production — must be told the baseline is already applied, **once**, before the next `migrate deploy`, or Prisma will try to re-create everything:

```bash
# with DATABASE_URL pointing at that database
npx prisma migrate resolve --applied 0_init
npx prisma migrate status   # should report the database schema is up to date
```

_(The maintainer verified this against the databases; it is recorded here because the squash commit itself doesn't say it. Do it before merging the first post-squash migration to `main`/`prod`.)_

### Local development gotchas

- **Two env files, two databases.** Next.js reads `.env.local` over `.env`; the Prisma CLI (via `prisma.config.ts` → `dotenv/config`) reads **only `.env`**. If `.env.local` points the running app at a remote database (e.g. `<staging-db>`) while `.env` points at a local one, `npx prisma migrate …` will run against the local database while the app talks to the remote one — check which `DATABASE_URL` each tool sees before running anything destructive.
- `prisma migrate dev --create-only` can fail on the shadow database (extensions/history drift); hand-written SQL migrations have been the pattern. Review the SQL, then apply with `migrate deploy`.
- `npm run build-dev` runs `prisma db push` — fine for a scratch database, never against `main`/`prod` databases (it bypasses migration history).
- `npm run prisma:check` diffs the database (`DATABASE_URL`) against the `prisma/schema/` folder and prints the SQL that would bring the database in line. Empty output, or only `SET DEFAULT concat(...)` lines for the `dbgenerated` defaults (Prisma always lists those), means no drift. It only reads the database. (It used to point at a `prisma/schema.prisma` that no longer exists.)

## Runtime configuration worth knowing

- **Cron** (`vercel.json`): `/api/cron/subscription-expiry-reminders` daily at **08:00 UTC**. It is guarded by the cron secret and scans `active` subscriptions by `currentEnd`, stamping `expiryReminderSentAt`; a stamp from the cycle's 3-day window (or later) means the reminder is done, so each expiry cycle is reminded once. `/api/cron/push-receipts` daily at **10:00 UTC** (TASK-0015 1I.6): reads the delivery receipts of pushes to the mobile app and deletes the push tokens of uninstalled phones; guarded by the same secret, and it does nothing unless `PUSH_ENABLED=1`. **A Hobby plan allows only daily crons and runs them anywhere in the hour, so a push sent in the 15 minutes before a run, or run late, can miss its receipt (Expo keeps receipts 24 hours); a dead token is still found on a later push. On a Pro plan, change the schedule to `0 * * * *`.** The same run deletes push cool-down rows over a day old. The migrations `20261029100000_push_receipt_tickets` and `20261029110000_push_preferences` (two new tables each, additive) run before the code.
- **Connection pool**: `lib/prisma.ts` appends `connection_limit=7&pool_timeout=30` to `DATABASE_URL` for each serverless instance (its header comment still says 5). Each warm lambda holds up to 7 connections, so concurrency × 7 must stay under the database's `max_connections`.
- **Interactive transactions**: Prisma Client 6 defaults to `maxWait` 2 s / `timeout` 5 s. Anything that loops over many rows inside `prisma.$transaction(async tx => …)` (bulk fulfilment, imports) must chunk the work and pass an explicit `timeout`.
- **Environment variables** (Vercel, set per environment: Production, Preview which is staging, Development):
  - AWS S3 uses one set only: `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. The old `REVA_AWS_*` and `SURFBOARD_AWS_*` names are gone from the code (PR #356); `REVA_AWS_*` can be deleted from Vercel once prod runs on `AWS_*`. The GBC and REVA helpers throw at startup if these are missing.
  - `CERTIFICATE_OTP_SECRET` is required in production (the OTP service throws without it); each environment has its own value.
  - `CRON_SECRET` is set for Production and Preview. Both the cron route (`CRON_SECRET`) and the Red Copy webhook (`REDCOPY_WEBHOOK_SECRET`) now fail closed: with the variable missing they refuse every request (I-017, I-018). `REDCOPY_WEBHOOK_SECRET` is not set, so the Red Copy webhook rejects everything until Red Copy and we agree a value.
  - **Cloudflare Turnstile** (the bot check on the public GBC contact form, I-057): `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public) and `TURNSTILE_SECRET` (secret), set for Production and for Preview when staging should run the check. The check is ON only when both are set, so the code can be deployed before the keys. `NEXT_PUBLIC_` values are baked in at build time, so add them and then redeploy. Optional `TURNSTILE_HOSTNAMES` (comma separated) overrides the hostname the token must have been solved on; unset, the request's own host is expected. The widget (created in the Cloudflare dashboard) must list every hostname the form is served on, including each preview or staging host and, to test locally, `localhost`; otherwise the widget shows error 110200 and nobody can send the form. A local `.env.production` is not read by Vercel.
  - Changing a variable only affects the next deployment.
- **Testing staging from a terminal:** `main` is behind Vercel Authentication, so plain `curl` gets a 302 to the login page. Use `vercel curl <path> --deployment <staging url>` after `vercel login`.
- **Function duration**: Vercel's default function duration with Fluid compute is 300 s (800 s max on Pro), so the practical limits are database timeouts, not the platform's.

## Promoting `dev` → `main` → `prod`

Promotion is by PR (`dev` → `main`, then `main` → `prod`), merged by the maintainer. A local helper, `out/promote.sh`, opens those PRs; it is **untracked** (the `out/` folder is git-ignored), so it isn't available on a fresh clone. When a promotion includes a migration, follow the order above: staging deploys on merge to `main`; production is a separate manual run after the `prod` merge.

**After a promotion that touches the mobile routes**, run `npm run contract:live` against that environment (`API_BASE`, `CHECK_EMAIL`, `CHECK_PASSWORD` of a test surveyor; it only reads, plus one sign-in that it signs out again). It checks every route the app calls against `docs/mobile/openapi.json`'s schemas. See [`docs/mobile/api-contract.md`](./mobile/api-contract.md).
