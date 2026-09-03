import { Metadata } from "next";
import { FC } from "react";
import RevaLandingPage from "./RevaLandingPage";

export const metadata: Metadata = {
  title: "REVA - Real Estate Due Diligence",
  description:
    "Real Estate Due Diligence Just Got Intelligent! Request detailed land reports with ease.",
  keywords: "REVA, real estate, due diligence, land reports, property insights",
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
    title: "REVA - Real Estate Due Diligence",
    description:
      "Simplify real estate due diligence with REVA. Request detailed land reports effortlessly.",
    url: "https://twonode.com/reva",
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
    title: "REVA - Real Estate Due Diligence",
    description:
      "Simplify real estate due diligence with REVA. Request detailed land reports effortlessly.",
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
    canonical: "https://twonode.com/reva",
    languages: {
      en: "https://twonode.com/reva",
    },
  },
};

const RevaPage: FC = () => {
  return (
    <>
      <RevaLandingPage />
      {/* https://reva-store.s3.eu-north-1.amazonaws.com/revaLogo.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAXQIQAHEOTML4VXQ5%2F20250406%2Feu-north-1%2Fs3%2Faws4_request&X-Amz-Date=20250406T161909Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEND%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCmV1LW5vcnRoLTEiRzBFAiAJclOn%2BcWnAyQtoDQ2s89762I9n8%2BNfxHo2oaW9ilQAQIhAPqjSKXqDRiDXA0OdCphk286llE4ftf5o59n6f3PQLgDKugCCEkQABoMNTE1OTY2NTE1NDg1IgwOtaevANNIABMSlwMqxQJ3t20V2gC9qsgH1mQWgy1a6H2evTmui%2FPHH0VVxnJWC2QwWwihuI5JbtH5KAdGQ1SD4YFPhhU3A5iJy5eZqRGdCmgOqdTGYKEZ7trXQjODzubuKQPQKJZkz6cup%2BrRDr%2B7DP38tM6t5Mh8naxfyMiJJRRyj9mA1bJHt7WDds9W%2BX6PVeq4b0NX%2F6jm5QJoOAnJ4il0FG9nRgYj60BvcL4fhvE68Z66gXUw44MtfIzXG6SDxNQic8mMilUuxT3rQWcfZpOVQhts0E6IRbL8sbQ83bFhdG9%2FdceNr2%2FV8Lcc9GHTFOHT1ZK1OtXFDiufR4ZWFZjI5RyX%2BJo%2BURfFf%2BHraPmDB4N5YSqBkIFoVaoj0mTaF6L7VfemT6sGgUn00MHh08jexU00nxHWknPAMt%2FZBksnjEudDRI3ROdSf0YfmUCioh9AMM7Myr8GOrMCgi9To9%2FXaTekagsdHpZqKCY1oMbSlVTBjQ1Cc2WcujJ3uIlet10fLDYxXdx%2FOa7MwdlBf0i5MP2Upc0XKL9eSOXdsymSKG7VKo4BlKWTFABFhqNl8lmi4651nbrDX%2By8XC8DYOPKiwHivmHLkUmGK2O6hM2cx6iVU2Oa%2FMdh5Y6LhXkM%2BcNIxlESvISxPtxbr0%2F3zd85XLP5aznKj8sQDCc0rp5GLPhnUqOrmGtGJeMsH%2FKYvRo6vqaKk%2FVfCkPbGJjEAjv0%2BXJJrksBQNb4Y3%2BsSgqa29aZ6mwwtQATxgvlBp93iTpz%2FDll88B5n7x6%2F2I2f7Fv1jF42DjZYPa29J9eiZ%2BEkm15n7bFgbXRmmTwGyotCCAXDVg27Buy4ntyYxwErXbmRLAfwAwCOpDjSu%2FxoQ%3D%3D&X-Amz-Signature=e6204eece7f4b09319910e1f0fac6e8bb184cc4984e32ee9aa3daa2988aaaf3b&X-Amz-SignedHeaders=host&response-content-disposition=inline */}
    </>
  );
};

export default RevaPage;
