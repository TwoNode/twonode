import React, { useState, useRef, useEffect } from "react";
import {
  LoadScript,
  GoogleMap,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";
import { PaystackButton } from "react-paystack";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RevaHeroSection } from "./RevaHeroSection";

const GOOGLE_MAPS_API_KEY = "AIzaSyCzhhoV6YJZc640ODPgDoz9dKTSXnYr0Gw";
const PAYSTACK_PUBLIC_KEY = "pk_test_9dab542d1bb550a1775463d8894ecd546901b678";

const containerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "15px",
};

const center = { lat: 6.5244, lng: 3.3792 };

const DueDiligenceForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [requester, setRequester] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [lga, setLga] = useState("Unknown");
  const [totalCost, setTotalCost] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

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

  const paystackConfig = {
    email,
    amount: totalCost * 100,
    currency: "NGN",
    publicKey: PAYSTACK_PUBLIC_KEY,
    onSuccess: (response: any) =>
      alert(`Payment successful! Transaction ID: ${response.reference}`),
    onClose: () => alert("Transaction was not completed."),
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      {!showReview ? (
        <div className="mx-auto bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-blue-700 mb-4">
              REVA Due Diligence Request
            </h2>
            <p className="text-lg text-gray-600 italic">
              "Your due diligence just got intelligent"
            </p>
          </div>

          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                  className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-generated location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Local Government Area (LGA)
              </label>
              <Input
                type="text"
                value={lga}
                disabled
                readOnly
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-generated LGA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Comments
              </label>
              <Textarea
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any additional comments here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost (NGN)
              </label>
              <Input
                type="number"
                value={totalCost}
                disabled
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-calculated cost"
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
        <>
          <div className="mx-auto bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Review Your Details
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600 font-medium">Email:</span>
                <span className="text-gray-800 font-semibold">{email}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600 font-medium">Requester:</span>
                <span className="text-gray-800 font-semibold">{requester}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600 font-medium">Address:</span>
                <span className="text-gray-800 font-semibold">{address}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600 font-medium">Location:</span>
                <span className="text-gray-800 font-semibold">
                  {location ? `${location.lat}, ${location.lng}` : ""}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600 font-medium">LGA:</span>
                <span className="text-gray-800 font-semibold">{lga}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600 font-medium">Total Cost:</span>
                <span className="text-gray-800 font-semibold">
                  NGN {totalCost}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <PaystackButton
                className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 text-center font-semibold"
                text="Confirm & Pay"
                {...paystackConfig}
              />
              <Button
                onClick={() => setShowReview(false)}
                className="w-full bg-gray-600 text-white py-3 rounded-lg shadow-lg hover:bg-gray-700 transition duration-300"
              >
                Edit Details
              </Button>
            </div>
          </div>
        </>
      )}
    </LoadScript>
  );
};

export default DueDiligenceForm;
