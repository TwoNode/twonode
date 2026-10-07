# 0003. Plans and CSV uploads without a state are treated as Lagos

- **Status:** Accepted
- **Date:** 2026-10-05
- **Related:** PR #291, `utils/csvState.ts`, [0001](./0001-map-correction-is-display-only.md)

## Context

The correction is chosen by a plan's `state`. 56 older plans had no state, so they were never corrected, and a CSV uploaded into the map viewer has no state column.

## Decision

- A CSV with no state, or an empty one, is drawn as Lagos (`resolveCsvState`).
- The 56 older plans were all in Lagos, so their `state` was set to Lagos in the data: prod and staging on 2026-10-06, the shared `test_db` on 2026-10-07. A test plan with no location was left alone.

## Consequences

- Lagos is the default for a missing state. A surveyor outside Lagos who uploads a CSV with no state would be drawn with the Lagos offset, so the state column should be filled in for them.
- New plans should always get a state at creation, so this default is only a safety net.
