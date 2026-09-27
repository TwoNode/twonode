# Branches & Environments

The branch names in this repo do **not** map to environments the way
they conventionally would — this has tripped up assumptions before, so
it's written down explicitly.

| Branch | Environment | Notes |
| :--- | :--- | :--- |
| `dev` | Integration | Feature PRs land here first. |
| `main` | **Staging** | Still being tested; not customer-facing. |
| `prod` | **Live production** | Currently serving real traffic. |

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
