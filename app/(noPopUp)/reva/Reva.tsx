// ("use client");

// import { useState, useEffect } from "react";

// // Load Google Maps script dynamically
// const loadGoogleMapsScript = (callback: () => void) => {
//   if (typeof window.google === "undefined") {
//     const script = document.createElement("script");
//     script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
//     script.async = true;
//     script.onload = callback;
//     document.head.appendChild(script);
//   } else {
//     callback();
//   }
// };

// // Declare the google namespace globally
// declare global {
//   interface Window {
//     google: typeof google;
//   }
// }

// export default function Reva() {
//   const [email, setEmail] = useState("");
//   const [requester, setRequester] = useState("");
//   const [address, setAddress] = useState("");
//   const [location, setLocation] = useState("");
//   const [lga, setLga] = useState("");
//   const [totalCost, setTotalCost] = useState(0);
//   const [showReview, setShowReview] = useState(false);

//   useEffect(() => {
//     const initMap = () => {
//       const input = document.getElementById("address") as HTMLInputElement;
//       const autocomplete = new google.maps.places.Autocomplete(input);
//       const map = new google.maps.Map(
//         document.getElementById("map") as HTMLElement,
//         {
//           center: { lat: 6.5244, lng: 3.3792 },
//           zoom: 12,
//         }
//       );

//       let marker: google.maps.Marker | null = null;

//       const placeMarker = (location: google.maps.LatLng) => {
//         if (marker) marker.setMap(null);
//         marker = new google.maps.Marker({ position: location, map });
//         setLocation(`${location.lat()}, ${location.lng()}`);
//       };

//       const fetchLGA = async (lat: number, lng: number) => {
//         try {
//           const response = await fetch(
//             `https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/1/query?where=1%3D1&geometry=${lng}%2C${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=LGA,Price&f=json`
//           );
//           const data = await response.json();

//           if (data.features && data.features.length > 0) {
//             const lga = data.features[0].attributes.LGA
//               ? data.features[0].attributes.LGA.toUpperCase()
//               : "Unknown";
//             const price = data.features[0].attributes.Price || 0;
//             setLga(lga);
//             setTotalCost(price);
//           } else {
//             alert("LGA not found for this location.");
//           }
//         } catch (error) {
//           alert("Error fetching LGA data.");
//           console.error("Error:", error);
//         }
//       };

//       autocomplete.addListener("place_changed", () => {
//         const place = autocomplete.getPlace();
//         if (place.geometry && place.geometry.location) {
//           const location = place.geometry.location;
//           placeMarker(location);
//           fetchLGA(location.lat(), location.lng());
//           map.setCenter(location);
//           map.setZoom(15);
//         } else {
//           alert("No location found.");
//     loadGoogleMapsScript(initMap);
//       });

//       map.addListener("click", (event: google.maps.MapMouseEvent) => {
//         if (event.latLng) {
//           placeMarker(event.latLng);
//           fetchLGA(event.latLng.lat(), event.latLng.lng());
//           map.setCenter(event.latLng);
//           map.setZoom(15);
//         }
//       });
//     };

//     initMap();
//   }, []);

//   const handlePay = () => {
//     const handler = (window as any).PaystackPop.setup({
//       key: "pk_test_9dab542d1bb550a1775463d8894ecd546901b678",
//       email,
//       amount: totalCost * 100,
//       currency: "NGN",
//       onClose: () => alert("Transaction was not completed."),
//       callback: (response: any) => {
//         alert("Payment successful! Transaction ID: " + response.reference);
//         console.log("Transaction reference:", response.reference);
//       },
//     });
//     handler.openIframe();
//   };

//   return (
//     <div className="flex justify-center items-center min-h-screen bg-gray-100">
//       {!showReview ? (
//         <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
//           <h2 className="text-2xl font-bold text-gray-800 mb-4">
//             REVA Due Diligence Request
//           </h2>
//           <p className="italic text-gray-600 mb-4">
//             "Your due diligence just got intelligent"
//           </p>

//           <label className="block font-medium text-gray-700">Email</label>
//           <input
//             type="email"
//             className="border border-gray-300 rounded-lg p-2 w-full"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//           />

//           <label className="block font-medium text-gray-700 mt-4">
//             Requester Name
//           </label>
//           <input
//             type="text"
//             className="border border-gray-300 rounded-lg p-2 w-full"
//             value={requester}
//             onChange={(e) => setRequester(e.target.value)}
//           />

//           <label className="block font-medium text-gray-700 mt-4">
//             Property Address
//           </label>
//           <input
//             type="text"
//             id="address"
//             className="border border-gray-300 rounded-lg p-2 w-full"
//             value={address}
//             onChange={(e) => setAddress(e.target.value)}
//           />

//           <div id="map" className="w-full h-64 mt-4 rounded-lg"></div>

//           <label className="block font-medium text-gray-700 mt-4">
//             Location (Latitude, Longitude)
//           </label>
//           <input
//             type="text"
//             className="border border-gray-300 rounded-lg p-2 w-full"
//             value={location}
//             readOnly
//           />

//           <label className="block font-medium text-gray-700 mt-4">
//             Local Government Area (LGA)
//           </label>
//           <input
//             type="text"
//             className="border border-gray-300 rounded-lg p-2 w-full"
//             value={lga}
//             readOnly
//           />

//           <label className="block font-medium text-gray-700 mt-4">
//             Total Cost (NGN)
//           </label>
//           <input
//             type="number"
//             className="border border-gray-300 rounded-lg p-2 w-full"
//             value={totalCost}
//             readOnly
//           />

//           <button
//             className="bg-blue-600 text-white py-2 px-4 rounded-lg mt-4 w-full"
//             onClick={() => setShowReview(true)}
//           >
//             Proceed to Review
//           </button>
//         </div>
//       ) : (
//         <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
//           <h2 className="text-2xl font-bold text-gray-800 mb-4">
//             Review Your Details
//           </h2>
//           <p>
//             <strong>Email:</strong> {email}
//           </p>
//           <p>
//             <strong>Requester:</strong> {requester}
//           </p>
//           <p>
//             <strong>Address:</strong> {address}
//           </p>
//           <p>
//             <strong>Location:</strong> {location}
//           </p>
//           <p>
//             <strong>LGA:</strong> {lga}
//           </p>
//           <p>
//             <strong>Total Cost:</strong> {totalCost}
//           </p>

//           <button
//             className="bg-green-600 text-white py-2 px-4 rounded-lg mt-4 w-full"
//             onClick={handlePay}
//           >
//             Confirm & Pay
//           </button>
//           <button
//             className="bg-gray-600 text-white py-2 px-4 rounded-lg mt-4 w-full"
//             onClick={() => setShowReview(false)}
//           >
//             Edit Details
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
