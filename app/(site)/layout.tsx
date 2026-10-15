import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./v4.css";

// The Surfboard landing page fonts: Bricolage Grotesque for text, Sora for
// headings. Self-hosted so a build never depends on fetching Google Fonts.
const bricolage = localFont({
  src: [
    {
      path: "../../public/fonts/BricolageGrotesque-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/BricolageGrotesque-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/BricolageGrotesque-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/BricolageGrotesque-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/BricolageGrotesque-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-bricolage",
  display: "swap",
});
const sora = localFont({
  src: [
    {
      path: "../../public/fonts/self-hosted/sora-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/sora-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/sora-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/sora-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TwoNode Technologies - The Platform for Industry Based GIS Solutions",
  description:
    "TwoNode Technologies: Real-time asset tracking and monitoring for industry-based GIS solutions and electric grid visualization.",
  keywords:
    "twonode, twonode-technologies, GIS, innovative_GIS_solution, Industry, tech, technology, technologies, limited",
  publisher: "TwoNode Technologies",
  authors: [{ name: "TwoNode Technologies" }],
  creator: "TwoNode Technologies",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://twonode.tech"
  ),
  openGraph: {
    title:
      "TwoNode Technologies - The Platform for Industry Based GIS Solutions",
    description:
      "TwoNode Technologies: Real-time asset tracking and monitoring for industry-based GIS solutions and electric grid visualization.",
    url: "/",
    siteName: "TwoNode Technologies",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#000b3d" };

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
