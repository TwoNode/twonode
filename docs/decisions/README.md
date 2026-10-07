# Decision records (ADRs)

Short records of technical and product decisions: what was decided, why, and what it costs. They stop old debates from restarting and tell a new developer why something is the way it is.

**Other documents:** [`../development-history/progress.md`](../development-history/progress.md) is the log of what happened. [`../future-plans.md`](../future-plans.md) lists plans that are not built. A decision record holds the reasoning behind a choice, and plans and the log link to it.

## Rules

1. **One decision per file**, named `NNNN-short-title.md`, numbered in order. Keep each to about half a page.
2. **Never rewrite an accepted record.** If the decision changes, write a new record that supersedes it, set the old record's status to `Superseded by NNNN`, and link both ways. Typo and link fixes are fine.
3. **Write one only for a choice someone might reverse by mistake,** or that cost real effort to learn. Not every change needs one.
4. **Status** is one of: `Proposed`, `Accepted`, `Rejected`, `Superseded by NNNN`.
5. Link the pull requests and the files the decision lives in. Do not put secrets, passwords or connection strings in a record.

## Template

```markdown
# NNNN. Title: the choice, in a few words

- **Status:** Proposed | Accepted | Rejected | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Related:** PR links, files, other records

## Context

The problem and the forces behind it.

## Decision

What we chose, stated plainly.

## Consequences

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
