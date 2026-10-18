# TASK-0013: Session Batch — 2026-10-13 (in-page media viewer)

- **Status:** Completed (viewer, Surfboard, REVA, and GBC public links migrated; awaiting final manual smoke check on staging device)
- **Priority:** High
- **Assignee:** Maintainer / Agent
- **Target Branch / PR:** `feat/media-viewer`
- **Created:** 2026-10-13 UTC

> **How to tick:** change `[ ]` to `[x]`.

## 1. Objective

No file opens in a new tab anywhere in the app: it opens in a popup on the same page ([ADR-0015](../adr/0015-files-open-in-an-in-page-viewer.md)), on phones and desktops.

## 2. Work breakdown

### Phase 1: viewer and Surfboard (this PR)

- [x] `components/media/`: `MediaViewer`, `MediaLink`, `MediaViewerProvider` (mounted in `app/(projects)/layout.tsx`), PDF.js page viewer, file type and link helpers, zoom and canvas math. Tests for the helpers (922 total passing).
- [x] Gateway `download=1&name=` (S3 attachment disposition), `surfboardApi.files.getDownloadUrl`; the "Download" links on the plan file cards use it.
- [x] 26 file links moved to `MediaLink` across the Surfboard screens (plans list, single plan, red copies, receipts, edit plan modal, MDA pages, submitted batches, record copy upload, plan form file list); the ad-hoc PDF popup in `CertificateBatchSelection` replaced.
- [x] Checked in a real browser (Chrome) at 1280 px and 390 px with a 3-page PDF, an image and a DWG: opens in place, no new tab, next and previous, zoom, Escape, Back and the X close it, DWG shows the download panel, no page errors.
- [ ] Check on a real iPhone and Android phone, on staging with a login: a plan PDF, a red copy, a receipt, an image; Back button; download. _(Waiting on: roji-tech or whoever has a staging login)_
- [ ] Confirm the production build bundles the PDF.js worker. The staging build of #374 is Ready; the check is to open a PDF on staging. _(Waiting on: staging login)_

### Phase 2: the rest of the app

- [x] REVA (8 file links and the OTP secure download), GBC (gallery, home gallery, ticket QR), Surfboard public plan certificates now use the viewer. The other new-tab spots were classified as external (maps, payment and Remita pages, social, mail, the state GIS certificate PDF). (Done 2026-10-13, branch `feat/media-viewer-phase2`)
- [x] Plain images shown inline: `EnlargeableImage` (REVA site photos use it). (Done 2026-10-13, branch `feat/viewer-swipe-and-enlarge`)
- [x] `components/media/__tests__/noNewTabFiles.test.ts` fails when a new `target="_blank"` or `window.open` appears that is not on the reviewed list (each entry has a reason). (Done 2026-10-13)
- [x] Touch swipe between files in a group (one finger, sideways; zoomed pictures pan instead). (Done 2026-10-13)
