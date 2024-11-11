"use client";

import { useState } from "react";

const GenerateGridCode: React.FC = () => {
  const [objectId, setObjectId] = useState<number | string>("");
  const [result, setResult] = useState<string | JSX.Element>("");
  const [loading, setLoading] = useState<boolean>(false);

  const generateApiUrl = "https://gcorea.gridweb.net/gridcode/api/generate";
  const storeApiUrl = "https://gcorea.gridweb.net/gridcode/api/store";
  const apiKey =
    "oPkrz74GWC3lzLPBLfnRLQtJuPjGeLIaI8EcHkaBGO3KGB48zsYj120rimpJQW9pcGd5ToR8eQ4GTFktiG1FLTxrykFPmicr0bQHWLwEB4qfXFE8WBeY6OSGUGZaL6VNFTaqbox3Lm58s38GsDHidZk6gqQo6Ps4yzBQu4aMDUhGEpLPnjce9c00vjvUbEAUgZrPQGAP";
  const categoryId = "EA6955C1-153D-4AC8-AAD2-A37E29189920";
  const countryCode = "NG"; // Nigeria (NG)
  const featureLayerUrl =
    "https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/Another/FeatureServer/0";

  const username = "TwoNodeSolution";
  const password = "TwoNodeEnterprise@01";

  const authenticate = async (): Promise<string | null> => {
    const authUrl = "https://www.arcgis.com/sharing/rest/generateToken";
    const params = new URLSearchParams({
      username,
      password,
      client: "referer",
      referer: window.location.origin,
      f: "json",
    });

    try {
      const response = await fetch(authUrl, {
        method: "POST",
        body: params,
      });

      const data = await response.json();
      if (data.token) {
        return data.token;
      } else {
        throw new Error("Authentication failed.");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      return null;
    }
  };

  const fetchFeatureLayerData = async () => {
    if (!objectId) {
      setResult("Please enter a valid OBJECTID.");
      return;
    }

    setLoading(true);
    const featureLayerQueryUrl = `${featureLayerUrl}/query?where=OBJECTID=${objectId}&outFields=latitude,longitude,prmry_name,GridCode&f=json`;

    try {
      const response = await fetch(featureLayerQueryUrl);
      const data = await response.json();

      if (data.features.length === 0) {
        setResult("OBJECTID does not exist. Kindly reconfirm the OBJECTID.");
        return;
      }

      const feature = data.features[0];
      const { latitude, longitude, prmry_name, GridCode } = feature.attributes;

      setResult(
        <>
          <p>
            <strong>Fetched Data:</strong>
          </p>
          <ul>
            <li>
              <strong>Latitude:</strong> {latitude}
            </li>
            <li>
              <strong>Longitude:</strong> {longitude}
            </li>
            <li>
              <strong>Primary Name:</strong> {prmry_name}
            </li>
            <li>
              <strong>GridCode:</strong> {GridCode}
            </li>
          </ul>
        </>
      );

      if (GridCode !== "GridCode not yet Generated") {
        setResult(
          <>
            <p>
              <strong>
                Permanent GridCode already generated: {GridCode}. You can't
                generate another one.
              </strong>
            </p>
          </>
        );
        setLoading(false);
        return;
      }

      const newGridCode = await generateGridCode(latitude, longitude);
      if (newGridCode) {
        await storeGridCode(newGridCode, latitude, longitude, prmry_name);

        const token = await authenticate();
        if (token) {
          const updateStatus = await updateFeatureLayer(
            objectId,
            newGridCode,
            token
          );
          if (updateStatus) {
            setResult(
              <>
                <p>
                  <strong>
                    New GridCode generated and stored: {newGridCode}
                  </strong>
                </p>
              </>
            );
          } else {
            setResult(
              <p>
                <strong>Failed to update feature layer with GridCode.</strong>
              </p>
            );
          }
        } else {
          setResult(
            <p>
              <strong>Failed to authenticate with ArcGIS Online.</strong>
            </p>
          );
        }
      } else {
        setResult(
          <p>
            <strong>Failed to generate a new GridCode.</strong>
          </p>
        );
      }
    } catch (error: any | unknown) {
      setResult(`Error fetching data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateGridCode = async (latitude: number, longitude: number) => {
    const generateData = {
      countryCode,
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
      if (response.status === 200 && data.data && data.data.gridcode) {
        return data.data.gridcode;
      } else {
        console.log("Generate API response error:", data);
        return null;
      }
    } catch (error) {
      console.error("Error generating GridCode:", error);
      return null;
    }
  };

  const storeGridCode = async (
    gridCode: string,
    latitude: number,
    longitude: number,
    prmryName: string
  ) => {
    const storeData = {
      gridcode: gridCode,
      categoryId,
      countryCode,
      generateAction: "USE_EXISTING",
      latA: latitude,
      longA: longitude,
      latB: latitude + 0.00005,
      longB: longitude + 0.00005,
      latC: latitude - 0.00005,
      longC: longitude - 0.00005,
      titleDescription: prmryName,
    };

    try {
      const response = await fetch(storeApiUrl, {
        method: "POST",
        headers: { "API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(storeData),
      });

      const data = await response.json();
      if (response.status === 200) {
        console.log(`GridCode ${gridCode} successfully stored.`);
      } else {
        console.log("Store GridCode API response error:", data);
      }
    } catch (error) {
      console.error("Error storing GridCode:", error);
    }
  };

  const updateFeatureLayer = async (
    objectId: string | number,
    newGridCode: string,
    token: string
  ) => {
    const updateData = {
      f: "json",
      token,
      updates: [
        {
          objectId,
          attributes: {
            GridCode: newGridCode,
          },
        },
      ],
    };

    const updateUrl = `${featureLayerUrl}/updateFeatures`;

    try {
      const response = await fetch(updateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          f: updateData.f,
          token: updateData.token,
          updates: JSON.stringify(updateData.updates), // Convert 'updates' to a JSON string
        }),
      });

      const data = await response.json();
      if (data.updateResults && data.updateResults[0].success) {
        return true;
      } else {
        console.log("Error updating feature layer:", data);
        return false;
      }
    } catch (error) {
      console.error("Error updating feature layer:", error);
      return false;
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg max-w-lg mx-auto">
      <h1 className="text-3xl text-center mb-6">
        Generate GridCode, Store, and Update the Healthcare Layer
      </h1>
      <label htmlFor="objectid" className="block mb-2 text-lg">
        Enter OBJECTID:
      </label>
      <input
        type="number"
        id="objectid"
        value={objectId}
        onChange={(e) => setObjectId(e.target.value)}
        className="w-full p-2 rounded-md bg-gray-700 text-white mb-4"
      />
      <button
        onClick={fetchFeatureLayerData}
        className="w-full bg-green-500 hover:bg-green-600 text-white p-2 rounded-md mb-4"
      >
        Submit
      </button>

      {loading && <div className="text-center text-xl">Loading...</div>}

      {result && (
        <div className="mt-4 bg-gray-800 p-4 rounded-md">
          {typeof result === "string" ? <p>{result}</p> : result}
        </div>
      )}
    </div>
  );
};

export default GenerateGridCode;

// "use client";

// import { useState } from "react";

// const GridCodeGenerator = () => {
//   const [objectId, setObjectId] = useState<number | string>("");
//   const [result, setResult] = useState<string>("");
//   const [loading, setLoading] = useState<boolean>(false);

//   const generateApiUrl = "https://gcorea.gridweb.net/gridcode/api/generate";
//   const storeApiUrl = "https://gcorea.gridweb.net/gridcode/api/store";
//   const apiKey =
//     "oPkrz74GWC3lzLPBLfnRLQtJuPjGeLIaI8EcHkaBGO3KGB48zsYj120rimpJQW9pcGd5ToR8eQ4GTFktiG1FLTxrykFPmicr0bQHWLwEB4qfXFE8WBeY6OSGUGZaL6VNFTaqbox3Lm58s38GsDHidZk6gqQo6Ps4yzBQu4aMDUhGEpLPnjce9c00vjvUbEAUgZrPQGAP";
//   const categoryId = "EA6955C1-153D-4AC8-AAD2-A37E29189920";
//   const countryCode = "NG"; // Nigeria

//   const featureLayerUrl =
//     "https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/Another/FeatureServer/0";
//   const username = "TwoNodeSolution";
//   const password = "TwoNodeEnterprise@01";

//   const authenticate = async () => {
//     const authUrl = "https://www.arcgis.com/sharing/rest/generateToken";
//     const params = new URLSearchParams({
//       username: username,
//       password: password,
//       client: "referer",
//       referer: window.location.origin,
//       f: "json",
//     });

//     try {
//       const response = await fetch(authUrl, {
//         method: "POST",
//         body: params,
//       });

//       const data = await response.json();
//       if (data.token) {
//         return data.token;
//       } else {
//         throw new Error("Authentication failed.");
//       }
//     } catch (error) {
//       console.error("Authentication error:", error);
//       return null;
//     }
//   };

//   const fetchFeatureLayerData = async () => {
//     setLoading(true);
//     const featureLayerQueryUrl = `${featureLayerUrl}/query?where=OBJECTID=${objectId}&outFields=latitude,longitude,prmry_name,GridCode&f=json`;

//     try {
//       const response = await fetch(featureLayerQueryUrl);
//       const data = await response.json();

//       if (data.features.length === 0) {
//         setResult("OBJECTID does not exist. Kindly reconfirm the OBJECTID.");
//         setLoading(false);
//         return;
//       }

//       const feature = data.features[0];
//       const { latitude, longitude, prmry_name, GridCode } = feature.attributes;

//       setResult(`
//         <p><strong>Fetched Data:</strong></p>
//         <ul>
//           <li><strong>Latitude:</strong> ${latitude}</li>
//           <li><strong>Longitude:</strong> ${longitude}</li>
//           <li><strong>Primary Name:</strong> ${prmry_name}</li>
//           <li><strong>GridCode:</strong> ${GridCode}</li>
//         </ul>
//       `);

//       if (GridCode !== "GridCode not yet Generated") {
//         setResult(`
//           <p><strong>Permanent GridCode already generated: ${GridCode}. You can't generate another one.</strong></p>
//         `);
//         setLoading(false);
//         return;
//       }

//       const newGridCode = await generateGridCode(latitude, longitude);

//       if (newGridCode) {
//         await storeGridCode(newGridCode, latitude, longitude, prmry_name);

//         const token = await authenticate();

//         if (token) {
//           const updateStatus = await updateFeatureLayer(
//             feature.attributes.OBJECTID,
//             newGridCode,
//             token
//           );
//           if (updateStatus) {
//             setResult(`
//               <p><strong>New GridCode generated and stored: ${newGridCode}</strong></p>
//             `);
//           } else {
//             setResult(`
//               <p><strong>Failed to update feature layer with GridCode.</strong></p>
//             `);
//           }
//         } else {
//           setResult(`
//             <p><strong>Failed to authenticate with ArcGIS Online.</strong></p>
//           `);
//         }
//       } else {
//         setResult(`
//           <p><strong>Failed to generate a new GridCode.</strong></p>
//         `);
//       }
//     } catch (error: any | unknown) {
//       setResult(`Error fetching data: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const generateGridCode = async (latitude: number, longitude: number) => {
//     const generateData = {
//       countryCode,
//       lat: latitude,
//       long: longitude,
//     };

//     try {
//       const response = await fetch(generateApiUrl, {
//         method: "POST",
//         headers: {
//           "API-Key": apiKey,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(generateData),
//       });

//       const data = await response.json();
//       if (response.status === 200 && data.data && data.data.gridcode) {
//         return data.data.gridcode;
//       } else {
//         console.log("Generate API response error:", data);
//         return null;
//       }
//     } catch (error) {
//       console.error("Error generating GridCode:", error);
//       return null;
//     }
//   };

//   const storeGridCode = async (
//     gridCode: string,
//     latitude: number,
//     longitude: number,
//     prmryName: string
//   ) => {
//     const storeData = {
//       gridcode: gridCode,
//       categoryId,
//       countryCode,
//       generateAction: "USE_EXISTING",
//       latA: latitude,
//       longA: longitude,
//       latB: latitude + 0.00005,
//       longB: longitude + 0.00005,
//       latC: latitude - 0.00005,
//       longC: longitude - 0.00005,
//       titleDescription: prmryName,
//     };

//     try {
//       const response = await fetch(storeApiUrl, {
//         method: "POST",
//         headers: {
//           "API-Key": apiKey,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(storeData),
//       });

//       const data = await response.json();
//       if (response.status === 200) {
//         console.log(`GridCode ${gridCode} successfully stored.`);
//       } else {
//         console.log("Store GridCode API response error:", data);
//       }
//     } catch (error) {
//       console.error("Error storing GridCode:", error);
//     }
//   };

//   const updateFeatureLayer = async (
//     objectId: number,
//     newGridCode: string,
//     token: string
//   ) => {
//     const updateData = {
//       f: "json",
//       token,
//       updates: [
//         {
//           objectId,
//           attributes: {
//             GridCode: newGridCode,
//           },
//         },
//       ],
//     };

//     const updateUrl = `${featureLayerUrl}/updateFeatures`;

//     try {
//       const response = await fetch(updateUrl, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         body: new URLSearchParams(updateData),
//       });

//       const data = await response.json();
//       if (data.updateResults && data.updateResults[0].success) {
//         return true;
//       } else {
//         console.log("Error updating feature layer:", data);
//         return false;
//       }
//     } catch (error) {
//       console.error("Error updating feature layer:", error);
//       return false;
//     }
//   };

//   return (
//     <div className="bg-[#0a162b50] min-w-screen min-h-screen p-4">
//       <div className="bg-[#0a162b] m-auto rounded-lg text-white p-12 font-sans max-w-7xl">
//         <h1 className="text-2xl font-semibold mb-4 text-center">
//           Generate GridCode, Store and Update the Healthcare Layer
//         </h1>
//         <div className="mb-4">
//           <label htmlFor="objectid" className="block text-lg mb-2">
//             Enter OBJECTID:
//           </label>
//           <input
//             type="number"
//             id="objectid"
//             value={objectId}
//             onChange={(e) => setObjectId(e.target.value)}
//             className="p-2 text-black w-full max-w-xs mb-4"
//           />
//           <br />
//           <button
//             onClick={fetchFeatureLayerData}
//             className="bg-green-500 text-white p-3 rounded-lg w-28 max-w-xs hover:bg-green-600"
//           >
//             {loading ? "Loading..." : "Submit"}
//           </button>
//         </div>
//         <div
//           id="result"
//           className="mt-6 text-lg"
//           dangerouslySetInnerHTML={{ __html: result }}
//         />
//       </div>
//     </div>
//   );
// };

// export default GridCodeGenerator;
