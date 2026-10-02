import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Surfboard By TwoNode Technologies - Geospatial Intelligence for Survey Plans",
  description: "Surfboard: Geospatial Intelligence for Survey Plans.",
  keywords:
    "surfboard, Surfboard By TwoNode Technologies, Survey Plans, twonode, twonode-technologies, GIS, innovative_GIS_solution, Industry, tech, technology, technologies, limited",
  publisher: "Surfboard By TwoNode Technologies",
  metadataBase: new URL("https://www.twonodetechnologies.com/surfboard"),
  openGraph: {
    type: "article",
    url: "/",
    title: "Surfboard - Geospatial Intelligence for Survey Plans",
    description: "Surfboard: Geospatial Intelligence for Survey Plans.",
    images: [
      {
        url: "/favicon.jpg",
        width: 800,
        height: 600,
        alt: "Surfboard By TwoNode Technologies",
      },
    ],
    siteName: "Surfboard By TwoNode Technologies",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@SurfboardByTwoNodeTechnologies",
    title: "Surfboard - Geospatial Intelligence for Survey Plans",
    description: "Surfboard: Geospatial Intelligence for Survey Plans.",
    images: ["/favicon.jpg"],
  },
  icons: {
    icon: [
      { url: "/surfboard/favicon/favicon.ico", sizes: "any" },
      {
        url: "/surfboard/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/surfboard/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: "/surfboard/favicon/favicon.ico",
    apple: "/surfboard/favicon/apple-touch-icon.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative" data-product="surfboard">
      {children}
    </div>
  );
}
