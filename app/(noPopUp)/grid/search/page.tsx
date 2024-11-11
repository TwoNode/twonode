"use client";

import { useState, ReactNode } from "react";

const SearchGridCode: React.FC = () => {
  const [gridCode, setGridCode] = useState("");
  const [responseData, setResponseData] = useState<ReactNode | string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    if (!gridCode.trim()) {
      setResponseData(
        <strong className="text-red-500">
          Error: Please enter a valid Grid Code.
        </strong>
      );
      return;
    }

    setIsLoading(true);
    setResponseData(null);

    const url = "https://gcorea.gridweb.net/external/api/search-gridcodes";
    const headers = {
      "API-Key":
        "oPkrz74GWC3lzLPBLfnRLQtJuPjGeLIaI8EcHkaBGO3KGB48zsYj120rimpJQW9pcGd5ToR8eQ4GTFktiG1FLTxrykFPmicr0bQHWLwEB4qfXFE8WBeY6OSGUGZaL6VNFTaqbox3Lm58s38GsDHidZk6gqQo6Ps4yzBQu4aMDUhGEpLPnjce9c00vjvUbEAUgZrPQGAP",
    };

    const data = new URLSearchParams();
    data.append("gridCodes[0]", gridCode);
    data.append("countryCodes[0]", "NG");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: data,
      });

      const result = await response.json();
      const story = formatResponseAsStory(result);
      setResponseData(story);
    } catch (error) {
      setResponseData(
        <strong className="text-red-500">
          Error: {error instanceof Error ? error.message : "An error occurred"}
        </strong>
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponseAsStory = (response: any): ReactNode => {
    if (
      response &&
      response.data &&
      Array.isArray(response.data.details) &&
      response.data.details.length > 0
    ) {
      return response.data.details.map((item: any, index: number) => (
        <div key={index} className="mb-6">
          <div>
            <span className="font-bold text-blue-500">Grid Code:</span>{" "}
            {item.gridCode || "Grid Code not available"}
          </div>
          <div className="italic">
            Address: {item.address || "Address not available"}, located in the
            city of{" "}
            <span className="italic">{item.city || "City not available"}</span>,{" "}
            <span className="italic">
              {item.country || "Country not available"}
            </span>
            .
          </div>
          <div className="font-bold text-green-500">
            Coordinates: Latitude: {item.lat || "Not available"}, Longitude:{" "}
            {item.lng || "Not available"}
          </div>
          <hr className="border-blue-500 my-4" />
        </div>
      ));
    } else {
      return "Sorry, the Grid Code entered is not valid.";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a162b] text-[#f1f1f1] p-6">
      <div className="max-w-xl mx-auto bg-[#1a2636] p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-400">
          Search Health Care Grid Codes
        </h1>

        <label htmlFor="gridCode" className="block mt-4 text-lg font-semibold">
          Enter Grid Code:
        </label>
        <input
          type="text"
          id="gridCode"
          value={gridCode}
          onChange={(e) => setGridCode(e.target.value)}
          placeholder="aaaa-aagi"
          className="w-full mt-2 p-2 bg-[#1a2636] border border-blue-500 rounded text-[#f1f1f1]"
        />

        <button
          onClick={fetchData}
          className={`mt-4 py-2 px-4 rounded font-bold ${
            isLoading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-700"
          } text-white`}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Get Data"}
        </button>

        <h3 className="text-xl font-semibold mt-6">Response:</h3>
        <div className="story mt-4 bg-[#1a2636] p-4 rounded">
          {isLoading ? (
            <div className="text-blue-500">Loading...</div>
          ) : responseData ? (
            <div>{responseData}</div>
          ) : (
            "No response yet."
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchGridCode;
