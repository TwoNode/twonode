# Phase: Architecture Rebuild Phase 0 — Housekeeping

**Status:** Code complete, verified. Blocked on your action (credential rotation) before merge. **Date:** 2026-08-23.

## Why

Before any rebuild work, clear out dead code and unused dependencies so Phase 1+ isn't built on top of things that shouldn't exist. Also the first exercise of the branch discipline (`main` reserved, work happens on a named branch, merged via review) that the rest of the rebuild follows.

## What was built

Branch `rebuild/housekeeping`, all changes purely subtractive:

- Removed `sequelize/` (empty directories, never tracked meaningfully by git), the unused `mongoose` npm dependency, `app/(projects)/(surfboard)/actions/certificateActions.ts`, `app/(projects)/(surfboard)/adminActions/` (whole directory), `app/api/webhooks/paystack/route___.ts` (a dead, underscore-suffixed duplicate).
- Removed empty, orphaned API route folders that resolved to nothing: `api/reva/onetimerequest`, `api/reva/verify-payment`, `api/surfboard/{batches,update-record-copy,users}`, `api/twonodes/`, `api/user/`.
- `tsc --noEmit` and `npm run build` both clean after every deletion.

## Judgment call: `mongoose` removal surfaced pre-existing vulnerabilities

Removing the unused `mongoose` dependency dropped the npm audit count, but 42 vulnerabilities remained from other, still-used dependencies. Flagged, not acted on — out of scope for a housekeeping pass whose job was removing genuinely dead code, not auditing live dependencies.

## Known follow-up, not built here

`test.js` (containing a real, leaked RDS credential:
`postgresql://postgres:reva15p0stgres@revadb.cp284ay4ki61.eu-north-1.rds.amazonaws.com:5432/reva`) is **not deleted yet**, deliberately — deleting the file doesn't un-leak a credential already exposed in git history. Sequenced as: you rotate the credential everywhere it's configured, then the file gets deleted as a trivial follow-up commit. This is the one open item blocking Phase 0 from being fully closed out.

## Verification performed

- `npx tsc --noEmit` — clean after each deletion, not just at the end.
- `npm run build` — clean.
- Manual review of each deleted file/folder's remaining references (grep) before removal, confirming nothing else imported them.

## Next up

Two independent items, neither blocking the other:

1. **Your action:** rotate the RDS credential in `test.js`, then a trivial one-line follow-up commit deletes the file.
2. [PR #27](https://github.com/roji-tech/twonodes/pull/27) is open against `main`, awaiting your review/merge — can merge independently of item 1, since the credential rotation is unrelated to what's actually in the diff.

Phase 1 (Foundations) already started in parallel in an isolated worktree, branched from `rebuild/housekeeping` — see `architecture-rebuild-phase-1-foundations.md`.
