# Finalize Surfboard Implementations

This plan outlines the steps to finalize and confirm the recent feature requests for the Surfboard survey plans module.

## Proposed Changes

### 1. MultiPolygon Geometry Support

#### [MODIFY] `app/(projects)/(surfboard)/components/SurfboardPlanForm.tsx`
- **Plan Types Validation**: Add validation logic to enforce that if a user selects `APPROVED LAYOUT` or `PROVISIONAL LAYOUT`, they *must* upload more than one CSV file (`pillarGroups.length > 1`).
- **Per-Polygon Survey Titles**: Add UI fields to allow users to input a distinct survey title for each polygon/parcel when `useSameTitleForAll` is unchecked.
- **Administrative boundaries per polygon**: `handleCsvUpload` currently fetches and stores `ward`, `lga`, etc., per parcel in the `parcels` array. This fulfills the request to "store the different ward/LGA for the polygons". I will ensure these are preserved.

#### [MODIFY] `app/(projects)/(surfboard)/actions/codActions.ts`
- **Charting Remarks Separation**: Update `getChartingInterpretation` so that when evaluating a MultiPolygon, the final string is joined by `, ` instead of `\n`, and the `Parcel X:` prefix is removed. For example: `Free from Government Acquisition, Free from Government Acquisition`.
- **CoD Fee Separation**: `submitRedCopyBatch` already correctly loops over each polygon in a `MultiPolygon` to intersect with `Scale_of_fees`, calculate the area per polygon, determine if it requires a double fee, and sums it all up for the final `codFee`. This requirement is **already successfully implemented** but will be verified.

#### [MODIFY] `app/(projects)/(surfboard)/surf-mda/dashboard/charting/page.tsx`
#### [MODIFY] `app/(projects)/(surfboard)/surf-mda/dashboard/surcon/page.tsx`
- **Pillar Coordinates in MDA Roles**: Refactor how pillars are displayed. Instead of a single "Copy" button that copies all coordinates, the UI will loop over the grouped polygons (`Parcel A`, `Parcel B`, etc.) and render a separate block with a dedicated "Copy" button for each parcel.

---

### 2. Withdrawal and Resubmission Flow

#### [MODIFY] `app/(projects)/(surfboard)/components/SurfboardPlanForm.tsx`
- **Reason for Withdrawal Input**: Display a `Textarea` field for `reasonForWithdrawalAndResubmission` whenever the user selects `WITHDRAWAL AND RE-SUBMISSION` as the plan type. Ensure this is validated and passed to the backend.

#### [MODIFY] `app/(projects)/(surfboard)/surfboard/dashboard/plan/SinglePlan.tsx` (or `OptimizedSinglePlanDetails.tsx`)
- **Single Plan Page Display**: Update the UI to display the `reasonForWithdrawalAndResubmission` and the `withdrawalAndResubmissionStatus` (e.g., "Withdrawn", "Resubmitted", or "No_Action") prominently on the plan's detail page.

#### [MODIFY] `app/(projects)/(surfboard)/actions/surfboardActions.ts`
- **Status Sync**: Ensure the logic in `createSurfPlan` that sets the new plan to `Resubmitted` and the referenced plan to `Withdrawn` correctly handles defaults and edge cases. (Currently, the logic exists but will be rigorously verified).

---

### 3. New Pillar Types

- **"REGULAR + ADJOINING" / "SPECIAL + ADJOINING"**: These are already defined in `PILLAR_TYPES` in `surfboardTypes.ts` and appropriately configured in `PILLAR_TYPE_ADJOINING_FILTERS` to trigger the `pillarTypeReferencePlanNumber` field. I will verify that the UI correctly reveals the reference input when these are selected.

## Open Questions

None at this moment. Everything seems clear and straightforward based on your instructions!

## User Review Required
Please review the plan. Specifically, confirm if:
- Joining Charting Remarks with `, ` is sufficient, or if we need to remove duplicates (e.g., if both are "Free from Government Acquisition", should we just say "Free from Government Acquisition" once, or repeat it as requested?). Currently, the plan is to repeat it as requested.
- The UI for per-polygon titles in the form meets your expectations.

## Verification Plan
1. Create a `WITHDRAWAL AND RE-SUBMISSION` plan and verify the "Reason" box appears and the states sync correctly.
2. View the MDA Charting and SURCON dashboards to verify each parcel gets its own copy button.
3. Submit a MultiPolygon plan and ensure charting remarks are separated by commas.
4. Verify "APPROVED LAYOUT" enforces multiple CSV uploads.
