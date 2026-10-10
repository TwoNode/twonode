import type { Metadata } from "next";
import { Fraunces, Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
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
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
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
