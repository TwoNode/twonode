/**
 * The second address, https://twonodetechnologies.tech (docs/DEPLOYMENT.md "Domains"; issues
 * I-060 and I-061). Every rule below that mentions TECH_HOST matches that host only, so
 * www.twonodetechnologies.com, the staging host and the preview URLs never match them and
 * behave exactly as before.
 */
const TECH_HOST = { type: "host", value: "twonodetechnologies.tech" };
const MAIN_ORIGIN = "https://www.twonodetechnologies.com";

/**
 * Where a sign-in starts. Kinde's return address is fixed (KINDE_SITE_URL) to the main domain
 * and a sign-in's state cookies belong to the host it started on, so a Kinde sign-in begun on
 * .tech cannot finish. `/api/auth/login` and `/api/auth/register` are what every Kinde
 * LoginLink/RegisterLink points at (Surfboard, GBC restricted, MDA and REVA login pages); the
 * two REVA login pages are sent over as well. The rest of /api/auth is NOT redirected: the
 * pages call /api/auth/logout_redirect with fetch, which must stay on the host they are on.
 */
const TECH_SIGN_IN_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/reva/login",
  "/reva-restricted/login",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*", // Apply to all routes
        headers: [
          {
            key: "X-Robots-Tag",
            value: "index, follow", // Customize the value as needed
          },
        ],
      },
      // I-061: .tech serves the same pages as the main site, so only the main address is
      // indexed. Next applies the LAST matching rule for a header key, so this must stay
      // after the rule above.
      {
        source: "/:path*",
        has: [TECH_HOST],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },

  serverExternalPackages: ["pdfjs-dist", "pdf-parse", "@napi-rs/canvas"],

  /**
   * Surfboard naming standardization (proposal §4.8, Phase 2): the page
   * routes moved from surf-restricted/surf-mda to
   * surfboard-restricted/surfboard-mda. These keep any existing bookmarks,
   * emailed notification links, or search-indexed URLs working. The Kinde
   * OAuth callback routes (/api/auth/success/surf-restricted, /surf-mda)
   * are NOT renamed or redirected here — those are registered redirect URIs
   * in Kinde's own dashboard and are unaffected by this page-route rename.
   */
  async redirects() {
    return [
      {
        source: "/surf-restricted",
        destination: "/surfboard-restricted",
        permanent: true,
      },
      {
        source: "/surf-restricted/:path*",
        destination: "/surfboard-restricted/:path*",
        permanent: true,
      },
      { source: "/surf-mda", destination: "/surfboard-mda", permanent: true },
      {
        source: "/surf-mda/:path*",
        destination: "/surfboard-mda/:path*",
        permanent: true,
      },
      // REVA naming standardization (Phase 3): viewdetails -> details, across
      // all three route trees (authenticated user, authenticated admin, and
      // the top-level guest page) — same reasoning as Surfboard's rename
      // above, keeps existing bookmarks/emailed notification links working.
      // None of these three routes have nested sub-paths of their own
      // (query strings only), so no :path* wildcard is needed.
      {
        source: "/reva/dashboard/viewdetails",
        destination: "/reva/dashboard/details",
        permanent: true,
      },
      {
        source: "/reva-restricted/dashboard/viewdetails",
        destination: "/reva-restricted/dashboard/details",
        permanent: true,
      },
      {
        source: "/reva/viewdetails",
        destination: "/reva/details",
        permanent: true,
      },
      // GBC naming standardization (Phase 4, step 14): gbc/restricted ->
      // gbc-restricted, flattened to match reva-restricted/surfboard-restricted's
      // convention. Simpler than Surfboard's/REVA's rename — the Kinde OAuth
      // callback (/api/auth/success/gbc-restricted) was already hyphenated
      // ahead of the page routes catching up, so no callback exclusion is
      // needed here.
      {
        source: "/gbc/restricted",
        destination: "/gbc-restricted",
        permanent: true,
      },
      {
        source: "/gbc/restricted/:path*",
        destination: "/gbc-restricted/:path*",
        permanent: true,
      },
      {
        source: "/gbc/restricted-login",
        destination: "/gbc-restricted/login",
        permanent: true,
      },
      // I-060: a sign-in begun on the .tech address finishes on the main domain (the query
      // string, such as post_login_redirect_url, is passed through). Temporary (307) so a
      // browser never caches it.
      ...TECH_SIGN_IN_PATHS.map((source) => ({
        source,
        has: [TECH_HOST],
        destination: `${MAIN_ORIGIN}${source}`,
        permanent: false,
      })),
    ];
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
      bodySizeLimit: "10mb",
    },
    // Turbopack emits server-chunk .map files regardless of
    // productionBrowserSourceMaps (that flag only covers the browser
    // bundle). On this app they added ~1,800 files / ~120MB to the
    // deploy output — over half its total size — which is the likely
    // cause of Vercel's "Deploying outputs" step failing once the build
    // actually completes.
    turbopackSourceMaps: false,
  },

  /**
   * gbc/services/certificatePdfService.ts and receiptPdfService.ts render
   * PDFs in a standalone `node` child process (execFile'd against
   * gbc/pdf-worker/*.render.cjs) instead of in-process, to dodge a
   * Turbopack/React-version conflict with @react-pdf/renderer — see that
   * worker file's own comment. The tradeoff: those .cjs files are
   * deliberately never statically imported by any app code, so Next's
   * serverless file-tracing (which only follows import/require chains) has
   * no way to know the routes below depend on them, their runtime-loaded
   * assets (fonts, the certificate background/logo/signature images), or
   * @react-pdf/renderer's own package tree. Left out, `execFile` fails on
   * Vercel (works fine locally, where the whole repo is on disk) — this is
   * the suspected cause of "certificate email not sending" in production;
   * exact routes are named narrowly per Next's docs rather than a blanket
   * '/*' to avoid bloating every function's bundle.
   *
   * The `./node_modules/@react-pdf/**` glob is deliberately NOT included
   * here (bisected root cause of a separate, previously-unexplained
   * Vercel platform failure: "Deploying outputs" erroring with an opaque,
   * empty-message "Unexpected error", reproduced consistently in isolation
   * down to this exact glob alone). It's also unnecessary: in this
   * pnpm-managed repo, node_modules/@react-pdf/* are symlinks into the
   * .pnpm store, and this glob only matches the symlinks themselves, never
   * their real targets — so it was never actually shipping the package
   * correctly in the first place. @react-pdf/renderer is instead traced
   * via a real (never-awaited-for-value, just for its side effect on the
   * tracer) `import("@react-pdf/renderer")` placed directly in each
   * *Service.ts file that owns a pdf-worker (certificatePdfService.ts,
   * both receiptPdfService.ts files) — @vercel/nft follows a literal
   * dynamic-import specifier and correctly resolves the full transitive
   * tree through the pnpm symlinks on its own. (An earlier version of
   * this comment claimed that hint already existed in utils/email.ts and
   * was verified working — it did not actually exist in the code, which
   * is why certificate emails kept failing in production; re-verify with
   * a real build + each route's .next/*.nft.json after touching any of
   * this.) The globs below stay because they cover genuinely untraceable
   * assets: the pdf-worker/*.cjs files (execFile'd, never imported) and
   * runtime-loaded public/ images/fonts.
   */
  outputFileTracingIncludes: {
    // The watermark font of the protected pages for plans shared with someone
    // (TASK-0015): read from disk at run time, so it is named here. One file,
    // no node_modules glob (that kind of glob broke a deploy once, DEPLOYMENT.md).
    "/api/v1/surfboard/plans/\\[planId\\]/files/\\[n\\]/pages": [
      "./public/fonts/BricolageGrotesque-Bold.ttf",
    ],
    "/api/v1/surfboard/plans/\\[planId\\]/files/\\[n\\]/pages/\\[p\\]": [
      "./public/fonts/BricolageGrotesque-Bold.ttf",
    ],
    "/api/v1/gbc/admin/certificates/send": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
      "./public/gbc/gbcCertificateBg.jpeg",
      "./public/gbc2/gbc2LightLogo.png",
      "./public/signatures/**/*",
    ],
    "/api/v1/gbc/tickets/\\[ticketNumber\\]/certificate-pdf": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
      "./public/gbc/gbcCertificateBg.jpeg",
      "./public/gbc2/gbc2LightLogo.png",
      "./public/signatures/**/*",
    ],
    "/api/v1/gbc/tickets/\\[ticketNumber\\]/receipt-pdf": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
    ],
    "/api/v1/surfboard/cod/batches/\\[batchId\\]/receipt-pdf": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
    ],
    "/api/v1/gbc/tickets": ["./gbc/pdf-worker/**/*", "./public/fonts/**/*"],
    "/api/v1/gbc/tickets/pair": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
    ],
    "/api/v1/gbc/tickets/group": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
    ],
    "/api/v1/gbc/payments/verify": [
      "./gbc/pdf-worker/**/*",
      "./public/fonts/**/*",
    ],
  },
};

export default nextConfig;
