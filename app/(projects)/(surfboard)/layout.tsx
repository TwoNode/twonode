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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
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
