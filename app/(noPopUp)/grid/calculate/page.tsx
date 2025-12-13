const ExampleWithIframe = () => {
  return (
    <div className="bg-[#0a162b50] min-w-screen min-h-screen p-4">
      <iframe
        src="/calculate.html" // Path to the static HTML file in public directory
        width="100%"
        height="800px"
        title="Embedded HTML"
        className="max-w-4xl mx-auto rounded-xl"
      />
    </div>
  );
};

export default ExampleWithIframe;

// "use client";

// import React, { useState } from "react";

// const apiKey = "YOUR_API_KEY"; // Replace with actual API key
// const countryCode = "NG";

// export default function DistanceCalculator() {
//   const [sourceGridCode, setSourceGridCode] = useState("aaaa-aagi");
//   const [destinationGridCode, setDestinationGridCode] = useState("aaaa-aagk");
//   const [responseMessage, setResponseMessage] = useState("");
//   const [loading, setLoading] = useState(false);

//   const verifyGridCode = async (gridCode: string): Promise<boolean> => {
//     const url = `https://gcorea.gridweb.net/external/api/verify-gridcode?gridCode=${gridCode}&countryCode=${countryCode}`;
//     try {
//       const response = await fetch(url, {
//         method: "GET",
//         headers: {
//           "API-Key": apiKey,
//         },
//       });
//       if (response.ok) {
//         const data = await response.json();
//         return data.message === "Verified";
//       } else {
//         return false;
//       }
//     } catch (error) {
//       console.error("Error verifying grid code:", error);
//       return false;
//     }
//   };

//   const verifyAndCalculateDistance = async () => {
//     setLoading(true);
//     setResponseMessage("");
//     const isSourceValid = await verifyGridCode(sourceGridCode);
//     const isDestinationValid = await verifyGridCode(destinationGridCode);
//     let message = "";

//     if (!isSourceValid && !isDestinationValid) {
//       message = `Both Source Grid Code "${sourceGridCode}" and Destination Grid Code "${destinationGridCode}" are not valid.`;
//     } else if (!isSourceValid) {
//       message = `Source Grid Code "${sourceGridCode}" is not valid, but Destination Grid Code "${destinationGridCode}" is verified.`;
//     } else if (!isDestinationValid) {
//       message = `Destination Grid Code "${destinationGridCode}" is not valid, but Source Grid Code "${sourceGridCode}" is verified.`;
//     } else {
//       message = `Both Source Grid Code "${sourceGridCode}" and Destination Grid Code "${destinationGridCode}" are verified. Proceeding with distance calculation...`;

//       try {
//         const response = await fetch(
//           "https://gcorea.gridweb.net/external/api/calculate-distance",
//           {
//             method: "POST",
//             headers: {
//               "API-Key": apiKey,
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               sourceGridCode,
//               destinationGridCode,
//               sourceCountryCode: countryCode,
//               destinationCountryCode: countryCode,
//             }),
//           }
//         );

//         if (response.ok) {
//           const result = await response.json();
//           const { data } = result;

//           if (data && data.distanceKm) {
//             const distance = data.distanceKm;
//             const travelTime = data.estimatedTravelTime || "N/A";
//             message += `\nDistance: ${distance} km\nEstimated Travel Time: ${travelTime}`;

//             // Format source and destination details
//             const sourceDetails = data.sourceGridCode || {};
//             const destinationDetails = data.destinationGridCode || {};
//             message += `
//               \nSource:
//               Grid Code: ${sourceDetails.gridCode || "N/A"},
//               Address: ${sourceDetails.address || "N/A"},
//               Coordinates: (${sourceDetails.lat}, ${sourceDetails.lng}),
//               State: ${sourceDetails.state || "N/A"}

//               Destination:
//               Grid Code: ${destinationDetails.gridCode || "N/A"},
//               Address: ${destinationDetails.address || "N/A"},
//               Coordinates: (${destinationDetails.lat}, ${
//               destinationDetails.lng
//             }),
//               State: ${destinationDetails.state || "N/A"}
//             `;
//           } else {
//             message += "\nError: Missing source or destination data.";
//           }
//         } else {
//           message += `\nError calculating distance: ${response.status} ${response.statusText}`;
//         }
//       } catch (error: any | unknown) {
//         message += `\nError: ${error.message}`;
//       }
//     }

//     setResponseMessage(message);
//     setLoading(false);
//   };

//   return (
//     <div className="bg-[#0a162b50] min-w-screen min-h-screen p-4">
//       <div className="max-w-7xl min-h-[500px] bg-[#0a162b] m-auto text-white p-6 rounded-lg">
//         <h1 className="text-2xl font-bold mb-4">
//           Calculate Distance Between Two Health Care Grid Codes
//         </h1>
//         <div className="mb-4">
//           <label htmlFor="sourceGridCode" className="block text-lg mb-1">
//             Source Grid Code:
//           </label>
//           <input
//             type="text"
//             id="sourceGridCode"
//             value={sourceGridCode}
//             onChange={(e) => setSourceGridCode(e.target.value)}
//             className="text-black p-2 w-full max-w-sm rounded"
//           />
//         </div>
//         <div className="mb-4">
//           <label htmlFor="destinationGridCode" className="block text-lg mb-1">
//             Destination Grid Code:
//           </label>
//           <input
//             type="text"
//             id="destinationGridCode"
//             value={destinationGridCode}
//             onChange={(e) => setDestinationGridCode(e.target.value)}
//             className="text-black p-2 w-full max-w-sm rounded"
//           />
//         </div>
//         <button
//           onClick={verifyAndCalculateDistance}
//           className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-lg"
//           disabled={loading}
//         >
//           {loading ? "Calculating..." : "Calculate Distance"}
//         </button>

//         <h2 className="text-xl font-semibold mt-6">Response:</h2>
//         <pre className="bg-gray-800 p-4 rounded-lg mt-2 text-lg whitespace-pre-wrap">
//           {responseMessage || "No response yet"}
//         </pre>
//       </div>
//     </div>
//   );
// }
