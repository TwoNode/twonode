/**
 * Split out from editionCookie.ts: that file also imports `next/headers`,
 * which is server-only. GBCEditionSwitcher.tsx is a Client Component that
 * only needs the cookie *name* (to write it via `document.cookie`) — if it
 * imported that name from editionCookie.ts directly, bundlers pull in the
 * whole module's import graph, including next/headers, into the client
 * bundle and the build fails ("You're importing a module that depends on
 * 'next/headers' ... in the Pages Router" — reproduced with a real
 * `next build`, not just a type-checker false positive). This file has no
 * server-only imports, so it's safe from both client and server code.
 */
export const GBC_EDITION_COOKIE = "gbc-admin-edition";
