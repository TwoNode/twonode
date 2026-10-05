#!/usr/bin/env node
/**
 * Regenerates the API-route and page tables in
 * docs/development-history/route-inventory.md from the filesystem, so the
 * inventory can't silently drift from the code the way a hand-edited table
 * does.
 *
 *   npm run docs:routes           # rewrite the generated blocks in place
 *   npm run docs:routes -- --check # exit 1 if the file is out of date (CI-friendly)
 *
 * Only the text between the `<!-- BEGIN GENERATED ... -->` /
 * `<!-- END GENERATED ... -->` markers is touched; everything else in the
 * document is hand-written and left alone.
 *
 * Auth is read statically from each route file: the `roles: [...]` array of
 * the `withAuth(...)` wrapper, `allowUnverified`, and a few well-known
 * non-session guards (Paystack signature, cron secret). It is a best-effort
 * reading of source — when a route does something unusual the Auth cell says
 * "see source" rather than guessing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const APP = path.join(ROOT, "app");
const DOC = path.join(ROOT, "docs/development-history/route-inventory.md");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** `app/(projects)/(reva)/reva/(auth)/login/page.tsx` -> `/reva/login` (route groups dropped). */
function urlFor(file) {
  const rel = path.relative(APP, path.dirname(file)).split(path.sep);
  const segs = rel.filter((s) => !/^\(.*\)$/.test(s));
  return "/" + segs.join("/");
}

function productOf(url) {
  if (url.startsWith("/api/v1/surfboard")) return "Surfboard";
  if (url.startsWith("/api/v1/reva")) return "REVA";
  if (url.startsWith("/api/v1/gbc")) return "GBC";
  if (url.startsWith("/api/v1/auth")) return "Auth (shared)";
  if (url.startsWith("/api/v1/")) return "Shared";
  if (url.startsWith("/api/auth")) return "Kinde callbacks (legacy)";
  if (url.startsWith("/api/webhooks") || url.startsWith("/api/reva/webhooks"))
    return "Webhooks";
  if (url.startsWith("/api/cron")) return "Cron";
  return "Other / legacy";
}

function analyseRoute(file, url) {
  const src = fs.readFileSync(file, "utf8");
  // Find every exported method handler and the slice of source it owns.
  const exports = [];
  const re =
    /export\s+(?:async\s+function\s+|const\s+)(GET|POST|PUT|PATCH|DELETE)\b/g;
  let m;
  while ((m = re.exec(src))) exports.push({ method: m[1], index: m.index });
  exports.sort((a, b) => a.index - b.index);

  const perMethod = exports.map((e, i) => {
    const slice = src.slice(e.index, exports[i + 1]?.index ?? src.length);
    return { method: e.method, auth: authFor(slice, src, url) };
  });
  return perMethod;
}

/**
 * Routes whose public-ness is a deliberate product decision rather than an
 * omission. Keeping the reason in the table stops a reader from mistaking
 * "no session check" for "forgot a guard".
 */
const PUBLIC_REASONS = [
  [
    /^\/api\/v1\/auth\/(login|register|refresh|request-password-reset|reset-password|resend-verification|accept-invite)/,
    null,
  ],
  [/^\/api\/v1\/auth\/invitations$/, "public — single-use invitation token"],
  [
    /^\/api\/v1\/surfboard\/plans\/\[planId\]\/public/,
    "public — QR-gated (`?token=`)",
  ],
  [
    /^\/api\/v1\/surfboard\/qr\/(access-state|payments)/,
    "public — anonymous QR-service payer",
  ],
  [
    /^\/api\/v1\/surfboard\/settings\/(cod-submission|coordinate-shifts)$/,
    "public (read-only config)",
  ],
  [
    /^\/api\/v1\/reva\/(one-time-properties|payments\/one-time)/,
    "public — guest one-time-request flow",
  ],
  [/^\/api\/v1\/gbc\/(?!admin)/, "public — ticket buyer / site visitor"],
  [/^\/api\/auth\/success\//, "Kinde OAuth callback (state/cookie from Kinde)"],
  [/^\/api\/auth\//, "public (Kinde/redirect helper)"],
  [/^\/api\/webhooks\/redcopy$/, "external Red Copy callback (see source)"],
];

function authFor(slice, whole, url = "") {
  // Factory-built guards (lib/api/adminInvitationRoutes.ts, auditLogRoutes).
  const factory =
    whole.match(/adminInvitationRoutes\(\s*Platform\.\w+\s*,\s*\w+\.(\w+)/) ||
    whole.match(/auditLogRoutes<[^>]*>\(\s*Platform\.\w+\s*,\s*\w+\.(\w+)/);
  if (factory) return factory[1];
  if (/getEncryptedUserData|getNativeSessionAsLegacyUserData/.test(slice))
    return "own session cookie (404 if none)";
  const usesWithAuth = /withAuth\s*[<(]/.test(slice);
  if (usesWithAuth) {
    const rolesBlock = slice.match(/roles\s*:\s*\[([^\]]*)\]/);
    const roles = rolesBlock
      ? [...rolesBlock[1].matchAll(/\.([A-Z_]+)/g)].map((r) => r[1])
      : [];
    const unverified = /allowUnverified\s*:\s*true/.test(slice)
      ? " (unverified OK)"
      : "";
    return (roles.length ? roles.join(", ") : "any signed-in") + unverified;
  }
  if (/x-paystack-signature/.test(whole)) return "Paystack signature";
  if (/CRON_SECRET|authorization.*cron/i.test(whole)) return "cron secret";
  if (/getServerSession|requireSession/.test(slice))
    return "session (see source)";
  if (/validateCSRF/.test(slice)) return "public (CSRF-checked)";
  for (const [re, reason] of PUBLIC_REASONS)
    if (re.test(url)) return reason ?? "public";
  return "public";
}

function collectApi() {
  const rows = [];
  for (const file of walk(APP)) {
    if (path.basename(file) !== "route.ts") continue;
    const url = urlFor(file);
    const handlers = analyseRoute(file, url);
    if (!handlers.length) continue;
    const groups = new Map();
    for (const h of handlers) {
      if (groups.get(h.auth)?.includes(h.method)) continue;
      if (!groups.has(h.auth)) groups.set(h.auth, []);
      groups.get(h.auth).push(h.method);
    }
    rows.push({
      url,
      product: productOf(url),
      methods: [...new Set(handlers.map((h) => h.method))].sort(
        (a, b) => METHODS.indexOf(a) - METHODS.indexOf(b)
      ),
      auth:
        groups.size === 1
          ? [...groups.keys()][0]
          : [...groups.entries()]
              .map(([a, ms]) => `${ms.join("/")}: ${a}`)
              .join("; "),
    });
  }
  return rows.sort((a, b) => a.url.localeCompare(b.url));
}

function collectPages() {
  const rows = [];
  for (const file of walk(APP)) {
    if (path.basename(file) !== "page.tsx") continue;
    const url = urlFor(file) || "/";
    let product = "Marketing / shared";
    if (url.startsWith("/surfboard")) product = "Surfboard";
    else if (url.startsWith("/reva")) product = "REVA";
    else if (url.startsWith("/gbc")) product = "GBC";
    else if (url.startsWith("/v2")) product = "TwoNode /v2 site";
    rows.push({ url: url === "" ? "/" : url, product });
  }
  return rows.sort((a, b) => a.url.localeCompare(b.url));
}

const esc = (s) => s.replace(/\|/g, "\\|");

function renderApi(rows) {
  const order = [
    "Auth (shared)",
    "Surfboard",
    "REVA",
    "GBC",
    "Shared",
    "Webhooks",
    "Cron",
    "Kinde callbacks (legacy)",
    "Other / legacy",
  ];
  const out = [];
  for (const product of order) {
    const mine = rows.filter((r) => r.product === product);
    if (!mine.length) continue;
    out.push(`#### ${product} (${mine.length})`, "");
    out.push("| Route | Method(s) | Auth |", "| :-- | :-- | :-- |");
    for (const r of mine)
      out.push(`| \`${r.url}\` | ${r.methods.join(", ")} | ${esc(r.auth)} |`);
    out.push("");
  }
  return out.join("\n");
}

function renderPages(rows) {
  const order = [
    "Marketing / shared",
    "TwoNode /v2 site",
    "Surfboard",
    "REVA",
    "GBC",
  ];
  const out = [];
  for (const product of order) {
    const mine = rows.filter((r) => r.product === product);
    if (!mine.length) continue;
    out.push(`#### ${product} (${mine.length})`, "");
    out.push(mine.map((r) => `\`${r.url}\``).join(" · "), "");
  }
  return out.join("\n");
}

function splice(doc, name, body) {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const a = doc.indexOf(begin);
  const b = doc.indexOf(end);
  if (a === -1 || b === -1)
    throw new Error(`Markers for "${name}" not found in ${DOC}`);
  return (
    doc.slice(0, a + begin.length) +
    "\n\n" +
    body.trim() +
    "\n\n" +
    doc.slice(b)
  );
}

/** The repo is prettier-formatted (`npm run format:check`); format the generated doc the same way so `--check` and prettier agree. */
async function prettify(text) {
  const prettier = await import("prettier");
  const config = (await prettier.resolveConfig(DOC)) ?? {};
  return prettier.format(text, { ...config, filepath: DOC });
}

const apiRows = collectApi();
const pageRows = collectPages();
let doc = fs.readFileSync(DOC, "utf8");
const next = await prettify(
  splice(
    splice(doc, "api-routes", renderApi(apiRows)),
    "pages",
    renderPages(pageRows)
  )
);

if (process.argv.includes("--check")) {
  if (next !== doc) {
    console.error(
      "route-inventory.md is out of date — run `npm run docs:routes` and commit the result."
    );
    process.exit(1);
  }
  console.log("route-inventory.md is up to date.");
} else {
  fs.writeFileSync(DOC, next);
  console.log(
    `route-inventory.md updated: ${apiRows.length} API routes, ${pageRows.length} pages.`
  );
}
