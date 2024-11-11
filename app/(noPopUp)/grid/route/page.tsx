"use client";

import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Coordinates {
  lat: number;
  lng: number;
}

const DistanceCalculation: React.FC = () => {
  const apiKey = "YOUR_API_KEY"; // Add your API key here
  const countryCode = "NG";
  const [sourceCoords, setSourceCoords] = useState<Coordinates | null>(null);
  const [destinationCoords, setDestinationCoords] =
    useState<Coordinates | null>(null);
  const [sourceGridCode, setSourceGridCode] = useState("aaaa-aagi");
  const [destinationGridCode, setDestinationGridCode] = useState("aaaa-aagk");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null); // Reference to store the map instance

  useEffect(() => {
    // Initialize the map only once
    if (!mapRef.current) {
      mapRef.current = L.map("map").setView([9.082, 8.6753], 6); // Center on Nigeria
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
        mapRef.current
      );
    }
  }, []);

  const fetchData = async () => {
    setResponse("");
    setIsLoading(true);

    if (!sourceGridCode || !destinationGridCode) {
      setResponse("<strong>Error:</strong> Please enter valid Grid Codes.");
      setIsLoading(false);
      return;
    }

    await fetchGridCodeData(sourceGridCode, "source");
    await fetchGridCodeData(destinationGridCode, "destination");

    setIsLoading(false);
  };

  const fetchGridCodeData = async (
    gridCode: string,
    type: "source" | "destination"
  ) => {
    const url = "https://gcorea.gridweb.net/external/api/search-gridcodes";
    const headers = {
      "API-Key": apiKey,
    };

    const data = new URLSearchParams();
    data.append("gridCodes[0]", gridCode);
    data.append("countryCodes[0]", countryCode);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: data,
      });
      const result = await response.json();

      const coords = result.data.details[0];
      if (type === "source") {
        setSourceCoords({ lat: coords.lat, lng: coords.lng });
        setResponse(
          (prev) =>
            prev +
            `<strong>Source:</strong> ${coords.address}<br>Latitude: ${coords.lat}, Longitude: ${coords.lng}<br><br>`
        );
      } else {
        setDestinationCoords({ lat: coords.lat, lng: coords.lng });
        setResponse(
          (prev) =>
            prev +
            `<strong>Destination:</strong> ${coords.address}<br>Latitude: ${coords.lat}, Longitude: ${coords.lng}<br><br>`
        );
      }
    } catch (error: any | unknown) {
      setResponse("<strong>Error:</strong> " + error.message);
    }
  };

  const addToMap = () => {
    if (!sourceCoords || !destinationCoords) {
      alert("Please search both source and destination first.");
      return;
    }

    const map = mapRef.current!;
    map.setView([sourceCoords.lat, sourceCoords.lng], 6);

    L.marker([sourceCoords.lat, sourceCoords.lng])
      .addTo(map)
      .bindPopup(
        `<strong>Source Grid Code:</strong> ${sourceGridCode}<br><strong>Coordinates:</strong> ${sourceCoords.lat}, ${sourceCoords.lng}`
      )
      .openPopup();

    L.marker([destinationCoords.lat, destinationCoords.lng])
      .addTo(map)
      .bindPopup(
        `<strong>Destination Grid Code:</strong> ${destinationGridCode}<br><strong>Coordinates:</strong> ${destinationCoords.lat}, ${destinationCoords.lng}`
      )
      .openPopup();

    map.fitBounds([
      [sourceCoords.lat, sourceCoords.lng],
      [destinationCoords.lat, destinationCoords.lng],
    ]);
  };

  const navigateToDestination = () => {
    if (!sourceCoords || !destinationCoords) {
      alert("Please search both source and destination first.");
      return;
    }

    const googleMapsURL = `https://www.google.com/maps/dir/?api=1&origin=${sourceCoords.lat},${sourceCoords.lng}&destination=${destinationCoords.lat},${destinationCoords.lng}&travelmode=driving`;
    window.open(googleMapsURL, "_blank");
  };

  return (
    <div className="bg-[#0a162b50] min-w-screen min-h-screen p-4">
      <div className="bg-[#0a162b] m-auto text-white p-12 font-sans max-w-7xl">
        <h1 className="text-2xl font-bold">
          Route Navigation Between Two Health Care Grid Codes
        </h1>

        <label className="mt-4 text-lg block" htmlFor="sourceGridCode">
          Source Grid Code:
        </label>
        <input
          type="text"
          id="sourceGridCode"
          value={sourceGridCode}
          onChange={(e) => setSourceGridCode(e.target.value)}
          className="w-full max-w-xs mt-2 p-2 text-black"
        />

        <label className="mt-8 text-lg block" htmlFor="destinationGridCode">
          Destination Grid Code:
        </label>
        <input
          type="text"
          id="destinationGridCode"
          value={destinationGridCode}
          onChange={(e) => setDestinationGridCode(e.target.value)}
          className="w-full max-w-xs mt-2 p-2 text-black"
        />

        <button
          onClick={fetchData}
          className="bg-green-600 mt-12 block px-4 py-2 hover:bg-green-700"
        >
          {isLoading ? "Loading..." : "Search Grid Code"}
        </button>

        <div
          id="response"
          dangerouslySetInnerHTML={{ __html: response }}
          className="mt-4 p-4 bg-gray-800 rounded"
        ></div>

        <button
          onClick={addToMap}
          className="bg-blue-600 mt-8 px-4 py-2 hover:bg-blue-700"
          disabled={isLoading}
        >
          Add to Map
        </button>
        <button
          onClick={navigateToDestination}
          className="bg-red-600 mt-8 ml-8 px-4 py-2 hover:bg-red-700"
          disabled={isLoading}
        >
          Navigate
        </button>

        <div id="map" className="h-96 mt-4"></div>
      </div>
    </div>
  );
};

export default DistanceCalculation;

// "use client";

// import { useState } from "react";
// import L, { Map as LeafletMap, LatLngExpression } from "leaflet";
// import "leaflet/dist/leaflet.css";
// import { useEffect, useRef } from "react";

// const apiKey = "YOUR_API_KEY"; // Replace with your actual API key
// const countryCode = "NG";

// export default function DistanceCalculator() {
//   const [sourceGridCode, setSourceGridCode] = useState("aaaa-aagi");
//   const [destinationGridCode, setDestinationGridCode] = useState("aaaa-aagk");
//   const [sourceCoords, setSourceCoords] = useState<{ lat: number; lng: number } | null>(null);
//   const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
//   const [loading, setLoading] = useState(false);
//   const mapRef = useRef<LeafletMap | null>(null);
//   const mapContainerRef = useRef<HTMLDivElement>(null);

//   // Initialize map once on mount
//   useEffect(() => {
//     if (mapContainerRef.current && !mapRef.current) {
//       mapRef.current = L.map(mapContainerRef.current).setView([9.082, 8.6753], 6); // Center on Nigeria
//       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
//     }
//   }, []);

//   const fetchGridCodeData = async (gridCode: string, type: "source" | "destination") => {
//     try {
//       const url = "https://gcorea.gridweb.net/external/api/search-gridcodes";
//       const response = await fetch(url, {
//         method: "POST",
//         headers: { "API-Key": apiKey },
//         body: new URLSearchParams({ "gridCodes[0]": gridCode, "countryCodes[0]": countryCode }),
//       });
//       const data = await response.json();
//       const coords = data.data.details[0];

//       if (type === "source") {
//         setSourceCoords({ lat: coords.lat, lng: coords.lng });
//       } else {
//         setDestinationCoords({ lat: coords.lat, lng: coords.lng });
//       }
//     } catch (error) {
//       console.error("Error fetching data:", error);
//     }
//   };

//   const handleFetchData = async () => {
//     if (!sourceGridCode || !destinationGridCode) {
//       alert("Please enter valid Grid Codes.");
//       return;
//     }
//     setLoading(true);
//     await Promise.all([
//       fetchGridCodeData(sourceGridCode, "source"),
//       fetchGridCodeData(destinationGridCode, "destination"),
//     ]);
//     setLoading(false);
//   };

//   const handleAddToMap = () => {
//     if (!mapRef.current || !sourceCoords || !destinationCoords) {
//       alert("Please search both source and destination first.");
//       return;
//     }

//     L.marker([sourceCoords.lat, sourceCoords.lng] as LatLngExpression).addTo(mapRef.current)
//       .bindPopup(`<strong>Source Grid Code:</strong> ${sourceGridCode}<br><strong>Coordinates:</strong> ${sourceCoords.lat}, ${sourceCoords.lng}`)
//       .openPopup();

//     L.marker([destinationCoords.lat, destinationCoords.lng] as LatLngExpression).addTo(mapRef.current)
//       .bindPopup(`<strong>Destination Grid Code:</strong> ${destinationGridCode}<br><strong>Coordinates:</strong> ${destinationCoords.lat}, ${destinationCoords.lng}`)
//       .openPopup();

//     mapRef.current.fitBounds([
//       [sourceCoords.lat, sourceCoords.lng],
//       [destinationCoords.lat, destinationCoords.lng],
//     ]);
//   };

//   const navigateToDestination = () => {
//     if (!sourceCoords || !destinationCoords) {
//       alert("Please search both source and destination first.");
//       return;
//     }
//     const googleMapsURL = `https://www.google.com/maps/dir/?api=1&origin=${sourceCoords.lat},${sourceCoords.lng}&destination=${destinationCoords.lat},${destinationCoords.lng}&travelmode=driving`;
//     window.open(googleMapsURL, "_blank");
//   };

//   return (
//     <div className="p-5 text-white bg-[#0a162b]">
//       <h1 className="text-2xl mb-4">Route Navigation Between Two Health Care Grid Codes</h1>
//       <label htmlFor="sourceGridCode" className="block text-lg">Source Grid Code:</label>
//       <input
//         type="text"
//         id="sourceGridCode"
//         value={sourceGridCode}
//         onChange={(e) => setSourceGridCode(e.target.value)}
//         className="text-black p-2 w-full max-w-xs mb-4"
//       />

//       <label htmlFor="destinationGridCode" className="block text-lg">Destination Grid Code:</label>
//       <input
//         type="text"
//         id="destinationGridCode"
//         value={destinationGridCode}
//         onChange={(e) => setDestinationGridCode(e.target.value)}
//         className="text-black p-2 w-full max-w-xs mb-4"
//       />

//       <button
//         onClick={handleFetchData}
//         className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md mb-4 text-lg"
//       >
//         {loading ? "Loading..." : "Search Grid Code"}
//       </button>

//       <button
//         onClick={handleAddToMap}
//         className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mb-4 ml-4 text-lg"
//       >
//         Add to Map
//       </button>

//       <button
//         onClick={navigateToDestination}
//         className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md mb-4 ml-4 text-lg"
//       >
//         Navigate
//       </button>

//       <div className="mt-5">
//         <div ref={mapContainerRef} className="h-96 w-full rounded-md" id="map"></div>
//       </div>
//     </div>
//   );
// }
