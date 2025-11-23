import ToastProvider from "@/providers/ToastProvider";
import type { Metadata } from "next/";

export const metadata: Metadata = {
  title: "GBC 2025 By TwoNode Technologies - Global Business Conference",
  description: "GBC 2025: The Premier Global Business Conference.",
  keywords:
    "gbc, GBC By TwoNode Technologies, Global Business Conference, twonode, twonode-technologies, conference, tech, technology, technologies, limited",
  publisher: "GBC By TwoNode Technologies",
  metadataBase: new URL("https://www.twonodetechnologies.com/gbc2"),
  openGraph: {
    type: "article",
    url: "/",
    title: "GBC 2025 - Global Business Conference",
    description: "GBC 2025: The Premier Global Business Conference.",
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
    title: "GBC 2025 - Global Business Conference",
    description: "GBC 2025: The Premier Global Business Conference.",
    images: ["/favicon.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function GBCLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="relative">{children}</div>
    </ToastProvider>
  );
}
