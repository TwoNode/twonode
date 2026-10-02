# Functions

Every non-component logic file in the app — services, utils, access maps,
hooks, layouts, and PDF workers — one file per platform plus a shared file
for logic used across two or more products.

| File                             | Covers                                                                                                                                                                                                             |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`gbc.md`](./gbc.md)             | `gbc/services`, `gbc/utils`, `gbc/access`, `gbc/pdf-worker`, `gbc/types`, `gbc/apiClient.ts`, `gbc/colors.ts`                                                                                                      |
| [`reva.md`](./reva.md)           | `reva/services`, `reva/utils`, `reva/access`, `reva/hooks`, `reva/layouts`, `reva/apiClient.ts`, `reva/colors.ts`                                                                                                  |
| [`surfboard.md`](./surfboard.md) | `surfboard/services`, `surfboard/utils`, `surfboard/access`, `surfboard/hooks`, `surfboard/layouts`, `surfboard/pdf-worker`, plus the shared `utils`/`hooks`/`types` colocated under `app/(projects)/(surfboard)/` |
| [`shared.md`](./shared.md)       | Top-level `hooks/`, `lib/api`, `lib/auth`, other `lib/`, `utils/`, and `types/`                                                                                                                                    |

See also [`../components/index.md`](../components/index.md) for the components these files back.
