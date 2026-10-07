# 0010. Production data changes are guarded, backed up and explicitly approved

- **Status:** Accepted
- **Date:** 2026-10-06
- **Related:** [0003](./0003-plans-without-a-state-are-lagos.md), [0009](./0009-gbc-edition-2-is-the-april-2026-event.md)

## Context

Several fixes needed data changes on a live database: setting the state of 56 plans, and correcting an edition row. Reads are safe; writes are not reversible by redeploying.

## Decision

- By default, work on the production database is read-only (sessions opened with `default_transaction_read_only=on`).
- A write needs an explicit go for that specific change, after the exact statement and the rows it will touch have been shown.
- Before writing, save the affected rows to a backup file. Run the write in a transaction that commits only if the number of rows changed is exactly what was expected, and verify afterwards.
- Connection strings and credentials are never printed, committed or written into documents.
- Staging and test databases get the same change separately, and only when asked.

## Consequences

- A mistaken or too-broad update rolls back instead of landing.
- Every data change has an undo file and a short record of what was changed and why.
- Writes take one extra confirmation step.
