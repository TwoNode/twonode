"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect, Suspense } from "react";
import {
  useJsApiLoader,
  GoogleMap,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { revaApi } from "@/reva/apiClient";
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
import { DashboardLoadingSpinner } from "@/components/ui/loading-spinner";
import {
  MapPin,
  User,
  Mail,
  FileText,
  Camera,
  RotateCcw,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sparkles,
  Lock,
  Edit3,
  DollarSign,
  MessageSquare,
  Layers,
  Search,
} from "lucide-react";

const notifyError = (msg: string) => toast.error(msg);
const notifySuccess = (msg: string) => toast.success(msg);
const notifyWarning = (msg: string) => toast.warning(msg);
const notifyInfo = (msg: string) => toast.info(msg);

const containerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "15px",
};

const center = { lat: 6.5244, lng: 3.3792 };

const libraries: "places"[] = ["places"];

const watchTime = 30000;

const RevaDueDiligenceForm: React.FC = () => {
  const router = useRouter();
  const addrRef = useRef<HTMLInputElement>(null);
  const useMyLocationRef = useRef<HTMLButtonElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const siteImagesRef = useRef<HTMLInputElement>(null);

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

  const [fileNames, setFileNames] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [showConfirmFallback, setShowConfirmFallback] = useState(false);
  const [fallbackPosition, setFallbackPosition] = useState<any>(null);
  const [openPrivacyModal, setOpenPrivacyModal] = useState(false);
  const [hasAcceptedPrivacyTerms, setHasAcceptedPrivacyTerms] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedSiteImages, setSelectedSiteImages] = useState<FileList | null>(
    null
  );
  const [siteImageNames, setSiteImageNames] = useState<string[]>([]);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocationFromGPS, setIsLocationFromGPS] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

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
    setParcelId("-");
    setTotalCost(0);
    setSelectedFiles(null);
    setFileNames([]);
    setSelectedSiteImages(null);
    setSiteImageNames([]);
    setLocationAccuracy(null);
    setIsLocationFromGPS(false);
    if (filesRef.current) {
      filesRef.current.value = "";
    }
    if (siteImagesRef.current) {
      siteImagesRef.current.value = "";
    }
    enableUseMyLocationButton();
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (mapRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(12);
    }
    if (lgaBoundaryRef.current) {
      lgaBoundaryRef.current.setMap(null);
    }
    if (parcelBoundaryRef.current) {
      parcelBoundaryRef.current.setMap(null);
    }
    setLocationButtonText("Use My Location");
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
      // const url = `https://services7.arcgis.com/TAQqukrwbbGDP0ax/arcgis/rest/services/LGA_Minna/FeatureServer/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=LGA,Price&returnGeometry=true&f=json`;
      const url = `https://services7.arcgis.com/TAQqukrwbbGDP0ax/arcgis/rest/services/LGA_4326/FeatureServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=LGA,Price&returnGeometry=true&f=json`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        // console.log("LGA Geometry:", feature.geometry);
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
        // console.log("No parcel found.");
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
    // Reset GPS location flags when manually clicking on map
    setIsLocationFromGPS(false);
    setLocationAccuracy(null);
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

    // notifyWarning(`${platform} - ${browser.getOSName()}`);

    setLocationButtonText("Locating...");
    locationBtn?.setAttribute("disabled", "true");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        setLocationAccuracy(accuracy);
        setIsLocationFromGPS(true);

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
              const accuracy = position.coords.accuracy;
              setLocationAccuracy(accuracy);
              setIsLocationFromGPS(true);

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
      setLocationAccuracy(accuracy);
      setIsLocationFromGPS(true);

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

  const handleSiteImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length !== files.length) {
        notifyError("Please select only image files for site images");
        e.target.value = "";
        return;
      }

      setSelectedSiteImages(e.target.files); // Store site images in state
      const siteImageNames = imageFiles.map((file) => file.name);
      setSiteImageNames(siteImageNames);
    } else {
      notifyError("No site images selected");
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

    // Check location accuracy if using GPS
    if (isLocationFromGPS && locationAccuracy !== null) {
      const browser = Bowser.getParser(window.navigator.userAgent);
      const platform = browser.getPlatformType();
      let maxAccuracy = 7;

      if (platform === "mobile" && browser.getOSName() === "iOS") {
        maxAccuracy = 10;
      } else if (platform === "mobile" && browser.getOSName() === "Android") {
        maxAccuracy = 5;
      }

      if (locationAccuracy > maxAccuracy) {
        notifyError(
          `Location accuracy (${locationAccuracy}m) is too low. Please use a more accurate location or enter the address manually.`
        );
        return false;
      }
    }

    // Make site images compulsory only if using GPS location
    if (isLocationFromGPS && siteImageNames.length === 0) {
      notifyError(
        "At least one site image is required when using GPS location"
      );
      return false;
    }

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

    const siteImages = selectedSiteImages;
    if (siteImages) {
      for (let i = 0; i < siteImages.length; i++) {
        formData.append("site_images", siteImages[i]);
      }
    }

    // console.log("Form submitted with values:", {
    //   email,
    //   requester,
    //   address,
    //   location,
    //   lga,
    //   totalCost,
    //   fileNames,
    //   files,
    //   comments,
    //   parcelId,
    // });

    // console.log(formData);

    revaApi.oneTimeProperties
      .submit(formData)
      .then(async (result) => {
        if (!result.success) {
          notifyError(result.error || "Error saving form data");
          throw new Error(result.error);
        }

        notifySuccess("Form data saved successfully!");
        notifyInfo("Opening payment popup...");

        // Use Paystack popup instead of redirect
        const accessCode = result.data.paystack?.access_code;
        const reference = result.data.property?.reference;

        if (accessCode && reference) {
          const PaystackPop = (await import("@paystack/inline-js")).default;
          const popup = new (PaystackPop as any)();

          // Define your callbacks object
          const callbacks = {
            onSuccess: async (response: {
              id: number;
              reference: string;
              message: string;
            }) => {
              console.log("Payment successful:", response);
              notifySuccess("Payment successful! Verifying transaction...");

              try {
                setIsLoading(true);
                const verifyResult = await revaApi.payments.verifyOneTime(
                  response.reference
                );

                if (verifyResult.success) {
                  notifySuccess("Payment verified successfully!");
                  // Redirect to verify payment page
                  router.push(
                    `/reva/verifypayment?reference=${response.reference}`
                  );
                } else {
                  notifyError(
                    "Payment verification failed: " + verifyResult.error
                  );
                }
              } catch (error) {
                console.error("Error verifying payment:", error);
                notifyError("Error verifying payment. Please contact support.");
              } finally {
                setIsLoading(false);
              }
            },

            onCancel: () => {
              notifyWarning("Payment was cancelled.");
            },

            onError: (error: { message: string }) => {
              console.error("Payment error:", error);
              notifyError("Payment failed: " + error.message);
            },

            onLoad: (data: {
              id: number;
              customer: any;
              accessCode: string;
            }) => {
              console.log("Payment popup loaded:", data);
            },
          };

          // Resume the transaction with the access code and callbacks
          popup.resumeTransaction(accessCode, callbacks);
        } else {
          notifyError("Invalid payment response from server.");
        }
      })
      .catch((error) => {
        // console.error("Error saving form data:", error);
        // console.warn(JSON.stringify(error));
        if (error?.message && error?.message.length < 35) {
          notifyError(error.message || "Error saving form data");
        } else {
          notifyError("An error occured while processing, please try again");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (!isLoaded) {
    // Show a loading spinner while waiting for the Google Maps script
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );
  }

  return (
    <>
      <PrivacyPolicyModal
        open={openPrivacyModal}
        setOpen={setOpenPrivacyModal}
      />

      {isLoading && (
        <>
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-999">
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

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {!showReview ? (
          <div>
            {/* Kicker & Title Header */}
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-950/70 border border-cyan-500/20 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold mb-4 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Executive Geospatial Due Diligence</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Request a Structured{" "}
                <span className="bg-linear-to-r from-blue-600 via-cyan-600 to-sky-500 dark:from-cyan-400 dark:via-sky-300 dark:to-blue-400 bg-clip-text text-transparent">
                  Land Audit
                </span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Enter your property location, upload boundary survey documents,
                and receive a verified cadastral due diligence finding delivered
                digitally.
              </p>
            </div>

            <form
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              encType="multipart/form-data"
              onSubmit={handleSubmit}
            >
              {/* LEFT COLUMN: Form Inputs (7 cols on lg) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Requester Identity */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/20 rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-xl">
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Requester Identification
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Official contact details for report delivery and status
                        alerts
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Requester Name{" "}
                        <span className="text-blue-600 dark:text-cyan-400">
                          *
                        </span>
                      </label>
                      <Input
                        type="text"
                        value={requester}
                        onChange={(e) => setRequester(e.target.value)}
                        placeholder="e.g. Adebayo Ogunlesi"
                        className="h-11 bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Email Address{" "}
                        <span className="text-blue-600 dark:text-cyan-400">
                          *
                        </span>
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
                          } else if (
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                          ) {
                            notifyError("Invalid email format");
                          }
                        }}
                        placeholder="name@example.com"
                        className="h-11 bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Property Location & Geocoding */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/20 rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-xl">
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Property Address & Cadastral Geocoding
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Search address or pinpoint coordinates on the map
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Property Address or Landmark{" "}
                        <span className="text-blue-600 dark:text-cyan-400">
                          *
                        </span>
                      </label>
                      <Autocomplete
                        onLoad={onLoad}
                        onPlaceChanged={onPlaceChanged}
                      >
                        <Input
                          id="address"
                          type="text"
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Type street name, estate, or area..."
                          ref={addrRef}
                          className="h-11 bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm"
                          required
                        />
                      </Autocomplete>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
                      <Button
                        type="button"
                        onClick={useMyLocation}
                        ref={useMyLocationRef}
                        className="h-10 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                      >
                        <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>{locationButtonText}</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={clearAddress}
                        variant="outline"
                        className="h-10 bg-slate-100 dark:bg-slate-950/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Address</span>
                      </Button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      💡{" "}
                      <strong className="text-slate-700 dark:text-slate-300">
                        Tip:
                      </strong>{" "}
                      If the property is in a newly opened layout or lacks an
                      official street name, tap{" "}
                      <span className="text-cyan-700 dark:text-cyan-300 font-semibold">
                        &apos;Use My Location&apos;
                      </span>{" "}
                      while at the parcel, or click directly on the interactive
                      map to drop a pinpoint.
                    </p>
                  </div>
                </div>

                {/* 3. Supporting Documents & Site Images */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/20 rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-xl space-y-6">
                  <div className="flex items-center gap-3 mb-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Supporting Documents & Evidence
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Upload surveyor plan, title deeds, and on-site photos
                      </p>
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Survey Plan / Title Deeds{" "}
                        <span className="text-blue-600 dark:text-cyan-400">
                          *
                        </span>
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {fileNames.length} file(s) selected
                      </span>
                    </div>
                    <Input
                      type="file"
                      multiple
                      required
                      onChange={handleFileChange}
                      ref={filesRef}
                      className="h-11 bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-xs cursor-pointer file:bg-cyan-100 dark:file:bg-cyan-950/70 file:text-cyan-800 dark:file:text-cyan-300 file:border-cyan-300 dark:file:border-cyan-500/30 file:rounded-lg file:mr-3 file:text-xs"
                    />
                    {fileNames.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 max-h-28 overflow-y-auto">
                        {fileNames.map((name, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 text-[11px] text-cyan-800 dark:text-cyan-200 truncate max-w-xs"
                          >
                            <FileCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span className="truncate">{name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Site Images */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Site Images{" "}
                        <span className="text-blue-600 dark:text-cyan-400">
                          *
                        </span>
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {siteImageNames.length} image(s) selected
                      </span>
                    </div>
                    <Input
                      type="file"
                      multiple
                      required
                      onChange={handleSiteImagesChange}
                      ref={siteImagesRef}
                      accept="image/*"
                      className="h-11 bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-xs cursor-pointer file:bg-cyan-100 dark:file:bg-cyan-950/70 file:text-cyan-800 dark:file:text-cyan-300 file:border-cyan-300 dark:file:border-cyan-500/30 file:rounded-lg file:mr-3 file:text-xs"
                    />
                    {siteImageNames.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 max-h-28 overflow-y-auto">
                        {siteImageNames.map((name, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/30 text-[11px] text-blue-800 dark:text-blue-200 truncate max-w-xs"
                          >
                            <Camera className="w-3 h-3 text-blue-600 dark:text-cyan-400 shrink-0" />
                            <span className="truncate">{name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Comments */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/20 rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-xl">
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Special Instructions or Beacon Notes
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Optional notes for our spatial audit team
                      </p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Enter details regarding beacon numbers, known access corridors, seller claims, or specific encumbrance checks..."
                    onChange={(e) => setComments(e.target.value)}
                    value={comments}
                    className="bg-slate-50 dark:bg-slate-950/70 border-slate-300 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-cyan-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm min-h-22.5"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Map & Cadastral Intelligence (5 cols on lg, sticky) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                {/* Interactive Map Viewport Card */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/25 rounded-2xl p-5 shadow-xl shadow-slate-200/50 dark:shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Cadastral Viewport
                      </h3>
                    </div>
                    <span className="text-[11px] text-cyan-600 dark:text-cyan-300 font-mono font-semibold">
                      {location
                        ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(
                            4
                          )}`
                        : "Click map to pin"}
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-inner">
                    <GoogleMap
                      mapContainerStyle={{
                        width: "100%",
                        height: "320px",
                        borderRadius: "12px",
                      }}
                      center={location || center}
                      zoom={location ? 18 : 12}
                      onLoad={(map) => {
                        mapRef.current = map;
                        if (location) map.setCenter(location);
                      }}
                      onClick={handleMapClick}
                    >
                      {location && <Marker position={location} />}
                    </GoogleMap>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    🎯 Tap anywhere on the map to pin exact parcel centroid
                  </p>

                  {isLocationFromGPS && locationAccuracy !== null && (
                    <div
                      className={`mt-2.5 p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        locationAccuracy <= 10
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      <span>
                        GPS Accuracy: <strong>±{locationAccuracy}m</strong>
                      </span>
                      {locationAccuracy > 10 && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                          ⚠️ Low accuracy
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cadastral Intelligence & Pricing Panel */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/25 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                    Cadastral Audit Summary
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">
                        LGA Jurisdiction
                      </span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-300 text-sm mt-0.5 block truncate">
                        {lga}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">
                        Parcel ID
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block truncate">
                        {parcelId}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Due Diligence Audit Fee
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Calculated by LGA schedule
                      </span>
                    </div>
                    <span className="text-2xl font-black text-transparent bg-linear-to-r from-blue-600 to-cyan-500 dark:from-cyan-300 dark:to-blue-400 bg-clip-text">
                      {totalCost.toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      })}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleReview}
                    className="w-full h-12 rounded-xl bg-linear-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      Encrypted Checkout
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      Paystack Verified
                    </span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* REVIEW MODE: Executive Dossier Confirmation */
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/30 rounded-2xl p-6 sm:p-10 shadow-2xl">
            <div className="text-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-semibold mb-3">
                <FileCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Step 2 of 2: Order Dossier & Payment</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Review Your Request Details
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Please verify all cadastral parameters and requester information
                before proceeding to secure payment.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Requester Name:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {requester}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Email Address:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-start gap-4">
                <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  Property Address:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {address}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">
                    LGA Jurisdiction
                  </span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-300 text-sm mt-0.5 block">
                    {lga}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] uppercase tracking-wider">
                    Parcel Identifier
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                    {parcelId}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Coordinates:
                </span>
                <span className="font-mono text-cyan-600 dark:text-cyan-300 text-xs font-semibold">
                  {location
                    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                    : "Not set"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-start gap-4">
                <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  Supporting Files:
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200 text-right">
                  {fileNames.length} document(s) attached
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-start gap-4">
                <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  Site Images:
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200 text-right">
                  {siteImageNames.length} photo(s) attached
                </span>
              </div>

              {comments && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-xs font-medium mb-1">
                    Reviewer Instructions:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    {comments}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Total Due Diligence Fee:
                </span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-300">
                  {totalCost.toLocaleString("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  })}
                </span>
              </div>
            </div>

            {/* Privacy Agreement */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcceptedPrivacyTerms}
                  onChange={(e) =>
                    setHasAcceptedPrivacyTerms(!hasAcceptedPrivacyTerms)
                  }
                  required
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 focus:ring-cyan-400 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  I have read and agreed to the{" "}
                  <Link
                    href="#"
                    className="text-blue-600 dark:text-cyan-400 hover:underline font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenPrivacyModal(!openPrivacyModal);
                    }}
                  >
                    Terms of Use and Privacy Policy
                  </Link>
                  . I understand that due diligence findings are compiled based
                  on statutory cadastral records.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full h-12 bg-linear-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-base rounded-xl shadow-xl shadow-cyan-500/25 transition-all cursor-pointer">
                    Confirm & Proceed to Payment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-500/30 text-slate-800 dark:text-slate-100">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-slate-900 dark:text-white text-lg font-bold">
                      Proceed to Secure Paystack Checkout?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm">
                      Please confirm all property parameters and contact details
                      are accurate before completing your transaction.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700">
                      Cancel
                    </AlertDialogCancel>
                    <div onClick={handleSubmit}>
                      <AlertDialogAction className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
                        Continue to Payment
                      </AlertDialogAction>
                    </div>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                type="button"
                onClick={handleEdit}
                variant="outline"
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/80 font-medium rounded-xl text-sm transition-all cursor-pointer"
              >
                ← Edit Details
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
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
        <DialogContent className="max-w-4xl bg-slate-900 border border-cyan-500/30 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-white text-center">
              Privacy Policy & Terms and Conditions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-slate-300 overflow-y-auto max-h-[70vh] pr-2">
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
                <li>Improve our platform's accuracy and efficiency.</li>
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
