# Pages

Every page route in the app (`page.tsx`/`page.jsx` under `app/`), one file per
platform plus a shared file for everything that isn't part of one product.

| File                             | Covers                                                                                                                 |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| [`gbc.md`](./gbc.md)             | GBC public site (`/gbc/*`) and admin panel (`/gbc-restricted/*`)                                                       |
| [`reva.md`](./reva.md)           | REVA public site/user dashboard (`/reva/*`) and admin panel (`/reva-restricted/*`)                                     |
| [`surfboard.md`](./surfboard.md) | Surveyor dashboard (`/surfboard/*`), MDA shell (`/surfboard-mda/*`), admin panel (`/surfboard-restricted/*`)           |
| [`main-site.md`](./main-site.md) | The shared TwoNode corporate site and standalone tools (grid tools, redirect handler) that don't belong to one product |

See also [`../development-history/route-inventory.md`](../development-history/route-inventory.md) — the canonical, status-tracked route list, which also covers API routes.
