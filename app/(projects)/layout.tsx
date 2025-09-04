import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "../globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { KindeAuthProvider } from "@/providers/KindeAuthProvider";
import ToasterComponent from "@/components/ToasterComponent";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "TwoNode Technologies - The Platform for Industry Based GIS Solutions",
  description:
    "TwoNode Technologies: Real-time asset tracking and monitoring for industry-based GIS solutions and electric grid visualization.",
  keywords:
    "twonode, twonode-technologies, GIS, innovative_GIS_solution, Industry, tech, technology, technologies, limited",
  publisher: "TwoNode Technologies",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.twonodetechnologies.com"
  ),
  openGraph: {
    type: "article",
    url: "/",
    title:
      "TwoNode Technologies - The Platform for Industry Based GIS Solutions",
    description:
      "TwoNode Technologies: Real-time asset tracking and monitoring for industry-based GIS solutions and electric grid visualization.",
    images: [
      {
        url: "/favicon.jpg",
        width: 800,
        height: 600,
        alt: "TwoNode Technologies",
      },
    ],
    siteName: "TwoNode Technologies",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@TwoNodeTechnologies",
    title:
      "TwoNode Technologies - The Platform for Industry Based GIS Solutions",
    description:
      "TwoNode Technologies: Real-time asset tracking and monitoring for industry-based GIS solutions and electric grid visualization.",
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
    <html lang="en" className={`${bricolage.variable}`}>
      <body className={`${bricolage.variable} ${bricolage.className}`}>
        <>
          <KindeAuthProvider>
            <ToasterComponent />
            {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS && (
              <GoogleAnalytics
                gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS}
              />
            )}
            <main className="relative">{children}</main>
          </KindeAuthProvider>
        </>
      </body>
    </html>
  );
}
