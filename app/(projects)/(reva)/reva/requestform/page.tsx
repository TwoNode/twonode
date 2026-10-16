import { Metadata, Viewport } from "next";
import { FC } from "react";
import RevaHeroSection from "../RevaHeroSection";
import RevaFooterSection from "../RevaFooterSection";

import RevaDueDiligenceForm from "./RevaDueDiligenceForm";

// Force dynamic rendering to avoid export errors
export const dynamic = "force-dynamic";

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

import Image from "next/image";
import Link from "next/link";
import { Home, Search, ShieldCheck } from "lucide-react";
import { RevaThemeToggle } from "../components/RevaThemeToggle";

const RevaFormPage: FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020b18] text-slate-800 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white flex flex-col justify-between transition-colors duration-300">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-225 h-125 bg-cyan-500/5 dark:bg-cyan-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-10 w-125 h-125 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Modern Top Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/90 dark:bg-[#020b18]/90 border-b border-slate-200 dark:border-cyan-500/15 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link
            href="/reva"
            className="flex items-center gap-3 group shrink-0 min-w-0"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 bg-linear-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-md shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-1">
                <Image
                  src="/reva/revaLogo.png"
                  alt="REVA Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                  REVA
                </span>
                <span className="hidden sm:inline-flex text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30 whitespace-nowrap">
                  Due Diligence
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                by TwoNode Technologies
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/reva/onetimerequest"
              className="text-xs sm:text-sm font-medium text-slate-700 dark:text-cyan-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-cyan-500/30 hover:border-slate-300 dark:hover:border-cyan-400/60 bg-white/80 dark:bg-cyan-950/30 hover:bg-slate-100 dark:hover:bg-cyan-900/40 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Track Request</span>
              <span className="sm:hidden">Track</span>
            </Link>
            <Link
              href="/reva"
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">REVA Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <RevaThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Interactive Workspace Form */}
      <main className="relative z-10 flex-1">
        <RevaDueDiligenceForm />
      </main>

      {/* Modern Executive Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-[#010813] py-8 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 REVA by TwoNode Technologies Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-4 sm:gap-6 text-slate-500 dark:text-slate-400">
            <Link
              href="/"
              className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors font-medium"
            >
              TwoNode Corporate Home
            </Link>
            <span>•</span>
            <Link
              href="/reva"
              className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
            >
              REVA Overview
            </Link>
            <span>•</span>
            <Link
              href="/reva/onetimerequest"
              className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
            >
              Track Request
            </Link>
            <span>•</span>
            <Link
              href="/contact"
              className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RevaFormPage;
