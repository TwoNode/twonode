import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../globals.css";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";

const bricolage = localFont({
  src: [
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
      path: "../../public/fonts/BricolageGrotesque-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/BricolageGrotesque-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/BricolageGrotesque-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
  ],
  variable: "--font-bricolage",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable}`}>
      <body className={`${bricolage.variable} ${bricolage.className}`}>
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS} />
        )}
        <div className="h-[70px] w-full bg-slate-900">
          <div className="fixed top-0 right-0 left-0 z-[30] w-full h-[65px] px-2.5 py-4 bg-sky-950 justify-center items-center gap-1 flex-col flex">
            <div className="text-center">
              <span className="text-white text-[10px] lg:text-[13px] font-normal leading-[8px] lg:leading-[20px]">
                Reach out on: Call - (+234) 706-9227-677 || Email:
                info@twonodetechnologies.com{" "}
              </span>
              <Link
                href={"/contact"}
                className="text-white text-[8px] lg:text-[12px] font-semibold underline leading-[8px] lg:leading-[20px] whitespace-nowrap"
              >
                Contact Us
              </Link>
            </div>
            <p className="text-white text-[8px] lg:text-[12px] font-normal leading-[8px] lg:leading-[30px]">
              RC NO.: 7742902
            </p>
          </div>
        </div>
        <main className="relative">
          {/* <MyPopup /> */}
          {children}
        </main>
      </body>
    </html>
  );
}
