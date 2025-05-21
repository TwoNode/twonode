import { Metadata, Viewport } from "next";
import { FC } from "react";
import ViewDetails from "./viewDetails";
import { getRequestByReference } from "../../actions/adminDbActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import { authGetTransactionData } from "@/app/(projects)/reva/actions/dbActions";
import AdminSingleRequestPage from "./SingleRequestPage";

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

const ViewDetailsPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const reference = searchParams?.reference;

  if (!reference) {
    console.error("Missing reference in URL.");
    return <InvalidReferencePage />; // Render a 404 page if the reference is missing
  }

  try {
    const request = await getRequestByReference(reference);
    const result = await authGetTransactionData(reference);

    if (request.success) {
      console.log("Request Data:", result);
      const transformedProperty = {
        ...result.data,
        report: result?.data?.report ?? undefined, // Ensure compatibility with expected type
        address: result?.data?.address ?? "Unknown Address", // Provide a default value for address
        lga: result?.data?.lga ?? "Unknown LGA", // Provide a default value for lga
      };

      return (
        <>
          <AdminSingleRequestPage property={transformedProperty} />;
          {/* <ViewDetails formData={request?.data} />; */}
        </>
      );
    } else {
      return <InvalidReferencePage />;
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return <InvalidReferencePage />;
  }
};

export default ViewDetailsPage;
