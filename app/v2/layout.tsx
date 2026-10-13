import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NavV2 } from "./components/NavV2";
import { FooterV2 } from "./components/FooterV2";

/**
 * Typography Pairing for "18. Nodes":
 * - Sora: Brand headlines & display statements
 * - DM Sans: Clean, legible body copy & narrative lines
 * - JetBrains Mono: Technical metadata, status beacons & timestamps
 * - Fraunces: Editorial italics & accent quotes
 */
// Self-hosted (latin) so a build never depends on fetching from Google Fonts.
const fraunces = localFont({
  src: [
    {
      path: "../../public/fonts/self-hosted/fraunces-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/fraunces-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/fraunces-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/fraunces-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/self-hosted/fraunces-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/self-hosted/fraunces-latin-600-italic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const sora = localFont({
  src: [
    {
      path: "../../public/fonts/self-hosted/sora-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
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

const dmSans = localFont({
  src: [
    {
      path: "../../public/fonts/self-hosted/dm-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/dm-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/dm-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/dm-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: [
    {
      path: "../../public/fonts/self-hosted/jetbrains-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/jetbrains-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/jetbrains-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/self-hosted/jetbrains-mono-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TwoNode — We build for industries",
  description:
    "TwoNode enters industries, understands how they work, and builds the products, experiences and connections their ecosystems need.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com"
  ),
  openGraph: {
    title: "TwoNode — We build for industries",
    description:
      "TwoNode enters industries, understands how they work, and builds the products, experiences and connections their ecosystems need.",
    url: "/v2",
    siteName: "TwoNode",
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function V2Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${fraunces.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body
        data-site="v2"
        className="min-h-screen font-[family-name:var(--font-sans)] antialiased selection:bg-[#ff4d6d]/20 selection:text-[#ff4d6d]"
        style={{ background: "var(--v2-bg)", color: "var(--v2-fg)" }}
      >
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS} />
        )}
        <NavV2 />
        <main>{children}</main>
        <FooterV2 />
      </body>
    </html>
  );
}
