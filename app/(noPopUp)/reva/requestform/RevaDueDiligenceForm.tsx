"use client";

import React, { useState, useRef, useEffect, ReactNode, use } from "react";
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
import { toast } from "react-toastify";
import { saveFormDataAndInitiatePaystack } from "../actions/dbActions";
import Bowser from "bowser";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import Link from "next/link";
import { removeIdPrefix } from "@/utils/removeIDFromParcel";

const notifyError = (msg: string) => toast.error(msg);
const notifySuccess = (msg: string) => toast.success(msg);
const notifyWarning = (msg: string) => toast.warn(msg);
const notifyInfo = (msg: string) => toast.info(msg);
const notifyLoading = (msg: string) => toast.loading(msg);
const notifyUpdate = (msg: string) => toast.update(msg);
const notifyDismiss = (id: string) => toast.dismiss(id);
const notifyClearWaitingQueue = () => toast.clearWaitingQueue();
const notifyIsActive = (id: string) => toast.isActive(id);
const notifyErrorWithId = (id: string, msg: string) =>
  toast.error(msg, { toastId: id });

// import dynamic from "next/dynamic";
// const usePaystackPayment = dynamic(
//   () => import("react-paystack").then((mod) => mod.usePaystackPayment),
//   { ssr: false } // This ensures it's only loaded on the client
// );

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

const watchTime = 30000;

const RevaDueDiligenceForm: React.FC = () => {
  const addrRef = useRef<HTMLInputElement>(null);
  const useMyLocationRef = useRef<HTMLButtonElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  // Adding missing refs for map, marker, lgaBoundary, parcelBoundary, and watchId
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const lgaBoundaryRef = useRef<google.maps.Polygon | null>(null);
  const parcelBoundaryRef = useRef<google.maps.Polygon | null>(null);
  const watchIdRef = useRef(0);

  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [locationButtonText, setLocationButtonText] =
    useState("Use My Location");

  const [parcelId, setParcelId] = useState("-");

  const [email, setEmail] = useState("");
  const [requester, setRequester] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [lga, setLga] = useState("Unknown");
  const [totalCost, setTotalCost] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [showConfirmFallback, setShowConfirmFallback] = useState(false);
  const [fallbackPosition, setFallbackPosition] = useState<any>(null);
  const [openPrivacyModal, setOpenPrivacyModal] = useState(false);
  const [hasAcceptedPrivacyTerms, setHasAcceptedPrivacyTerms] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  useEffect(() => {
    setGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
    setPaystackPublicKey(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "");
  }, []);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const clearAddress = () => {
    if (addrRef.current) {
      addrRef.current.value = "";
    }
    setAddress("");
    setLocation(null);
    setLga("Unknown");
    enableUseMyLocationButton();
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (mapRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(12);
    }
    setTotalCost(0);
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLocation({ lat, lng });
        fetchLGA(lat, lng);
        fetchParcel(lat, lng);
      }
    }
  };

  const fetchLGA = async (lat: number, lng: number) => {
    try {
      const url = `https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/1/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=LGA,Price&returnGeometry=true&f=json`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        console.log("LGA Geometry:", feature.geometry);
        const lga = feature.attributes.LGA?.toUpperCase() || "UNKNOWN";
        const price = feature.attributes.Price || 0;
        setLga(lga);
        setTotalCost(price);
        drawLGABoundary(feature.geometry);
      } else {
        alert("No LGA found for this location.");
        clearLGABoundary();
      }
    } catch (err) {
      console.error("LGA Fetch Error:", err);
      alert("Could not fetch LGA data.");
      clearLGABoundary();
    }
  };

  const drawLGABoundary = (geometry: any) => {
    clearLGABoundary();
    if (!geometry || !geometry.rings) return;
    const polygonCoords = geometry.rings.map((ring: any) =>
      ring.map((coord: any) => ({ lat: coord[1], lng: coord[0] }))
    );

    const lgaBoundary = new google.maps.Polygon({
      paths: polygonCoords,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#93c5fd",
      fillOpacity: 0.35,
      map: mapRef.current!,
    });

    lgaBoundary.setMap(mapRef.current!);
    lgaBoundaryRef.current = lgaBoundary;
  };

  const clearLGABoundary = () => {
    if (lgaBoundaryRef.current) {
      lgaBoundaryRef.current.setMap(null);
      lgaBoundaryRef.current = null;
    }
  };

  const fetchParcel = async (lat: number, lng: number) => {
    try {
      const url = `https://services5.arcgis.com/DQqY3pyPVyNe3HvS/arcgis/rest/services/Parcels2009_gdb/FeatureServer/0/query?where=1=1&geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&f=json`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        // console.log("Parcel Geometry:", feature);
        setParcelId(removeIdPrefix(feature.attributes.ParcelID || "N/A"));
        drawParcelBoundary(feature.geometry);
      } else {
        clearParcelBoundary();
        console.log("No parcel found.");
      }
    } catch (error) {
      console.error("Error fetching parcel:", error);
    }
  };

  const drawParcelBoundary = (geometry: any) => {
    clearParcelBoundary();
    if (!geometry || !geometry.rings) return;
    const polygonCoords = geometry.rings.map((ring: any) =>
      ring.map((coord: any) => ({ lat: coord[1], lng: coord[0] }))
    );

    const parcelBoundary = new google.maps.Polygon({
      paths: polygonCoords,
      strokeColor: "#10b981",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#6ee7b7",
      fillOpacity: 0.4,
      map: mapRef.current!,
    });

    parcelBoundary.setMap(mapRef.current!);
    parcelBoundaryRef.current = parcelBoundary;
  };

  const clearParcelBoundary = () => {
    if (parcelBoundaryRef.current) {
      parcelBoundaryRef.current.setMap(null);
      parcelBoundaryRef.current = null;
    }
  };

  const placeMarker = (latLng: google.maps.LatLng) => {
    const position = {
      lat: latLng.lat(),
      lng: latLng.lng(),
    };

    if (mapRef.current) mapRef.current.setCenter(position);

    if (markerRef?.current) {
      markerRef.current.setMap(null);
    }
    const newMarker = new google.maps.Marker({
      position: latLng,
      map: mapRef.current!,
    });

    markerRef.current = newMarker;

    // Place the new marker
    if (markerRef?.current) {
      markerRef.current.setMap(mapRef.current);
    }

    setLocation(position); // Update the location state
  };

  const getLGA = (lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results.length > 0) {
        const lgaResult = results.find((r) =>
          r.types.includes("administrative_area_level_2")
        );
        const lgaName = lgaResult ? lgaResult.formatted_address : "Unknown";
        setLga(lgaName);
      }
    });
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const latLng = event.latLng;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      fetchLGA(lat, lng);
      fetchParcel(lat, lng);

      getLGA(lat, lng);
      placeMarker(latLng);

      if (mapRef.current) {
        mapRef.current.setCenter(latLng);
        mapRef.current.setZoom(18);
      }

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          const formattedAddress = results[0].formatted_address;
          setAddress(formattedAddress);
          alert(
            `Address: ${formattedAddress}\nLGA: ${lga}\nLocation: ${lat}, ${lng}`
          );
          addrRef.current!.value = formattedAddress;
        } else {
          console.error("Geocoder failed due to: " + status);
        }
      });
    }
    disableUseMyLocationButton();
  };

  const disableUseMyLocationButton = () => {
    useMyLocationRef.current?.setAttribute("disabled", "true"); // Disable the button
    addrRef.current?.setAttribute("disabled", "true"); // Disable the address input
    useMyLocationRef.current?.classList.add("opacity-50", "cursor-not-allowed");
  };

  const enableUseMyLocationButton = () => {
    useMyLocationRef.current?.removeAttribute("disabled"); // Enable the button
    addrRef.current?.removeAttribute("disabled"); // Enable the button
    useMyLocationRef.current?.classList.remove(
      "opacity-50",
      "cursor-not-allowed"
    );
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    const locationBtn = useMyLocationRef.current;
    const browser = Bowser.getParser(window.navigator.userAgent);
    const platform = browser.getPlatformType();
    let accuracyMax = 7;

    if (platform === "mobile" && browser.getOSName() === "iOS") {
      accuracyMax = 11;
    } else if (platform === "mobile" && browser.getOSName() === "Android") {
      accuracyMax = 5;
    }

    notifyWarning(platform);

    setLocationButtonText("Locating...");
    locationBtn?.setAttribute("disabled", "true");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;

        if (accuracy <= accuracyMax) {
          navigator.geolocation.clearWatch(watchIdRef.current);

          const latlng = new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          placeMarker(latlng);
          fetchLGA(latlng.lat(), latlng.lng());
          fetchParcel(latlng.lat(), latlng.lng());

          if (mapRef.current) {
            mapRef.current.setCenter(latlng);
            mapRef.current.setZoom(18);
          }

          disableUseMyLocationButton();
          setLocationButtonText("Location Set ✅");
        } else {
          setFallbackPosition(position);
          setShowConfirmFallback(true);
        }
      },
      (error) => {
        navigator.geolocation.clearWatch(watchIdRef.current);
        locationBtn?.removeAttribute("disabled");
        setLocationButtonText("Use My Location");

        if (error.code === error.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const latlng = new google.maps.LatLng(
                position.coords.latitude,
                position.coords.longitude
              );
              placeMarker(latlng);
              fetchLGA(latlng.lat(), latlng.lng());
              fetchParcel(latlng.lat(), latlng.lng());

              if (mapRef.current) {
                mapRef.current.setCenter(latlng);
                mapRef.current.setZoom(18);
              }

              disableUseMyLocationButton();
              setLocationButtonText("Location Set ✅");
            },
            (fallbackError) => {
              console.error("Fallback geolocation failed:", fallbackError);
              alert(
                "Could not retrieve location. Please enter the address manually."
              );
            },
            {
              enableHighAccuracy: false,
              maximumAge: 0,
              timeout: watchTime,
            }
          );
        } else {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              alert("Permission denied. Please allow location access.");
              break;
            case error.TIMEOUT:
              alert("Location request timed out.");
              break;
            default:
              alert("An unknown error occurred.");
          }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: (watchTime * 3) / 2,
      }
    );
  };

  const handleUseMyLocationFallback = (fallback = true) => {
    if (fallback) {
      const accuracy = fallbackPosition.coords.accuracy;

      if (!fallbackPosition) return;
      navigator.geolocation.clearWatch(watchIdRef.current);

      const latlng = new google.maps.LatLng(
        fallbackPosition.coords.latitude,
        fallbackPosition.coords.longitude
      );

      placeMarker(latlng);
      fetchLGA(latlng.lat(), latlng.lng());
      fetchParcel(latlng.lat(), latlng.lng());

      if (mapRef.current) {
        mapRef.current.setCenter(latlng);
        mapRef.current.setZoom(18);
      }

      disableUseMyLocationButton();
      setLocationButtonText("Location Set ✅");
      setShowConfirmFallback(false);

      notifyWarning(`Location Set with ${accuracy} accuracy`);
    } else {
      setShowConfirmFallback(false);
      navigator.geolocation.clearWatch(watchIdRef.current);
      enableUseMyLocationButton();
      setLocationButtonText("Use My Location");

      notifyWarning("Please try again or enter the address manually.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files); // Store files in state
      const fileNames = Array.from(e.target.files).map((file) => file.name);
      setFileNames(fileNames);
    } else {
      notifyError("No files selected");
    }
  };

  const verifyAllFields = () => {
    if (!email) {
      notifyError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyError("Invalid email format");
      return false;
    }
    if (!requester) {
      notifyError("Requester name is required");
      return false;
    }
    // if (!address) {
    //   notifyError("Property address is required");
    //   return false;
    // }
    if (!location) {
      notifyError("Location is required");
      return false;
    }
    if (!lga) {
      notifyError("LGA is required");
      return false;
    }
    if (totalCost <= 0) {
      notifyError("Total cost must be greater than 0");
      return false;
    }
    // if (fileNames.length === 0) {
    //   setError("At least one supporting document is required");
    //   return false;
    // }

    return true;
  };

  const handleReview = () => {
    if (!verifyAllFields()) {
      return;
    }
    setShowReview(true);
  };

  const handleEdit = () => {
    setShowReview(false);
  };

  interface SaveFormResponse {
    data: {
      reference: string;
    };
    paystack: object;
    status: number;
    success: boolean;
    message: string;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verifyAllFields()) {
      return;
    }

    if (!hasAcceptedPrivacyTerms) {
      notifyError(
        "Please Read and Agree to the Terms of Use and Privacy and Policy."
      );
      return;
    }

    setIsLoading(true);

    // Handle form submission logic here

    const formData = new FormData();
    formData.append("email", email);
    formData.append("requester", requester);
    formData.append("address", address);
    formData.append("location", JSON.stringify(location));
    formData.append("lga", lga);
    formData.append("totalCost", totalCost.toString());
    formData.append("comments", comments);
    formData.append("parcelId", parcelId);

    const files = selectedFiles;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
    }

    console.log("Form submitted with values:", {
      email,
      requester,
      address,
      location,
      lga,
      totalCost,
      fileNames,
      files,
      comments,
      parcelId,
    });

    console.log(formData);

    saveFormDataAndInitiatePaystack(formData)
      .then((response: SaveFormResponse | any) => {
        console.log("Form data saved successfully:", response);

        if (response.error) {
          notifyError("Error saving form data");
          throw new Error(response.error);
        }

        notifySuccess("Form data saved successfully!");

        if ("data" in response && response.data) {
        } else {
          console.error("Unexpected response format:", response);
        }
        notifyInfo("Redirecting to payment...");

        // redirect to paystack payment page with checkoutUrl

        const checkoutUrl = response?.paystack?.authorization_url;

        if (checkoutUrl) {
          // Redirect to Paystack hosted payment page
          window.location.href = checkoutUrl;
        }
      })
      .catch((error) => {
        console.error("Error saving form data:", error);
        console.warn(JSON.stringify(error));
        notifyError(error.message || "Error saving form data");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (!googleMapsApiKey) {
    // Show a loading spinner or message while waiting for the API key
    // and window object to be available

    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={["places"]}>
      <PrivacyPolicyModal
        open={openPrivacyModal}
        setOpen={setOpenPrivacyModal}
      />

      {isLoading && (
        <>
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
          </div>
        </>
      )}

      <AlertDialog
        open={showConfirmFallback}
        onOpenChange={setShowConfirmFallback}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Low Location Accuracy</AlertDialogTitle>
            <AlertDialogDescription>
              Accuracy of{" "}
              <b className="text-red-500 text-lg px-2">
                {" "}
                {fallbackPosition?.coords?.accuracy!}{" "}
              </b>{" "}
              is outside expected range. Do you want to use this location
              anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                handleUseMyLocationFallback(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleUseMyLocationFallback()}>
              Use Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!showReview ? (
        <div className="mx-auto bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
          <h2 className="text-3xl font-extrabold text-blue-700 mb-4 text-center">
            REVA Due Diligence Request
          </h2>

          <form
            className="space-y-6"
            encType="multipart/form-data"
            onSubmit={handleSubmit}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requester Name
              </label>
              <Input
                type="text"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>

              <Input
                type="email"
                autoComplete="on"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  if (!email) {
                    notifyError("Email is required");
                    return false;
                  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    notifyError("Invalid email format");
                  }
                }}
                placeholder="Enter your email"
                required
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
                  // value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter the property address"
                  ref={addrRef}
                  required
                />
              </Autocomplete>

              <p
                className="info-text text-sm font-light p-1"
                style={{ lineHeight: "12px" }}
              >
                if address isn't available and you're at the property, tap{" "}
                <span className="inline-block py-1 px-1 mx-[2px] text-xs whitespace-nowrap bg-slate-100 rounded-sm">
                  Use My Location.
                </span>{" "}
                We'll use your accurate location.
              </p>

              <div className="flex gap-5 justify-between">
                <div className="mt-2">
                  <Button
                    onClick={useMyLocation}
                    ref={useMyLocationRef}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                  >
                    {locationButtonText}
                  </Button>
                </div>

                <Button
                  onClick={clearAddress}
                  className="mt-2 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
                >
                  Clear Address
                </Button>
              </div>
            </div>

            <GoogleMap
              mapContainerStyle={containerStyle}
              center={location || center}
              zoom={location ? 18 : 12}
              onLoad={(map) => {
                mapRef.current = map;
                if (location) {
                  map.setCenter(location);
                }
              }}
              onClick={handleMapClick}
            >
              {location && <Marker position={location} />}
            </GoogleMap>

            <div
              id="parcelInfo"
              className={`mt-5 p-4 border rounded-lg ${
                location ? "bg-green-50 border-green-200" : "hidden"
              }`}
            >
              <h3 className="mb-2 text-lg font-semibold text-green-700">
                Parcel Information
              </h3>
              <p className="text-sm text-gray-700">
                <strong>Parcel ID:</strong>{" "}
                <span id="parcelId" className="text-gray-900">
                  {location ? parcelId : "-"}
                </span>
              </p>
            </div>

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
                required
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
                placeholder="Auto-generated LGA"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supporting Documents
              </label>
              <Input
                type="file"
                multiple
                required
                onChange={handleFileChange}
                ref={filesRef}
                // accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="mb-2"
              />

              {fileNames.length > 0 && (
                <div className="p-1 flex flex-col max-w-full border border-blue-100 overflow-x-hidden">
                  {fileNames.map((name, index) => (
                    <p
                      key={index}
                      className="text-sm text-blue-600 text-ellipsis"
                    >
                      {name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Comments
              </label>
              <Textarea
                placeholder="Enter any additional comments"
                onChange={(e) => setComments(e.target.value)}
                value={comments}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost (NGN)
              </label>
              <Input
                type="text"
                value={totalCost.toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
                disabled
                readOnly
                placeholder="Auto-calculated total cost"
                required
              />
            </div>

            <Button
              onClick={handleReview}
              type="button"
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
              <span className="text-gray-600 font-medium">Email:</span>
              <span className="text-gray-800 font-semibold">{email}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">Requester Name:</span>
              <span className="text-gray-800 font-semibold">{requester}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">
                Property Address:
              </span>
              <span className="text-gray-800 font-semibold">{address}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">Location:</span>
              <span className="text-gray-800 font-semibold">
                {location ? `${location.lat}, ${location.lng}` : "Not set"}
              </span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">Parcel ID:</span>
              <span className="text-gray-800 font-semibold">{parcelId}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">LGA:</span>
              <span className="text-gray-800 font-semibold">{lga}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-2 gap-2">
              <span className="text-gray-600 font-medium">Files:</span>
              <div className="text-gray-800 font-semibold overflow-hidden">
                <div className="flex flex-col">
                  {fileNames.map((name, index) => (
                    <span
                      key={index}
                      className="text-gray-800 font-semibold text-ellipsis border-b-2 border-gray-200"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600 font-medium">Total Cost:</span>
              <span className="font-semibold text-xl text-blue-600">
                {totalCost.toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                })}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasAcceptedPrivacyTerms}
                onChange={(e) =>
                  setHasAcceptedPrivacyTerms(!hasAcceptedPrivacyTerms)
                }
                required
                className="form-checkbox h-5 w-5 text-blue-600"
              />

              <span className="text-sm text-gray-700 justify-normal">
                I have read and agreed to the{" "}
                <Link
                  href="#"
                  className="text-blue-600 underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenPrivacyModal(!openPrivacyModal);
                  }}
                >
                  Terms of Use and Privacy and Policy.
                </Link>{" "}
              </span>
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <AlertDialog>
              <AlertDialogTrigger className="w-full">
                <Button className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 text-center font-semibold">
                  Confirm & Pay
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to proceed?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Please confirm that all the details you provided are correct
                    before proceeding to payment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <div onClick={handleSubmit}>
                    <AlertDialogAction className="bg-blue-600 w-full">
                      Continue
                    </AlertDialogAction>
                  </div>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleEdit}
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

const PrivacyPolicyModal = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  return (
    <div className="mt-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-extrabold text-blue-700 text-center">
              Privacy Policy & Terms and Conditions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-gray-700 overflow-y-auto max-h-[70vh]">
            {/* --- Privacy Policy --- */}
            <section>
              <h2 className="text-2xl font-bold mb-2">Privacy Policy</h2>
              <h3 className="text-xl font-bold mb-2">1. Introduction</h3>
              <p>
                REVA ("we," "us," or "our") (by TwoNode Technologies) is
                committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, and safeguard your information
                when you use our platform for real estate due diligence reports.
              </p>
              <h3 className="text-xl font-bold mb-2">
                2. Information We Collect
              </h3>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Personal Information:</strong> Name, email address,
                  and payment details when you request a report.
                </li>
                <li>
                  <strong>Property Information:</strong> Property address and
                  details provided by users for due diligence checks.
                </li>
                <li>
                  <strong>Automatically Collected Information:</strong> Device
                  and usage data, including IP addresses and geolocation data
                  when enabled.
                </li>
              </ul>
              <p>
                We do not sell, trade, or misuse your information. We may share
                necessary data with trusted partners, such as payment processors
                (e.g., Paystack) or government agencies, strictly for service
                delivery and compliance purposes.
              </p>
              <h3 className="text-xl font-bold mb-2">
                3. How We Use Your Information
              </h3>
              <ul className="list-disc pl-5">
                <li>
                  Provide real estate due diligence reports based on available
                  records.
                </li>
                <li>Process payments and generate receipts.</li>
                <li>Improve our platform’s accuracy and efficiency.</li>
                <li>Comply with legal obligations and prevent fraud.</li>
              </ul>
              <h3 className="text-xl font-bold mb-2">
                4. Data Accuracy and Limitations
              </h3>
              <p>
                REVA relies on available data sources for due diligence reports.
                Absence of information in any of the four chapters of our report
                (Title Search, Historical Survey Records, Charting Information,
                and Land use) indicates that no records were found in our
                virtual search network at the time. This does not confirm their
                nonexistence in external sources.
              </p>
              <h3 className="text-xl font-bold mb-2">5. Data Security</h3>
              <p>
                We implement security measures to protect your data from
                unauthorized access, but cannot guarantee absolute security.
              </p>
              <h3 className="text-xl font-bold mb-2">
                6. Third-Party Services
              </h3>
              <p>
                We may share necessary data with payment processors and
                government agencies. We do not sell your personal data to third
                parties.
              </p>
              <h3 className="text-xl font-bold mb-2">
                7. Cookies? Yes, Please!
              </h3>
              <p>
                We use cookies to enhance user experience. You may disable
                cookies in your browser, but some features may not work
                properly.
              </p>
              <h3 className="text-xl font-bold mb-2">
                8. Updates to This Policy
              </h3>
              <p>
                We may update this Privacy Policy periodically. Users will be
                notified of significant changes via email or platform
                notifications.
              </p>
              <h3 className="text-xl font-bold mb-2">9. Contact Us</h3>
              <p>
                Contact us at{" "}
                <a
                  href="mailto:info@twonodetechnologies.com"
                  className="text-blue-600 underline"
                >
                  info@twonodetechnologies.com
                </a>
              </p>
            </section>

            {/* --- Terms and Conditions --- */}
            <section>
              <h2 className="text-2xl font-bold mt-10 mb-2">
                Terms and Conditions
              </h2>
              <h3 className="text-xl font-bold mb-2">1. Introduction</h3>
              <p>
                These Terms and Conditions govern your use of REVA. By accessing
                our platform, you agree to abide by these terms.
              </p>
              <h3 className="text-xl font-bold mb-2">2. Service Description</h3>
              <p>
                REVA provides real estate due diligence reports based on
                available records. Absence of information in a report does not
                confirm the nonexistence of such records in other sources.
              </p>
              <h3 className="text-xl font-bold mb-2">
                3. User Responsibilities
              </h3>
              <ul className="list-disc pl-5">
                <li>Provide accurate property details.</li>
                <li>
                  Acknowledge that reports are based on available data at
                  request time.
                </li>
                <li>No fraudulent use or misuse of the platform.</li>
                <li>No scraping, hacking, or unauthorized access.</li>
              </ul>
              <h3 className="text-xl font-bold mb-2">
                4. Limitation of Liability
              </h3>
              <p>
                Reports are based on third-party sources and may not be complete
                or fully accurate. Users must independently verify information.
                We are not liable for losses from reliance on reports.
              </p>
              <h3 className="text-xl font-bold mb-2">
                5. Payment and Refund Policy
              </h3>
              <ul className="list-disc pl-5">
                <li>Payments are processed via Paystack.</li>
                <li>You authorize charges to your payment method.</li>
                <li>
                  No refunds unless a report is undelivered due to technical
                  errors.
                </li>
              </ul>
              <h3 className="text-xl font-bold mb-2">6. Prohibited Conduct</h3>
              <ul className="list-disc pl-5">
                <li>Do not violate laws or regulations using the service.</li>
                <li>
                  No reverse-engineering or data scraping beyond permissions.
                </li>
                <li>No interference with platform security.</li>
                <li>
                  REVA content and software cannot be copied or distributed
                  without permission.
                </li>
              </ul>
              <h3 className="text-xl font-bold mb-2">
                7. Intellectual Property
              </h3>
              <p>All content belongs to REVA and is protected by IP laws.</p>
              <h3 className="text-xl font-bold mb-2">8. Updates to Terms</h3>
              <p>
                We may update these terms. Continued use implies acceptance of
                the updated terms.
              </p>
              <h3 className="text-xl font-bold mb-2">9. Contact Us</h3>
              <p>
                For inquiries, email us at{" "}
                <a
                  href="mailto:info@twonodetechnologies.com"
                  className="text-blue-600 underline"
                >
                  info@twonodetechnologies.com
                </a>
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
