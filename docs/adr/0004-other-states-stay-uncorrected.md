# 0004. States with no shift values stay uncorrected

- **Status:** Accepted
- **Date:** 2026-10-06
- **Related:** [0001](./0001-map-correction-is-display-only.md)

## Context

Only Lagos has a measured correction. Plans in Ogun, Ondo, Oyo and FCT exist, but no values are available for them.

## Decision

Those states are drawn as stored. We do not guess or reuse the Lagos values. If values are produced later, they are added under `coordinateShifts` in the Surfboard settings with no code change.

## Consequences

- Plans in those states may sit a few metres off on screen until values exist.
- Using Lagos values elsewhere could make positions worse, so a missing value is safer than a wrong one.
