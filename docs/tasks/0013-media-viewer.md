# TASK-0013: Session Batch — 2026-10-13 (in-page media viewer)

- **Status:** In Progress (viewer and the Surfboard screens in PR; REVA, GBC and the build check remain)
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
- [ ] Confirm the production build bundles the PDF.js worker (Vercel preview of this PR).

### Phase 2: the rest of the app

- [ ] REVA (about 4 file links), GBC (3), shared components (1), and the 18 "other" new-tab spots to classify (files or external). The GBC gallery video and any lightbox.
- [ ] Plain images shown inline (logo, signature, site photos): optional click-to-enlarge with the same viewer.
- [ ] A check that fails the build when a file link uses `target="_blank"` (like the other `verify-` scripts), added once every screen is moved.
- [ ] Touch swipe between files in a group (not built).
