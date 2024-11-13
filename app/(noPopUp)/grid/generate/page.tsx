// components/GridCodeGenerator.tsx
"use client";

import { useState } from "react";

const GridCodeGenerator = () => {
  const [objectId, setObjectId] = useState<number | "">("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const generateApiUrl = "https://gcorea.gridweb.net/gridcode/api/generate";
  const storeApiUrl = "https://gcorea.gridweb.net/gridcode/api/store";
  const apiKey =
    "oPkrz74GWC3lzLPBLfnRLQtJuPjGeLIaI8EcHkaBGO3KGB48zsYj120rimpJQW9pcGd5ToR8eQ4GTFktiG1FLTxrykFPmicr0bQHWLwEB4qfXFE8WBeY6OSGUGZaL6VNFTaqbox3Lm58s38GsDHidZk6gqQo6Ps4yzBQu4aMDUhGEpLPnjce9c00vjvUbEAUgZrPQGAP";
  const categoryId = "EA6955C1-153D-4AC8-AAD2-A37E29189920";
  const countryCode = "NG";
  const featureLayerUrl =
    "https://services5.arcgis.com/DQqY3pyPVyNe3HvS/arcgis/rest/services/Nigeria_Health_Facilities_WFL1/FeatureServer/1";

  const fetchFeatureLayerData = async () => {
    setLoading(true);
    setResult("");

    try {
      const featureLayerQueryUrl = `${featureLayerUrl}/query?where=OBJECTID=${objectId}&outFields=latitude,longitude,prmry_name,GridCode&f=json`;
      const response = await fetch(featureLayerQueryUrl);
      const data = await response.json();

      if (data.features.length === 0) {
        setResult("OBJECTID does not exist. Kindly reconfirm the OBJECTID.");
        setLoading(false);
        return;
      }

      const feature = data.features[0];
      const {
        latitude,
        longitude,
        prmry_name: primaryName,
        GridCode: gridCode,
      } = feature.attributes;

      setResult(
        `<p><strong>Fetched Data:</strong></p>
        <ul>
          <li><strong>Latitude:</strong> ${latitude}</li>
          <li><strong>Longitude:</strong> ${longitude}</li>
          <li><strong>Primary Name:</strong> ${primaryName}</li>
          <li><strong>GridCode:</strong> ${gridCode}</li>
        </ul>`
      );

      if (gridCode !== "GridCode not yet Generated") {
        setResult(
          (prev) =>
            prev +
            `<p><strong>Permanent GridCode already generated: ${gridCode}. You can't generate another one.</strong></p>`
        );
        setLoading(false);
        return;
      }

      const newGridCode = await generateGridCode(latitude, longitude);

      if (newGridCode) {
        setResult(
          (prev) =>
            prev +
            `<p><strong>Step 1: GridCode successfully generated: ${newGridCode}</strong></p>`
        );
        await storeGridCode(newGridCode, latitude, longitude, primaryName);
        setResult(
          (prev) =>
            prev +
            `<p><strong>Step 2: GridCode successfully stored.</strong></p>`
        );
        await calculateGridCodeField(objectId, newGridCode);
      } else {
        setResult(
          (prev) =>
            prev + `<p><strong>Failed to generate a new GridCode.</strong></p>`
        );
      }
    } catch (error: any) {
      setResult(`Error fetching data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateGridCode = async (latitude: number, longitude: number) => {
    const generateData = {
      countryCode: countryCode,
      lat: latitude,
      long: longitude,
    };

    try {
      const response = await fetch(generateApiUrl, {
        method: "POST",
        headers: { "API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(generateData),
      });

      const data = await response.json();
      return response.ok && data.data?.gridcode ? data.data.gridcode : null;
    } catch (error) {
      console.error("Error generating GridCode:", error);
      return null;
    }
  };

  const storeGridCode = async (
    gridCode: string,
    latitude: number,
    longitude: number,
    primaryName: string
  ) => {
    const storeData = {
      gridcode: gridCode,
      categoryId: categoryId,
      countryCode: countryCode,
      generateAction: "USE_EXISTING",
      latA: latitude,
      longA: longitude,
      latB: latitude + 0.00005,
      longB: longitude + 0.00005,
      latC: latitude - 0.00005,
      longC: longitude - 0.00005,
      titleDescription: primaryName,
    };

    try {
      const response = await fetch(storeApiUrl, {
        method: "POST",
        headers: { "API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(storeData),
      });

      if (!response.ok) {
        console.error(
          "Store GridCode API response error:",
          await response.json()
        );
      }
    } catch (error) {
      console.error("Error storing GridCode:", error);
    }
  };

  const calculateGridCodeField = async (
    objectId: number | "",
    gridCodeGenerated: string
  ) => {
    const calculateUrl = `${featureLayerUrl}/calculate`;
    const calculateData = {
      f: "json",
      where: `OBJECTID=${objectId}`,
      calcExpression: JSON.stringify([
        { field: "GridCode", value: gridCodeGenerated },
      ]),
    };

    try {
      const response = await fetch(calculateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(calculateData),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResult(
          (prev) =>
            prev +
            `<p><strong>Step 3: GridCode field successfully calculated and updated.</strong></p>`
        );
      } else {
        console.error("Calculate Field API response error:", data);
        setResult(
          (prev) =>
            prev + `<p><strong>Failed to update GridCode field.</strong></p>`
        );
      }
    } catch (error: any) {
      console.error("Error updating GridCode field:", error);
      setResult(
        (prev) =>
          prev +
          `<p><strong>Error calculating GridCode field: ${error.message}</strong></p>`
      );
    }
  };

  return (
    <div className="bg-[#0a162b50] min-w-screen min-h-screen p-4">
      <div className="max-w-2xl mx-auto bg-[#1a2636] p-8 rounded-lg shadow-lg text-white font-sans">
        <h1 className="text-2xl text-center mb-4">
          Generate Health Care GridCode, Store and Update Database
        </h1>
        <label htmlFor="objectid" className="block text-lg mb-2">
          Enter OBJECTID:
        </label>
        <input
          type="number"
          id="objectid"
          name="objectid"
          className="text-black p-2 rounded mb-4 w-full max-w-md"
          value={objectId}
          onChange={(e) =>
            setObjectId(e.target.value ? parseInt(e.target.value) : "")
          }
        />
        <br />
        <button
          onClick={fetchFeatureLayerData}
          disabled={loading}
          className={`bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Loading..." : "Submit"}
        </button>
        <div
          id="result"
          className="mt-6 text-base"
          dangerouslySetInnerHTML={{ __html: result }}
        ></div>
      </div>
    </div>
  );
};

export default GridCodeGenerator;
