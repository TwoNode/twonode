# 0001. The map correction is applied when drawing; stored data stays raw

- **Status:** Accepted
- **Date:** 2026-10-05
- **Related:** `app/(projects)/(surfboard)/utils/surfboardUtils.ts` (`applyVisualizationShift`), `surfboard_settings.settings.coordinateShifts`, `GET /api/v1/surfboard/settings/coordinate-shifts`, [0002](./0002-shift-pillarless-plans-on-screen-no-notification.md)

## Context

Plan coordinates, when drawn on the web basemap, sit a few metres off the real property in Lagos (about 7 m south and 3 m east of where they should be). The pillar coordinates on the plans are the survey record.

## Decision

Pillar coordinates and stored geometry are never changed. The correction is a per-state offset in metres, held in the Surfboard settings and added to the easting and northing at draw time, looked up by the plan's lower-cased `state`. Popups still show the raw values.

## Consequences

- Nothing legal or historical is altered, and the correction can be changed or removed without a data migration.
- The correction lives in the code that draws, so every map component must apply it. A new map must remember to call it.
- A plan needs a `state` to be corrected ([0003](./0003-plans-without-a-state-are-lagos.md), [0004](./0004-other-states-stay-uncorrected.md)).
- Any export that is not drawn on screen (CSV, PDF, API) carries raw coordinates.
