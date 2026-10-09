# 0002. Plans with no pillars: shift their stored outline on screen, notify nobody

- **Status:** Accepted
- **Date:** 2026-10-06
- **Related:** PR #300, `utils/geometryShift.ts`, [0001](./0001-map-correction-is-display-only.md)

## Context

A plan with fewer than three pillars has no outline to build, so the all-plans map draws its stored geometry instead. The pillar-based correction never touched that fallback. On prod this is 58 plans: 26 with no pillars and 32 with one or two, owned by 11 people. Owners can't easily fix it, because they would have to re-enter coordinates they may not have.

## Decision

Shift the stored outline by the same metres as pillars, only when drawing (`shiftGeometryForDisplay`). Tell no owner. A tester confirmed on staging that positions are accurate.

## Consequences

- The plans line up with the others, and nobody has to act or worry about their data.
- Only the all-plans map has this fallback. The single-plan map and the preview need pillars and show nothing without them.
- If owners add pillars later, the pillar path takes over automatically.
