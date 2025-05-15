"use client";

import React, { useEffect, useState } from "react";
import {
  LoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

const MapContainer = ({ properties = [] }: { properties: Array<any> }) => {
  const [selectedProperty, setSelectedProperty] = useState<null | {
    lat: number;
    lng: number;
    title?: string;
    address?: string;
    status?: string;
    totalCost?: number;
  }>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");

  useEffect(() => {
    setGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
  }, []);

  // Default center (you might want to calculate this based on properties)
  const defaultCenter = {
    lat: 9.082, // Example: Lagos coordinates
    lng: 8.6753,
  };

  const mapStyles = {
    width: "100%",
    height: "70vh",
    borderRadius: "15px",
  };

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey}>
      <div className="rounded-xl overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapStyles}
          zoom={10}
          center={defaultCenter}
        >
          {properties.map(
            (property) =>
              property.lat &&
              property.lng && (
                <Marker
                  key={property.id}
                  position={{ lat: property.lat, lng: property.lng }}
                  onClick={() => setSelectedProperty(property)}
                />
              )
          )}

          {selectedProperty && (
            <InfoWindow
              position={{
                lat: selectedProperty.lat,
                lng: selectedProperty.lng,
              }}
              onCloseClick={() => setSelectedProperty(null)}
            >
              <div>
                <h3>{selectedProperty?.title || "Property"}</h3>
                <p>{selectedProperty?.address}</p>
                <p>Status: {selectedProperty?.status}</p>
                <p>
                  Cost: ₦
                  {selectedProperty?.totalCost
                    ? selectedProperty.totalCost.toLocaleString()
                    : "N/A"}
                </p>
                {/* Add more property details as needed */}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </LoadScript>
  );
};

export default MapContainer;
