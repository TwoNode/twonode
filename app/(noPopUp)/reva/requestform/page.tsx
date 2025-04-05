import { Metadata, Viewport } from "next";
import { FC } from "react";
import { RevaHeroSection } from "../RevaHeroSection";
import { RevaFooterSection } from "../RevaFooterSection";

import RevaDueDiligenceForm from "./RevaDueDiligenceForm";

// import dynamic from "next/dynamic";
// const RevaDueDiligenceForm = dynamic(() => import("./RevaDueDiligenceForm"), {
//   ssr: false,
// });

// Define the viewport settings for the page
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  height: "device-height",
};

export const metadata: Metadata = {
  title: "Form: Due Diligence Request - REVA",
  description:
    "Request a structured land report with ease in just a few clicks.",
  keywords: "REVA, due diligence, land report, real estate, request form",
  authors: [
    {
      name: "TwoNode Technologies",
      url: "https://twonode.com",
    },
  ],
  creator: "TwoNode Technologies",
  applicationName: "REVA - Real Estate Due Diligence",
  robots: "index, follow",
  generator: "Next.js",
  publisher: "TwoNode Technologies",
  openGraph: {
    title: "Form: Due Diligence Request - REVA",
    description:
      "Request a structured land report with ease in just a few clicks.",
    url: "https://twonode.com/reva/requestform",
    siteName: "TwoNode Technologies",
    images: [
      {
        url: "https://twonode.com/images/reva.png",
        width: 800,
        height: 600,
        alt: "REVA - Real Estate Due Diligence",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Form: Due Diligence Request - REVA",
    description:
      "Request a structured land report with ease in just a few clicks.",
    images: ["https://twonode.com/images/reva.png"],
    site: "@TwoNodeTechnologies",
    creator: "@TwoNodeTechnologies",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    google: "google-site-verification=your-google-verification-code",
  },
  metadataBase: new URL("https://twonode.com"),
  alternates: {
    canonical: "https://twonode.com/reva/requestform",
    languages: {
      en: "https://twonode.com/reva/requestform",
    },
  },
};

const RevaFormPage: FC = () => {
  return (
    <div>
      <RevaHeroSection showRequestButton={false} smallLogo showTitle={false} />
      <RevaDueDiligenceForm />
      <RevaFooterSection />
    </div>
  );
};

export default RevaFormPage;
