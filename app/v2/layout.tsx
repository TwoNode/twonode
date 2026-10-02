import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "../globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NavV2 } from "./components/NavV2";
import { FooterV2 } from "./components/FooterV2";

/**
 * Editorial display serif for headlines — paired with the app-wide Bricolage
 * Grotesque (already declared as @font-face in app/globals.css, reused here
 * via its --font-bricolage var) for body copy. This is /v2's own top-level
 * root layout (own <html>/<body>) — the repo has no shared app/layout.tsx,
 * each top-level route group under app/ owns its root (see app/(projects)/layout.tsx,
 * app/(main)/layout.tsx for the same pattern).
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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
      className={`${fraunces.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body
        data-site="v2"
        className="min-h-screen font-[family-name:var(--font-bricolage)]"
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
