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

// /v4 is a faithful port of the static prototype (out/twonode-website). It is
// a draft: kept out of search until the content is reviewed (TASK-0008).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#000b3d" };

export default function V4Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
