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

  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
    },
  },
};

export default nextConfig;
