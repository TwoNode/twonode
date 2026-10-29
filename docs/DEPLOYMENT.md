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

The `twonodetech` Vercel project deploys from `main`. See
[`development-history/`](development-history/) for the write-up of the
"Deploying outputs" platform failure that was traced to
`outputFileTracingIncludes`'s `node_modules/@react-pdf` glob (fixed via
PR #166) — worth checking first if a deploy starts failing at the
"Extracting deployment files" step again.

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

- **Cron** (`vercel.json`): `/api/cron/subscription-expiry-reminders` daily at **08:00 UTC**. It is guarded by the cron secret and scans `active` subscriptions by `currentEnd`, stamping `expiryReminderSentAt` once per expiry date. `/api/cron/push-receipts` daily at **10:00 UTC** (TASK-0015 1I.6): reads the delivery receipts of pushes to the mobile app and deletes the push tokens of uninstalled phones; guarded by the same secret, and it does nothing unless `PUSH_ENABLED=1`. **A Hobby plan allows only daily crons and runs them anywhere in the hour, so a push sent in the 15 minutes before a run, or run late, can miss its receipt (Expo keeps receipts 24 hours); a dead token is still found on a later push. On a Pro plan, change the schedule to `0 * * * *`.** The migration `20261029100000_push_receipt_tickets` runs before the code.
- **Connection pool**: `lib/prisma.ts` appends `connection_limit=7&pool_timeout=30` to `DATABASE_URL` for each serverless instance (its header comment still says 5). Each warm lambda holds up to 7 connections, so concurrency × 7 must stay under the database's `max_connections`.
- **Interactive transactions**: Prisma Client 6 defaults to `maxWait` 2 s / `timeout` 5 s. Anything that loops over many rows inside `prisma.$transaction(async tx => …)` (bulk fulfilment, imports) must chunk the work and pass an explicit `timeout`.
- **Environment variables** (Vercel, set per environment: Production, Preview which is staging, Development):
  - AWS S3 uses one set only: `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. The old `REVA_AWS_*` and `SURFBOARD_AWS_*` names are gone from the code (PR #356); `REVA_AWS_*` can be deleted from Vercel once prod runs on `AWS_*`. The GBC and REVA helpers throw at startup if these are missing.
  - `CERTIFICATE_OTP_SECRET` is required in production (the OTP service throws without it); each environment has its own value.
  - `CRON_SECRET` is set for Production and Preview. Both the cron route (`CRON_SECRET`) and the Red Copy webhook (`REDCOPY_WEBHOOK_SECRET`) now fail closed: with the variable missing they refuse every request (I-017, I-018). `REDCOPY_WEBHOOK_SECRET` is not set, so the Red Copy webhook rejects everything until Red Copy and we agree a value.
  - Changing a variable only affects the next deployment.
- **Testing staging from a terminal:** `main` is behind Vercel Authentication, so plain `curl` gets a 302 to the login page. Use `vercel curl <path> --deployment <staging url>` after `vercel login`.
- **Function duration**: Vercel's default function duration with Fluid compute is 300 s (800 s max on Pro), so the practical limits are database timeouts, not the platform's.

## Promoting `dev` → `main` → `prod`

Promotion is by PR (`dev` → `main`, then `main` → `prod`), merged by the maintainer. A local helper, `out/promote.sh`, opens those PRs; it is **untracked** (the `out/` folder is git-ignored), so it isn't available on a fresh clone. When a promotion includes a migration, follow the order above: staging deploys on merge to `main`; production is a separate manual run after the `prod` merge.

**After a promotion that touches the mobile routes**, run `npm run contract:live` against that environment (`API_BASE`, `CHECK_EMAIL`, `CHECK_PASSWORD` of a test surveyor; it only reads, plus one sign-in that it signs out again). It checks every route the app calls against `docs/mobile/openapi.json`'s schemas. See [`docs/mobile/api-contract.md`](./mobile/api-contract.md).
