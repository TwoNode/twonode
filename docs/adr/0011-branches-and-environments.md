# 0011. Branches and environments: dev integrates, main is staging, prod is live

- **Status:** Accepted
- **Date:** 2026-09-27
- **Related:** [`../DEPLOYMENT.md`](../DEPLOYMENT.md)

## Context

Branch names do not map to environments the usual way here, so a branch name alone says nothing about risk.

## Decision

- `dev` is the integration branch.
- `main` is **staging**: it is deployed, tested and not customer-facing.
- `prod` is **live production**.
- Changes reach each branch only through a pull request. Nothing is pushed directly to `main` or `prod`. The person who owns releases merges, and a release to `prod` is a separate merge from the one to `main`.
- A pull request never deletes its head branch when that branch is itself a shared branch (for example `main` into `prod`).

## Consequences

- Staging is a place to find problems before customers do, and `prod` can lag behind `main` and `dev`. Before merging into `prod`, check that the change does not depend on something `prod` lacks.
- A schema change is applied with `migrate deploy` on the target database before its release goes live.
- `DEPLOYMENT.md` describes which database backs which branch. Check it against the real environment when the databases change, because staging data has moved between databases before.
