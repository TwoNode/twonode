# Crash reports from the Surfboard app: the server half (PROPOSAL, 2026-11-26)

**Status: D1 to D7 ANSWERED by the maintainer on 2026-11-26 (see the next section); the build waits for their "go". Nothing is built, no migration, no environment variable is set.** Where this page says "phase 1: the log only" and "a staff-only list route is possible later", the answers below supersede it.

## Decisions (2026-11-26, the maintainer, one question at a time)

- **As recommended:** D1 crash reports only; D2 no native crash SDK for now; D3 not linked to the account (no account id in the stored report); D4 the person's say (a Send report button, a Profile switch off by default, automatic only in preview builds); D6 production off until the maintainer says (flag `APP_REPORTS_ENABLED`, privacy line and store answers first).
- **D5 differs: a table from day one.** The route writes the scrubbed report to a new `AppReport` table (fields as in section 4's phase 3, no user id), kept 30 days and purged on write, **and** the `app-report` log line. So there IS a migration: it runs (migrate-deploy workflow) **before** the code reaches a branch that deploys it, on staging first and on production before the flag is turned on there.
- **D7 differs: staff read them on a new page in the superadmin sidebar of the Surfboard admin website.** Superadmin only (`SUPERADMIN_ONLY` in `surfboard/access/routes.ts`, the page under `app/(projects)/(surfboard)/surfboard-restricted/dashboard/`), backed by an admin read route under `app/api/v1/surfboard/admin/` (cookie session, paginated, newest first, filters for kind, platform and app version; no account is shown because none is stored). Text is shown as plain text, never as HTML. The mobile contract (1.8.0) covers only the app's POST; the admin route is a web admin route like the audit viewer's.
- **Order of the build:** one API PR to `dev` (migration, route, scrub, purge, admin page, contract, tests, docs) and one app PR, both unmerged until the maintainer says; the migration first; staging flag on Preview first. Asked for by the maintainer on 2026-11-26 while the app's iPhone crash was being hunted ("send it to the analytics endpoint", then "write the reporting proposal first"). The decision record and the app half live in the app repository (`TwoNode/twonode-mobile`): ADR-0014 (Proposed) and TASK-0016, which hold the questions D1 to D7 and the recommendations. This page is what the API would do if they are accepted as recommended.

## 1. What the endpoint is for, and is not for

A signed-in Surfboard app posts **one small crash report** after it closed unexpectedly (or, in a maintainer test build, automatically). We read it to find faults. It is **not** analytics: no stream of actions, no usage counts, no identifier for tracking, and the report is **not linked to the account** in storage.

It sees JavaScript errors and the app's own trail of steps (words and counts). A crash inside the phone's own code (the native map) leaves the app nothing to send but the trail written before it, sent on the next launch.

## 2. The route

`POST /api/v1/surfboard/diagnostics/reports`, built like `auth/mobile/push-token`:

- `withAuth` with `platform: Platform.SURFBOARD`, `roles: [SurfboardRole.USER]` (a bearer session is needed to post, and to be rate-limited; it is not stored with the report), and the same `validateCSRF` check.
- Off unless **`APP_REPORTS_ENABLED=1`** (the same style of switch as `PUSH_ENABLED`): when off, a `404 NOT_FOUND`, and the app stops sending for that run. Set on Vercel **Preview** (staging) first; Production only on the maintainer's word.
- **Body** (zod, `.strict()`: an unknown key is a `400`):

```json
{
  "v": 1,
  "kind": "unexpected-close" | "caught-error",
  "appVersion": "≤32 chars",
  "platform": "ios" | "android",
  "osVersion": "≤16 chars, optional",
  "screen": "≤60 chars",
  "at": "ISO time",
  "aliveAt": "ISO time, optional",
  "memoryWarnings": "0 to 1000, optional",
  "error": { "name": "≤60", "message": "≤200", "fatal": true, "optional": "as a whole" },
  "trail": ["≤24 strings, each ≤90 chars"]
}
```

- **Size:** a `Content-Length` over 8 KB, or a body that reads as larger, is a `413` before parsing.
- **Rate limit:** 10 reports an hour per account, through the existing `consumeRateLimit("app-report:<account id>", <account id>, { max: 10, windowMs: 3_600_000 })` (`RateLimitError`, `429 RATE_LIMITED`). That limiter records the account id with the attempt, not with the report.
- **Answer:** `{ "success": true, "data": {} }`. Nothing is echoed.

## 3. The server scrubs again

The app scrubs first; the server never trusts it. Every string is passed through one pure function (`scrubReportText`, in `lib/diagnostics/` with its own tests) that removes control characters and replaces with `…`: UUIDs, email addresses, runs of 7 or more digits, decimals with 4 or more places (coordinates), JWT-like and `Bearer` strings, and URLs with a query. Then each field is cut to its limit. A report whose scrubbed trail is empty and whose error is absent is still accepted (an unexpected close with nothing else is a fact).

## 4. Where it goes

**Phase 1: the log only.** One line through the existing `logger.warn("app-report", { …fields })` (JSON, so a field can never break a line): searchable in Vercel Logs as `app-report`. On the current Hobby plan runtime logs last about **1 hour** (measured 2026-11-02), so this phase is for same-day debugging with the maintainer watching. **No account id is in the line.**

**Phase 3 (only if reports prove useful): a table** `AppReport` in `prisma/schema/surfboard.prisma`: `id`, `receivedAt` (indexed), `kind`, `appVersion`, `platform`, `osVersion?`, `screen`, `occurredAt`, `aliveAt?`, `memoryWarnings?`, `errorName?`, `errorMessage?`, `fatal?`, `trail Json`; **no user id**. A migration (the migrate-deploy workflow runs **before** the code merges to a branch that deploys it, as for every migration). Kept **30 days**, purged **on write** (about one request in twenty deletes rows older than 30 days, with a limit per delete) rather than by a new scheduled job: `vercel.json` already has two daily crons and a Hobby project may be limited in how many it can have (not checked).

**Reading them:** Vercel Logs (phase 1); SQL or Prisma Studio (phase 3). A staff-only list route is possible later and is not proposed now. If one is ever added, the text is shown as plain text, never as HTML.

## 5. Abuse and what could go wrong

- The repo is public, so the route's shape is public: it needs a real signed-in session, is size-capped, rate-limited, strict about keys, scrubbed, and writes only to a log (phase 1) or a table with no account id (phase 3).
- A signed-in account can still post 10 a hour of junk: acceptable (a log line each); the table's purge bounds the storage.
- Log injection: the line is `JSON.stringify`ed by the logger, so newlines and quotes in a field are escaped.
- A report can carry personal data by accident (a library's error message): the scrub and the 200-character cut are the defence; nothing is read as HTML or run.
- Not a security boundary for anything else: the endpoint changes no account, plan or money state.

## 6. Contract, tests and docs (what the build would include)

- **Contract:** one operation in `lib/mobile/contract/endpoints.ts` with its schema and the error codes it can return (`VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, a `413`); `OPENAPI_VERSION` **1.8.0** (additive, so a minor bump); `docs/mobile/openapi.json` regenerated and copied into the app; `docs/mobile/api-contract.md` updated.
- **Tests:** `401` without a bearer; `400` for a bad body and for an extra key; `413` over 8 KB; `429` on the 11th in the hour; `404` when the flag is off; the scrub (UUID, email, phone, coordinate, JWT, URL with a query, control characters, over-long fields); the log line holds no account id; odd Unicode does not throw.
- **Docs, in the same PR:** `docs/functions/*.md` (the new service function), `docs/mobile/runbook.md` (the search `app-report`, what a report looks like, how to switch it off), a row in `docs/issues/index.md` for the new write endpoint's limits, and this page's status.

## 7. Order and cost

1. API PR (phase 1) to `dev`; promoted to staging in the usual way; `APP_REPORTS_ENABLED=1` on Preview. No migration, so no workflow to run first.
2. The app PR (TASK-0016 phase 2), in one iOS and Android build batched with the fix for the app's iPhone crash (builds are budgeted: the Free plan gives 15 of each a month).
3. Phase 3 and production only on the maintainer's word, after the privacy line and the store answers (app repo TASK-0016 section 7).

Server cost: a few requests per crash; the function does a rate-limit insert and a log line.
