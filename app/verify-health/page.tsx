"use client";

import { useState } from "react";

const VerifyGridCode: React.FC = () => {
  const [gridCode, setGridCode] = useState("aaaa-ahgumc");
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const verifyGridCode = async () => {
    const apiKey =
      "oPkrz74GWC3lzLPBLfnRLQtJuPjGeLIaI8EcHkaBGO3KGB48zsYj120rimpJQW9pcGd5ToR8eQ4GTFktiG1FLTxrykFPmicr0bQHWLwEB4qfXFE8WBeY6OSGUGZaL6VNFTaqbox3Lm58s38GsDHidZk6gqQo6Ps4yzBQu4aMDUhGEpLPnjce9c00vjvUbEAUgZrPQGAP";
    const countryCode = "NG";
    const url = `https://gcorea.gridweb.net/external/api/verify-gridcode?gridCode=${gridCode}&countryCode=${countryCode}`;

    setIsLoading(true);
    setResponseMessage(null);
    setIsVerified(null);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "API-Key": apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const message = data.message;

        setResponseMessage(message);
        setIsVerified(message === "Verified");
      } else {
        setResponseMessage(`Error: ${response.status}`);
        setIsVerified(null);
      }
    } catch (error) {
      setResponseMessage(
        `Error: ${error instanceof Error ? error.message : "An error occurred"}`
      );
      setIsVerified(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0a162b80] p-0 min-h-screen">
      <div className="bg-[#0a162b] mx-auto text-white font-sans p-10 h-full flex flex-col w-full max-w-4xl">
        <h1 className="text-2xl font-bold">Verify Health Care Grid Code</h1>

        <label htmlFor="gridCode" className="text-lg mt-4">
          Grid Code:
        </label>
        <input
          type="text"
          id="gridCode"
          value={gridCode}
          onChange={(e) => setGridCode(e.target.value)}
          className="text-black text-lg p-2 mt-2 rounded w-full max-w-xs"
        />

        <button
          onClick={verifyGridCode}
          className={`font-semibold py-2 px-4 rounded mt-4 w-max ${
            isLoading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>

        <h2 className="text-xl font-semibold mt-6">Response:</h2>
        <pre className="bg-gray-800 p-4 rounded mt-2 w-full max-w-xl whitespace-pre-wrap">
          {responseMessage ? (
            isVerified !== null ? (
              <span
                className={
                  isVerified
                    ? "text-green-500 font-bold"
                    : "text-red-500 font-bold"
                }
              >
                {responseMessage}
              </span>
            ) : (
              responseMessage
            )
          ) : (
            "No response yet."
          )}
        </pre>
      </div>
    </div>
  );
};

export default VerifyGridCode;
