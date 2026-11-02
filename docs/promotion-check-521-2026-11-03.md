# Is PR #521 (main to prod) good to go? The check of 2026-11-03

Read-only: nothing was run against production, no migration was applied, and #521, #533 and #534 were not merged. This records what was checked, what it showed, and what is still open, so the next session does not repeat it. The decision on how to go live is the maintainer's.

**Analysed:** `main` at `44ea0f66` (the head of #521) against `prod` at `a77e1246`. The PR is 207 files, +30,004 / -447. Staging runs exactly `44ea0f66` (Vercel deployment created 2026-10-29), so checks on staging are checks of #521's code.

## Result

The code is in good shape. The only thing that can go wrong on the day is the order of the database change and the code (below). Two things were not checked and need a person.

| Check                                             | Result                                                                                                                                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                    | Clean                                                                                                                                                                                                                  |
| Full test suite on `44ea0f66`                     | 164 files, 2,231 tests pass                                                                                                                                                                                            |
| `next build` (production) on `44ea0f66`, local    | Succeeds (316 s). The staging build of the same commit is Ready on Vercel (compiled in 98 s)                                                                                                                           |
| Build warnings                                    | The "unexpected file in NFT list" warning and the "Dynamic server usage" messages are identical in the live production build of 2026-10-18 and in staging's build: existing noise, not new                             |
| What merging does to prod                         | Merging `main` into `prod` gives a tree identical to `main`. Nothing exists only on `prod` (its 14 prod-only commits are already in `main`'s content), so nothing is lost and there are no conflicts                   |
| Config changes, `prod` to `main`                  | `package.json` (two npm scripts), `vercel.json` (one daily cron, `/api/cron/push-receipts` at 10:00 UTC, allowed on Hobby), `.env.example`. **Unchanged:** `next.config.mjs`, `proxy.ts`, `pnpm-lock.yaml`, `.github/` |
| Environment variables the new code reads          | Only `CRON_SECRET` (present on prod), `PUSH_ENABLED` and `EXPO_ACCESS_TOKEN` (both absent on prod, so push stays off) and `NODE_ENV`. Names only were compared; no values were read                                    |
| Staging, website sign-in (cookies)                | 11 of 11 pass: wrong password 401, sign-in 200, `/auth/me` 200 with the new `verificationCodeSentAt`, refresh rotates the cookie, `/surfboard/dashboard` 200, cross-origin refresh 403, sign-out then 401              |
| Staging, mobile (bearer), `npm run contract:live` | 31 of 31 pass (sign-in, device list, push preferences, plans, records, stats, files, refresh, refresh with a token never issued, sign-out)                                                                             |

## The migrations (four files, all additive and idempotent)

`20261019100000_refresh_token_device_sessions` adds four nullable columns and an index to `RefreshToken`; `20261028100000_device_tokens`, `20261029100000_push_receipt_tickets` and `20261029110000_push_preferences` add four new tables. All use `IF NOT EXISTS`.

Simulated on a scratch local Postgres 16 (PostGIS 3.4), nothing remote: prod's current migrations (`0_init`, `20261009100000_gbc_certificate_access`, `20261013100000_plan_number_key`) by `prisma migrate deploy` from a worktree of `prod`; then the four from a worktree of #533's head by `prisma migrate deploy` (what the workflow runs).

- All four apply; an existing `RefreshToken` row survives with null device columns.
- A second `migrate deploy` says "No pending migrations"; `migrate status` says "Database schema is up to date!" (the message to look for after the real run).
- Replaying each file directly also succeeds (idempotent).
- **The old code works on the new schema:** prod's own Prisma client reads, creates, updates and lists `RefreshToken` rows after the four migrations.
- No schema drift between the database built from the migrations and `main`'s `schema.prisma`, apart from six `SET DEFAULT concat(...)` lines that `prisma migrate diff` also prints against prod's own schema (existing noise).
- `prod`'s branch also carries `20261013100000_plan_number_key`, added after the last production migration run (2026-10-10; there have only ever been two runs, one failed one succeeded). If prod's `_prisma_migrations` table lacks it, the next `migrate deploy` applies it too; it is idempotent. The workflow's pre-flight `migrate status` step shows what is pending before anything changes.

## The ordering risk

Prisma selects every column of a model. If #521's code serves requests before `RefreshToken` has the four new columns, every web sign-in, silent refresh and the proxy's refresh fail with "column does not exist" until the migration runs. The new tables are used only by push code and the daily cron, so they matter little. `migrate-production.yml` is `workflow_dispatch` only and checks out `prod`, so it can apply the four only once their files are on `prod`.

Measured on this repo: a production Vercel build takes 3 to 4 minutes; `migrate-production.yml` took 53 s and 61 s (2026-10-10), `migrate-staging.yml` 26 to 66 s.

Ways to go live:

1. **#533 first (migrations-only PR to `prod`), run the workflow, then merge #521.** No window. Costs one more merge and one no-op prod deploy. The four migration files in #533 have the same git blob ids as in `main`, so #521 then merges without conflict.
2. **One PR: merge #521, then run the workflow straight away.** The migrations are already in #521. The workflow (about 1 minute) should finish before the build (3 to 4 minutes) goes live, a margin of about 2 minutes if it is started within a minute of the merge. It is a race: if the workflow is late or fails, web sign-in and refresh break until it is done, and the way out is Vercel's instant rollback to the previous deployment (the migrations are additive, so the old code runs on the new schema).
3. Applying the four SQL files by hand first: possible (idempotent) but it bypasses the workflow's guard; not recommended.

## Not checked, needs a person

- **Google sign-in on an unverified account with a password (#497).** The first Kinde sign-in removes that password, revokes sessions and emails the person. Cannot be automated (needs a real Google account). A visible change for such users on prod.
- **The website's shared plan Record Copy card (#501)** and the rest of the web UI on staging.
- **#497 covers only the `surfboard` and `reva` Kinde callbacks.** `gbc-restricted`, `reva-restricted`, `scram`, `surf-mda` and `surf-restricted` still use `markEmailVerified` with no password removal: a decision for the maintainer.

## Not in #521

Everything merged to `dev` since 2026-10-29 is not in #521: the record-copy ownership fix (I-046, I-047, **P1, still open on prod**), I-043, I-045, half of I-044, the contact-form fix (I-057) and the other items in `docs/issues/index.md`. Because #521's head is the `main` branch itself, promoting `dev` to `main` first would make #521 carry them (and they then need a staging pass first).

## How it was done

Throwaway worktrees of `prod`, #533's head and `main` (since removed) with `pnpm install --offline` and `prisma generate`; a scratch database in the local Postgres (since dropped) with `DATABASE_URL` set only in the shell process; the staging forwarder `out/dev/staging-proxy.mjs` in the app repo (adds the Vercel bypass header; stopped afterwards) for the staging checks; no production environment variables were pulled. Prod deployment durations came from `vercel ls --environment production`, production variable names from `vercel env ls` (names only).
