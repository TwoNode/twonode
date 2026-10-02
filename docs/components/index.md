# Components

Every component in the app — both dedicated `components/` libraries and
files colocated with pages — one file per platform plus a shared file for
components used across two or more products.

| File                             | Covers                                                                                                                                                                   |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`gbc.md`](./gbc.md)             | `gbc/components/` and components colocated under `app/(projects)/(GBC)/`                                                                                                 |
| [`reva.md`](./reva.md)           | `reva/components/` and components colocated under `app/(projects)/(reva)/`                                                                                               |
| [`surfboard.md`](./surfboard.md) | Components colocated under `app/(projects)/(surfboard)/` (Surfboard has no dedicated `components/` folder — everything lives with its page)                              |
| [`shared.md`](./shared.md)       | Top-level `components/` (shadcn/ui primitives, the shared dashboard/sidebar/admin-panel/auth systems), `providers/`, and the corporate-site sections under `app/(main)/` |

See also [`../functions/index.md`](../functions/index.md) for the non-component logic files (services, utils, hooks) that sit alongside these.
