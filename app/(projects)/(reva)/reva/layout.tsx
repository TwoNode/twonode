import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Reva by TwoNode - Advanced Geospatial Intelligence Platform",
    template: "%s | Reva by TwoNode",
  },
  description:
    "Reva is a cutting-edge geospatial intelligence platform by TwoNode Technologies, providing advanced survey plan analysis and mapping solutions for professionals.",
  keywords: [
    "reva",
    "geospatial intelligence",
    "survey plans",
    "GIS mapping",
    "land surveying",
    "geospatial analysis",
    "two node technologies",
    "cadastral mapping",
    "spatial data",
    "surveying software",
  ],
  authors: [{ name: "TwoNode Technologies" }],
  creator: "TwoNode Technologies",
  publisher: "TwoNode Technologies Limited",
  metadataBase: new URL("https://www.twonodetechnologies.com/reva"),
  openGraph: {
    type: "website",
    url: "https://www.twonodetechnologies.com/reva",
    title: "Reva - Advanced Geospatial Intelligence Platform",
    description:
      "Transform your survey plans with Reva's advanced geospatial intelligence solutions by TwoNode Technologies.",
    siteName: "Reva by TwoNode",
    locale: "en_US",
    images: [
      {
        url: "/reva/favicon.jpg",
        width: 1200,
        height: 630,
        alt: "Reva by TwoNode - Geospatial Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TwoNodeTech",
    creator: "@TwoNodeTech",
    title: "Reva - Advanced Geospatial Intelligence Platform",
    description:
      "Transform your survey plans with Reva's advanced geospatial intelligence solutions by TwoNode Technologies.",
    images: ["/reva/favicon.jpg"],
  },
  icons: {
    icon: [
      { url: "/reva/favicon/favicon.ico", sizes: "any" },
      {
        url: "/reva/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/reva/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: "/reva/favicon/favicon.ico",
    apple: "/reva/favicon/apple-touch-icon.png",
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
  alternates: {
    canonical: "https://www.twonodetechnologies.com/reva",
  },
};

export default function RevaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-product="reva">{children}</div>;
}
