"use client";
import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Import useRouter from next/router
import { useSearchParams } from "next/navigation";

const CertificateValidator = () => {
  const searchParams = useSearchParams();

  const router = useRouter(); // Initialize the router
  const [barcode, setBarcode] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false); // New loading state

  const getAttachment = async (barCode: string) => {
    const url = `https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/survey123_dd733c292be142d4afcb5c3a1d0829fe/FeatureServer/0/queryAttachments`;
    const params = new URLSearchParams({
      definitionExpression: `bar_code='${barCode}'`,
      attachmentTypes: "application/pdf",
      f: "html",
      returnUrl: "True",
    });

    setLoading(true); // Set loading state to true before fetching
    try {
      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.text();

      if (data.includes("No results found")) {
        setErrorMessage("No results found.");
        setSuccess(false);
      } else {
        const urlMatch = data.match(
          /<td>Url:<\/td><td>(https?:\/\/[^\s]+)<\/td>/
        );
        if (urlMatch) {
          const attachmentUrl = urlMatch[1];
          setPdfUrl(attachmentUrl);
          router.push(`/gbccertificate?barcode=${barcode}`);
          window.open(attachmentUrl, "_blank");
          setSuccess(true);
          setErrorMessage("");
        } else {
          setErrorMessage("No attachment found.");
          setSuccess(false);
          setPdfUrl("");
        }
      }
    } catch (error) {
      console.error("Error fetching attachment:", error);
      setErrorMessage("An error occurred while fetching the attachment.");
      setSuccess(false);
      setPdfUrl("");
    } finally {
      setLoading(false); // Set loading state to false after fetching
    }
  };

  useEffect(() => {
    // Get the barcode from the query parameters using useRouter
    const barcodeFromURL = searchParams.get("barcode");

    if (barcodeFromURL) {
      setBarcode(barcodeFromURL as string); // Set the barcode state
      // If a barcode is present in the URL, fetch the attachment
      getAttachment(barcodeFromURL as string);
    }
  }, [searchParams]); // Include router.query as a dependency

  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   const barcodeFromURL = params.get("barcode");
  //   if (barcodeFromURL) {
  //     getAttachment(barcodeFromURL);
  //   }
  // }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pdfUrl) {
      return window.open(pdfUrl, "_blank");
    }

    if (barcode) {
      return getAttachment(barcode);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex flex-col items-center flex-1 bg-[#F4F7FA] py-12">
        <h1 className="text-4xl font-bold text-[#082F49] mt-6">
          Validate Certificate
        </h1>

        <form
          className="w-full max-w-lg p-8 mt-6 bg-white rounded-lg shadow-lg transition-shadow duration-300 hover:shadow-xl"
          onSubmit={handleSubmit}
        >
          <label
            htmlFor="barcode"
            className="text-lg font-semibold text-[#082F49]"
          >
            Enter Certificate Code:
          </label>

          <input
            type="text"
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            required
            className="w-full mt-4 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#082F49] focus:border-transparent"
            placeholder="e.g., ABC123456"
          />

          <button
            type="submit"
            className={`w-full mt-6 p-3 bg-[#082F49] text-white font-semibold rounded-md transition duration-300 transform hover:bg-[#064B68] hover:scale-105 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading} // Disable button while loading
          >
            {loading ? (
              "Validating..."
            ) : (
              <>{success ? "View Certificate" : "Validate"}</>
            )}
          </button>

          {errorMessage && (
            <div className="mt-4 text-red-600 text-center text-sm font-medium">
              {errorMessage}
            </div>
          )}
          {success && (
            <div className="mt-4 text-green-600 text-center text-sm font-medium">
              Certificate successfully validated!
            </div>
          )}
        </form>
        {loading && (
          <div className="mt-4 text-gray-600">
            Loading... {/* Loading feedback message */}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateValidator;
