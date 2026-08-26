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
