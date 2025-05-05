import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "../globals.css";
import Link from "next/link";
import Head from "next/head";
import { GoogleAnalytics } from "@next/third-parties/google";
import { MyPopup } from "@/components/MyPopup";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

// inter.className
export const metadata: Metadata = {
  title: "TwoNode Technologies - The Platform for Industry Based GIS Solutions",
  description:
    "TwoNode Technologies: Real-time asset tracking and monitoring for industry-based GIS solutions and electric grid visualization.",
  keywords:
    "twonode, twonode-technologies, GIS, innovative_GIS_solution, Industry, tech, technology, technologies, limited",
  publisher: "TwoNode Technologies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // <!DOCTYPE html>
    <html lang="en" className={`${bricolage.variable}`}>
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* <!-- SEO Meta Tags --> */}
        <meta name="author" content="TwoNode Technologies" />
        <meta
          name="copyright"
          content="Copyright © 2025 TwoNode Technologies"
        />

        {/* ICONS */}
        {/* <!-- Favicon  --> */}
        {/* <link rel="icon" href="favicon.jpg" /> */}

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
        {/*  */}

        {/* <!-- OG Meta Tags to improve the way the post looks when you share the page on LinkedIn, Facebook, Google+ --> */}
        <meta property="og:site_name" content="TwoNode Technologies" />
        {/* <!-- website name --> */}
        <meta
          property="og:site"
          content="https://www.twonodetechnologies.com"
        />
        {/* <!-- website link --> */}
        <meta
          property="og:title"
          content="TwoNode Technologies - The Platform for Industry Based GIS Solutions"
        />
        {/* <!-- title shown in the actual shared post --> */}
        <meta
          property="og:description"
          content="TwoNode Technologies - The Platform for Industry Based GIS Solutions"
        />
        {/* <!-- description shown in the actual shared post --> */}
        <meta
          property="og:image"
          content="https://www.twonodetechnologies.com/favicon.jpg."
        />
        {/* <!-- image link, make sure it's jpg --> */}
        <meta property="og:url" content="https://www.twonodetechnologies.com" />
        {/* <!-- where do you want your post to link to --> */}
        <meta property="og:type" content="article" />

        {/* <!-- Twitter Card Meta Tags --> */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@TwoNodeTechnologies" />
        <meta
          name="twitter:title"
          content="TwoNode Technologies - The Platform for Industry Based GIS Solutions"
        />
        <meta
          name="twitter:description"
          content="TwoNode Technologies is an The Platform for Industry Based GIS Solutions"
        />
        <meta
          name="twitter:image"
          content="https://www.twonodetechnologies.com/images/favicon.png"
        />
        <meta name="robots" content="index, follow" />

        {/* <!-- Styles --> */}
        <link rel="canonical" href="https://www.twonodetechnologies.com" />

        <script type="application/ld+json">
          {`
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "TwoNode Technologies",
      "url": "https://www.twonodetechnologies.com",
      "logo": "https://www.twonodetechnologies.com/favicon.jpg",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+234-916-0002-740",
        "contactType": "Customer Service"
      },
      "sameAs": [
        "https://www.facebook.com/twonodetechnologies",
        "https://twitter.com/TwoNodeTechnologies",
        "https://www.linkedin.com/company/twonodetechnologies"
      ],
      "publisher": {
        "@type": "Organization",
        "name": "TwoNode Technologies",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.twonodetechnologies.com/favicon.jpg"
        }
      }
    }
    `}
        </script>
      </Head>

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
