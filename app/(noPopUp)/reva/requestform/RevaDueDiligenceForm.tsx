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

const RevaDueDiligenceForm: React.FC = () => {
  const router = useRouter();
  const addrRef = useRef<HTMLInputElement>(null);
  const useMyLocationRef = useRef<HTMLButtonElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  // Adding missing refs for map and marker
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // State variables
  const [isLoading, setIsLoading] = useState(false);

  const [refrence, setReference] = useState("");

  const [isWindowReady, setIsWindowReady] = useState(false);
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
      getLGA(lat, lng);
      placeMarker(latLng);

      if (mapRef.current) {
        mapRef.current.setCenter(latLng);
        mapRef.current.setZoom(15);
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

  const handleMarkerDragEnd = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setLocation({ lat, lng });
      placeMarker(event.latLng);
      getLGA(lat, lng);
    }
  };

  const disableUseMyLocationButton = () => {
    useMyLocationRef.current?.setAttribute("disabled", "true"); // Disable the button
    addrRef.current?.setAttribute("disabled", "true"); // Disable the button
    useMyLocationRef.current?.classList.add("opacity-50", "cursor-not-allowed");
    // setTimeout(() => {
    //   enableLocationButton();
    // }
    // , 5000); // Re-enable after 5 seconds
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy; // Get accuracy in meters
          if (accuracy <= 5) {
            // Check if the accuracy is within 5 meters
            const currentLocation = new google.maps.LatLng(
              position.coords.latitude,
              position.coords.longitude
            );
            placeMarker(currentLocation);
          } else {
            alert(
              "Your GPS accuracy is above 5 meters. Please try again for a more accurate location or enter the address manually."
            );
          }
        },
        () => {
          alert("Geolocation failed. Please enter the address manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files) {
      const fileNames = Array.from(files).map((file) => file.name);
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

  // Configuration object for Paystack payment integration
  const paystackConfig: PaystackButtonProps = {
    email, // Email of the payer
    amount: totalCost * 100, // Total cost converted to kobo (Paystack uses the smallest currency unit)
    publicKey: paystackPublicKey, // Paystack public key
    reference: `REVA_${refrence}`, // Unique reference for the transaction
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
      console.log(Date.now().toString()); // Log the current timestamp
      alert(`Payment successful! Transaction ID: ${response.reference}`); // Notify the user of successful payment
      // Handle successful payment here
      console.log("Payment successful:", response); // Log the payment response
      router.push("/reva/viewdetails"); // Navigate to the details view page
    },
    onClose: () => {
      if (isWindowReady) alert("Transaction was not completed."); // Notify the user if the transaction was closed without completion
    },
  };

  // you can call this function anything
  const onPaystackSuccess = (reference: string) => {
    // Implementation for whatever you want to do with reference and after success call.
    console.log("Payment successful with reference:", reference);
    notifySuccess("Payment successful!");
  };

  // you can call this function anything
  const onPaystackClose = () => {
    // implementation for  whatever you want to do when the Paystack dialog closed.
    console.log("closed");
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
    setIsLoading(true);

    if (!verifyAllFields()) {
      setIsLoading(false);
      return;
    }

    const files = filesRef.current?.files;

    // Handle form submission logic here
    console.log("Form submitted with values:", {
      email,
      requester,
      address,
      location,
      lga,
      totalCost,
      fileNames,
      comments,
    });

    saveFormDataAndInitiatePaystack({
      email,
      requester,
      address,
      location,
      lga,
      totalCost,
      files,
      comments,
    })
      .then((response: SaveFormResponse | any) => {
        console.log("Form data saved successfully:", response);

        if (response.error) {
          notifyError("Error saving form data");
          throw new Error(response.error);
        }

        notifySuccess("Form data saved successfully!");

        if ("data" in response && response.data) {
          setReference(response?.data?.reference!);
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

        // initializePayment({
        //   onSuccess: onPaystackSuccess,
        //   onClose: onPaystackClose,
        // });

        // setShowReview(true); // Show the review section
        // // Reset the form fields
        // setEmail("");
        // setRequester("");
        // setAddress("");
        // setLocation(null);
        // setLga("Unknown");
        // setTotalCost(0);
        // setFileNames([]);
        // setComments("");
        // Reset the map and marker
        // if (mapRef.current) {
        //   mapRef.current.setCenter(center);
        //   mapRef.current.setZoom(12);
        // }
        // if (markerRef.current) {
        //   markerRef.current.setMap(null);
        // }
        // // Reset the autocomplete input
        // if (addrRef.current) {
        //   addrRef.current.value = "";
        // }
        // // Reset the use my location button
        // if (useMyLocationRef.current) {
        //   useMyLocationRef.current.removeAttribute("disabled");
        //   useMyLocationRef.current.classList.remove(
        //     "opacity-50",
        //     "cursor-not-allowed"
        //   );
        // }
      })
      .catch((error) => {
        console.error("Error saving form data:", error);
        notifyError(error.message || "Error saving form data");
      })
      .finally(() => {
        setIsLoading(false);
      });
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

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={["places"]}>
      {isLoading && (
        <>
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
          </div>
        </>
      )}
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
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
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

              <p className="info-text">
                If address isn’t working or you’re at the property, use this
                instead. We’ll use your accurate location.
              </p>

              <div className="flex gap-5 justify-between">
                <div className="mt-2">
                  <Button
                    onClick={useMyLocation}
                    ref={useMyLocationRef}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                  >
                    Use My Location
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
              zoom={location ? 15 : 12}
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
                type="number"
                value={totalCost}
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
                NGN {totalCost}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* <PaystackButton
              className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 text-center font-semibold"
              text="Confirm & Pay"
              {...paystackConfig}
            /> */}

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
                    <AlertDialogAction className="bg-blue-600">
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
