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
    ];
  },

  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],

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
      { source: "/surf-restricted", destination: "/surfboard-restricted", permanent: true },
      { source: "/surf-restricted/:path*", destination: "/surfboard-restricted/:path*", permanent: true },
      { source: "/surf-mda", destination: "/surfboard-mda", permanent: true },
      { source: "/surf-mda/:path*", destination: "/surfboard-mda/:path*", permanent: true },
      // REVA naming standardization (Phase 3): viewdetails -> details, across
      // all three route trees (authenticated user, authenticated admin, and
      // the top-level guest page) — same reasoning as Surfboard's rename
      // above, keeps existing bookmarks/emailed notification links working.
      // None of these three routes have nested sub-paths of their own
      // (query strings only), so no :path* wildcard is needed.
      { source: "/reva/dashboard/viewdetails", destination: "/reva/dashboard/details", permanent: true },
      { source: "/reva-restricted/dashboard/viewdetails", destination: "/reva-restricted/dashboard/details", permanent: true },
      { source: "/reva/viewdetails", destination: "/reva/details", permanent: true },
      // GBC naming standardization (Phase 4, step 14): gbc/restricted ->
      // gbc-restricted, flattened to match reva-restricted/surfboard-restricted's
      // convention. Simpler than Surfboard's/REVA's rename — the Kinde OAuth
      // callback (/api/auth/success/gbc-restricted) was already hyphenated
      // ahead of the page routes catching up, so no callback exclusion is
      // needed here.
      { source: "/gbc/restricted", destination: "/gbc-restricted", permanent: true },
      { source: "/gbc/restricted/:path*", destination: "/gbc-restricted/:path*", permanent: true },
      { source: "/gbc/restricted-login", destination: "/gbc-restricted/login", permanent: true },
    ];
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
