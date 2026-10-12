# 0015. Files open in an in-page viewer, never in a new tab

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decided by:** roji-tech (2026-10-13: "no media file should open another page for viewing anywhere in the app"; phones and desktops are both big use cases)
- **Related:** [ADR-0012](./0012-multi-provider-storage-and-surveyor-file-privacy.md), [ADR-0013](./0013-bucket-key-layout-public-and-private-prefixes.md), [TASK-0013](../tasks/0013-media-viewer.md), `components/media/`
- **Enforced by:** review for now; a check that fails the build when a file link opens in a new tab is planned (TASK-0013, after every screen is moved)

## Context

Files (survey plan PDFs, red copies, receipts, certificates, photos, signatures) opened in a new browser tab through plain `<a target="_blank">` links, and one screen had its own PDF popup. A new tab loses the user's place on phones, and with private files (ADR-0012, ADR-0013) every link has to go through the file gateway so it can be signed.

## Decision

1. **One viewer, over the current page.** `components/media/` holds a `MediaViewer` dialog, a `MediaLink` (a link that opens it) and a `MediaViewerProvider` mounted once in `app/(projects)/layout.tsx`, so the viewer outlives menus and dialogs that close when an item is chosen.
2. **Images** show with zoom; **PDFs** are drawn by PDF.js page by page (the same on phones and desktops, where an iframe often only offers a download), as they scroll into view; **video and audio** use the browser's player; **anything else** (DWG, KML, XLSX) shows a panel with a Download button, still on the same page.
3. **Several files** step with arrows and the arrow keys. **Escape, the X and the Back button** close it; Back does not leave the page.
4. **Download never navigates.** The gateway `GET /api/v1/surfboard/files/view` takes `download=1&name=…` and signs the link with an attachment disposition (S3 provider).
5. **Links to a viewable file use `MediaLink`.** A link that is not a viewable file (a Remita receipt page, maps, social links) still opens normally; those are not media.
6. The viewer asks the gateway for a 15-minute link (its maximum) because PDF.js and video keep reading after it opens.

## Consequences

- Every screen that showed a file has to be moved (Surfboard done in the first PR; REVA, GBC and the rest in TASK-0013).
- PDF.js adds a lazily loaded bundle (only when a PDF is opened) and needs the bucket's CORS, which already allows `GET` from any origin. If CORS is ever tightened it must keep the app's origins.
- Very large survey sheets are drawn at a capped canvas size (iOS refuses canvases over about 16 million pixels), so extreme zoom is softer than the original.
- Nothing visible says "open in new tab"; Download is the only way to take a copy. Revisit if users need to print from the viewer.

## Alternatives considered

- **Browser PDF viewer in an iframe:** simple, but unreliable on phones (often a download prompt, first page only on iOS).
- **A library lightbox:** covers images well but not PDFs, and a new dependency for what the dialog we already have can do.
- **Leave new tabs:** loses place on phones and splits the experience; rejected by roji-tech.
