# Architecture Decision Records (ADRs)

An **Architecture Decision Record (ADR)** is a short, simple document that records one important technical or product choice made during a project: the decision, the reasons behind it, and its consequences. Each one has a title, a status (proposed, accepted, rejected or superseded), the context that drove the choice, the decision itself, and its consequences. When a decision changes, the old record is kept and a new one replaces (supersedes) it, so the project's reasoning keeps an unbroken history.

They stop old debates from restarting and tell a new developer why something is the way it is.

**Other documents:** [`../development-history/progress.md`](../development-history/progress.md) is the log of what happened. [`../future-plans.md`](../future-plans.md) lists plans that are not built. A decision record holds the reasoning behind a choice, and plans and the log link to it.

## Rules

1. **One decision per file**, named `NNNN-short-title.md`, numbered in order. Keep each to about one page.
2. **Never rewrite an accepted record.** If the decision changes, write a new record that supersedes it, set the old record's status to `Superseded by NNNN`, and link both ways. Typo and link fixes are fine.
3. **Write one only for a choice someone might reverse by mistake,** or that cost real effort to learn. Not every change needs one.
4. **Status** is one of: `Proposed`, `Accepted`, `Rejected`, `Superseded by NNNN`.
5. **Say what enforces it.** A test, a CI gate, or database constraint written out.
6. **Write the downsides and the alternatives.** Consequences must list what gets harder; alternatives state what was considered and why it was rejected.
7. **Land it with the change.** An ADR transitions from `Proposed` to `Accepted` in the PR that delivers the implementation.
8. **Treat an accepted ADR as a constraint.** Code that enforces or depends on a decision cites it in a comment (`ADR-0008`). Link PRs and files; never put secrets in a record.

## Template

See [`template.md`](./template.md) for the complete rules and starter template.

```markdown
# NNNN. Title: the choice, in a few words

- **Status:** Proposed | Accepted | Rejected | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Decided by:** Person or role
- **Related:** PR links, files, other records
- **Enforced by:** Test suite, CI gate, or database constraint

## Context

The problem and the forces behind it.

## Decision

What we chose, stated plainly.

## Alternatives considered and rejected

What else was considered and why it was not chosen.

## Consequences & Downsides

What gets better, what gets worse or harder, and what this commits us to later.
```

## Index

| #                                                                  | Decision                                                                             | Status   |
| :----------------------------------------------------------------- | :----------------------------------------------------------------------------------- | :------- |
| [0001](./0001-map-correction-is-display-only.md)                   | The map correction is applied when drawing; stored data stays raw                    | Accepted |
| [0002](./0002-shift-pillarless-plans-on-screen-no-notification.md) | Plans with no pillars: shift their stored outline on screen, notify nobody           | Accepted |
| [0003](./0003-plans-without-a-state-are-lagos.md)                  | Plans and CSV uploads without a state are treated as Lagos                           | Accepted |
| [0004](./0004-other-states-stay-uncorrected.md)                    | States with no shift values stay uncorrected                                         | Accepted |
| [0005](./0005-paystack-mode-follows-the-vercel-environment.md)     | Paystack live or test mode follows the Vercel environment                            | Accepted |
| [0006](./0006-reva-price-is-computed-on-the-server.md)             | The REVA price is computed on the server, and the address is checked against the pin | Accepted |
| [0007](./0007-backend-order-nextjs-nestjs-go.md)                   | Backend order: Next.js now, NestJS later, Go much later                              | Accepted |
| [0008](./0008-gbc-certificate-access.md)                           | GBC certificate access: verify publicly, download with an emailed code               | Proposed |
| [0009](./0009-gbc-edition-2-is-the-april-2026-event.md)            | GBC edition 2.0 is the April 30, 2026 event                                          | Accepted |
| [0010](./0010-guarded-production-data-changes.md)                  | Production data changes are guarded, backed up and explicitly approved               | Accepted |
| [0011](./0011-branches-and-environments.md)                        | Branches and environments: dev integrates, main is staging, prod is live             | Accepted |
| [0012](./0012-multi-provider-storage-and-surveyor-file-privacy.md)  | Multi-provider storage architecture and surveyor file privacy                        | Accepted |
| [0013](./0013-bucket-key-layout-public-and-private-prefixes.md) | The bucket is private by default; public files live under `public/` | Proposed |
| [0014](./0014-ossg-submissions-recorded-in-a-hash-ledger.md) | Every submission to OSSG is recorded in a hash ledger before it is sent | Proposed |
