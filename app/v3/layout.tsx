import type { Metadata, Viewport } from "next";
import "./v3.css";

// /v3 is a faithful port of the static prototype (out/twonode-website). It is
// a draft: kept out of search until the content is reviewed (TASK-0008).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#000b3d" };

export default function V3Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
