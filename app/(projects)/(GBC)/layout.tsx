import type { Metadata } from "next/";

export const metadata: Metadata = {
  title: "GBC 2.0 By TwoNode Technologies - Geospatial Builders Conference",
  description: "GBC 2.0: The Premier Geospatial Builders Conference.",
  keywords:
    "gbc, GBC By TwoNode Technologies, Geospatial Builders Conference, twonode, twonode-technologies, conference, tech, technology, technologies, limited",
  publisher: "GBC By TwoNode Technologies",
  metadataBase: new URL("https://www.twonodetechnologies.com/gbc"),
  openGraph: {
    type: "article",
    url: "/",
    title: "GBC 2.0 - Geospatial Builders Conference",
    description: "GBC 2.0: The Premier Geospatial Builders Conference.",
    images: [
      {
        url: "/favicon.jpg",
        width: 800,
        height: 600,
        alt: "GBC By TwoNode Technologies",
      },
    ],
    siteName: "GBC By TwoNode Technologies",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@GBCByTwoNodeTechnologies",
    title: "GBC 2.0 - Geospatial Builders Conference",
    description: "GBC 2.0: The Premier Geospatial Builders Conference.",
    images: ["/favicon.jpg"],
  },
  icons: {
    icon: [
      { url: "/gbc2/favicon/favicon.ico", sizes: "any" },
      { url: "/gbc2/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/gbc2/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/gbc2/favicon/favicon.ico",
    apple: "/gbc2/favicon/apple-touch-icon.png",
  },
};

export default function GBCLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative" data-product="gbc">
      {children}
    </div>
  );
}
