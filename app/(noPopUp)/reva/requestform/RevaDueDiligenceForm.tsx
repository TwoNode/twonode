"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import {
  LoadScript,
  GoogleMap,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PaystackProps, callback } from "react-paystack/dist/types";

import dynamic from "next/dynamic";

const PaystackButton = dynamic(
  () => import("react-paystack").then((mod) => mod.PaystackButton),
  { ssr: false } // This ensures it's only loaded on the client
);

interface PaystackButtonProps extends PaystackProps {
  text?: string;
  className?: string;
  disabled?: boolean;
  children?: ReactNode;
  onSuccess?: callback;
  onClose?: callback;
}

const containerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "15px",
};

const center = { lat: 6.5244, lng: 3.3792 };

const RevaDueDiligenceForm: React.FC = () => {
  const router = useRouter();

  const [isWindowReady, setIsWindowReady] = useState(false);
  const [email, setEmail] = useState("rojitech9@gmail.com");
  const [requester, setRequester] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [lga, setLga] = useState("Unknown");
  const [totalCost, setTotalCost] = useState(30);
  const [showReview, setShowReview] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [paystackPublicKey, setPaystackPublicKey] = useState("");

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsWindowReady(true);
      setGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
      setPaystackPublicKey(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "");
    }
  }, []);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLocation({ lat, lng });
        fetchLGA(lat, lng);
      }
    }
  };

  const fetchLGA = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/1/query?where=1%3D1&geometry=${lng}%2C${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=LGA,Price&f=json`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        setLga(data.features[0].attributes.LGA || "Unknown");
        setTotalCost(data.features[0].attributes.Price || 0);
      }
    } catch (error) {
      console.error("Error fetching LGA data", error);
    }
  };

  if (!googleMapsApiKey || !isWindowReady) {
    // Show a loading spinner or message while waiting for the API key
    // and window object to be available

    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );
  }

  // Configuration object for Paystack payment integration
  const paystackConfig: PaystackButtonProps = {
    email, // Email of the payer
    amount: totalCost * 100, // Total cost converted to kobo (Paystack uses the smallest currency unit)
    publicKey: paystackPublicKey, // Paystack public key
    text: "Loading...",
    disabled: true,

    reference: `REVA_${Date.now().toString()}`, // Unique reference for the transaction
    metadata: {
      requester, // Name of the requester
      address, // Property address
      lga, // Local Government Area (LGA)
      custom_fields: [
        {
          display_name: "Requester Name", // Display name for the requester
          variable_name: "requester", // Variable name for the requester
          value: requester, // Value of the requester
        },
        {
          display_name: "Property Address", // Display name for the property address
          variable_name: "address", // Variable name for the property address
          value: address, // Value of the property address
        },
        {
          display_name: "LGA", // Display name for the LGA
          variable_name: "lga", // Variable name for the LGA
          value: lga, // Value of the LGA
        },
      ],
    },
    currency: "NGN", // Currency for the transaction (Nigerian Naira)
    onSuccess: (response: any) => {
      if (isWindowReady) {
        console.log(Date.now().toString()); // Log the current timestamp
        alert(`Payment successful! Transaction ID: ${response.reference}`); // Notify the user of successful payment
        // Handle successful payment here
        console.log("Payment successful:", response); // Log the payment response
        router.push("/reva/viewdetails"); // Navigate to the details view page
      }
    },
    onClose: () => {
      if (isWindowReady) alert("Transaction was not completed."); // Notify the user if the transaction was closed without completion
    },
  };

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={["places"]}>
      {!showReview ? (
        <div className="mx-auto bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
          <h2 className="text-3xl font-extrabold text-blue-700 mb-4 text-center">
            REVA Due Diligence Request
          </h2>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requester Name
              </label>
              <Input
                type="text"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Address
              </label>
              <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter the property address"
                />
              </Autocomplete>
            </div>

            <GoogleMap
              mapContainerStyle={containerStyle}
              center={location || center}
              zoom={location ? 15 : 12}
            >
              {location && <Marker position={location} />}
            </GoogleMap>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (Lat, Lng)
              </label>
              <Input
                type="text"
                value={location ? `${location.lat}, ${location.lng}` : ""}
                disabled
                readOnly
                placeholder="Auto-generated location"
              />
            </div>
            <Button
              onClick={() => setShowReview(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300"
            >
              Proceed to Review
            </Button>
          </form>
        </div>
      ) : (
        <div className="mx-auto bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Review Your Details
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">Total Cost:</span>
              <span className="text-gray-800 font-semibold">
                NGN {totalCost}
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {typeof window !== "undefined" ? (
              <PaystackButton
                className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 text-center font-semibold"
                text="Confirm & Pay"
                {...paystackConfig}
              />
            ) : (
              ""
            )}

            <Button
              onClick={() => setShowReview(false)}
              className="w-full bg-gray-600 text-white py-3 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300"
            >
              Edit Details
            </Button>
          </div>
        </div>
      )}
    </LoadScript>
  );
};

export default RevaDueDiligenceForm;
