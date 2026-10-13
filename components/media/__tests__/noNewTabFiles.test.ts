import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ADR-0015: no file opens in a new tab. Files go through `MediaLink` or
 * `useMediaViewer().open`. This test counts the places that still ask for a
 * new tab and fails when the count differs from the reviewed list below, so a
 * new file link cannot slip in as `<a target="_blank">`.
 *
 * Every entry is a link to somewhere else (a website, social profile, map,
 * payment page, mail client) or to a file hosted by someone else. If you add a
 * real file link, use MediaLink. If you add an external link, add it here with
 * a reason.
 */
const REVIEWED: Record<string, { count: number; reason: string }> = {
  "app/(main)/signup/SurfBoardSubscriptionPlans.tsx": { count: 1, reason: "external page" },
  "app/(noPopUp)/gbccertificate/page.tsx": { count: 2, reason: "certificate PDF hosted by the state GIS service, not our storage" },
  "app/(projects)/(GBC)/gbc/gallery/page.tsx": { count: 5, reason: "social profile links" },
  "app/(projects)/(GBC)/gbc/speakers/page.tsx": { count: 2, reason: "social profile links" },
  "app/(projects)/(GBC)/gbc/sponsors/page.tsx": { count: 1, reason: "sponsor website" },
  "app/(projects)/(reva)/reva/dashboard/details/SingleRequestPage.tsx": { count: 1, reason: "payment page" },
  "app/(projects)/(reva)/reva/onetimerequest/OneTimeRequest.tsx": { count: 1, reason: "Google Maps" },
  "app/(projects)/(reva)/reva/verifypayment/viewDetails.tsx": { count: 1, reason: "Google Maps" },
  "app/(projects)/(reva)/reva-restricted/dashboard/details/UserRequestDataView.tsx": { count: 1, reason: "payment page" },
  "app/(projects)/(surfboard)/components/AnnouncementModal.tsx": { count: 1, reason: "announcement link" },
  "app/(projects)/(surfboard)/components/OptimizedSinglePlanDetails.tsx": { count: 1, reason: "Google Maps" },
  "app/(projects)/(surfboard)/components/RemitaPaymentModal.tsx": { count: 1, reason: "Remita payment page" },
  "app/(projects)/(surfboard)/components/SubmittedBatchesModal.tsx": { count: 1, reason: "Remita receipt page" },
  "app/(projects)/(surfboard)/components/maps/MaplibreMultiPlans.tsx": { count: 1, reason: "link to a plan page inside a map popup" },
  "app/(projects)/(surfboard)/surfboard-mda/dashboard/accounts/page.tsx": { count: 2, reason: "Remita receipt pages" },
  "app/(projects)/(surfboard)/surfboard/dashboard/plan/SinglePlan.tsx": { count: 1, reason: "Google Maps" },
  "app/(projects)/(surfboard)/surfboard/page.tsx": { count: 1, reason: "company website" },
  "app/(projects)/(surfboard)/surfboardplan/[id]/PublicSurfPlan.tsx": { count: 1, reason: "Google Maps" },
  "components/HomeComponents.tsx": { count: 1, reason: "external page" },
  "components/SurfBoard.tsx": { count: 3, reason: "external pages" },
  "components/WhatsAppButton.tsx": { count: 1, reason: "WhatsApp" },
  "components/media/MediaLink.tsx": { count: 1, reason: "links the viewer cannot show (external pages)" },
  "gbc/components/HomeSpeakers.tsx": { count: 2, reason: "social profile links" },
  "gbc/components/admin/InquiriesTable.tsx": { count: 1, reason: "mail client" },
  "gbc/components/admin/SpeakersList.tsx": { count: 2, reason: "social profile links" },
  "gbc/components/admin/SponsorsList.tsx": { count: 1, reason: "sponsor website" },
  "reva/services/reportService.ts": { count: 1, reason: "link inside an email" },
};

// The marketing sites (/v2 to /v4) have no stored files.
const SCAN_DIRS = ["app", "components", "reva", "gbc", "surfboard", "lib", "utils"];
const SKIP = /(^|\/)(node_modules|__tests__|\.next)(\/|$)|^app\/v\d(\/|$)/;
const NEW_TAB = /target=["']_blank["']|target:\s*["']_blank["']|window\.open\(/g;

function walk(dir: string, root: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full);
    if (SKIP.test(rel)) continue;
    if (statSync(full).isDirectory()) walk(full, root, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(rel);
  }
}

describe("no file opens in a new tab", () => {
  it("matches the reviewed list of new-tab links", () => {
    const root = process.cwd();
    const files: string[] = [];
    for (const dir of SCAN_DIRS) walk(join(root, dir), root, files);

    const found: Record<string, number> = {};
    for (const rel of files) {
      const hits = readFileSync(join(root, rel), "utf8").match(NEW_TAB);
      if (hits) found[rel] = hits.length;
    }

    const expected = Object.fromEntries(
      Object.entries(REVIEWED).map(([path, { count }]) => [path, count])
    );
    expect(found).toEqual(expected);
  });
});
