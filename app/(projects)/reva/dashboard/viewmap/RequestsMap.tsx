"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  useLoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
  StandaloneSearchBox,
} from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

const MapContainer = ({ properties = [] }: { properties: Array<any> }) => {
  const [selectedProperty, setSelectedProperty] = useState<null | {
    lat: number;
    lng: number;
    title?: string;
    address?: string;
    status?: string;
    totalCost?: number;
  }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBox, setSearchBox] =
    useState<google.maps.places.SearchBox | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 6.5244, lng: 3.3792 });
  const [mapZoom, setMapZoom] = useState(12);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;

    const query = searchQuery.toLowerCase();
    return properties.filter((property) => {
      return (
        (property.title && property.title.toLowerCase().includes(query)) ||
        (property.address && property.address.toLowerCase().includes(query)) ||
        (property.status && property.status.toLowerCase().includes(query)) ||
        (property.description &&
          property.description.toLowerCase().includes(query))
      );
    });
  }, [properties, searchQuery]);

  // Handle search box load
  const onSearchBoxLoad = (ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  };

  // Handle search box place selection
  const onPlacesChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.geometry && place.geometry.location) {
          const newCenter = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          setMapCenter(newCenter);
          setMapZoom(15);
        }
      }
    }
  };

  const mapStyles = {
    width: "100%",
    height: "70vh",
    borderRadius: "15px",
  };

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Map Loading Error
          </h3>
          <p className="text-gray-600">
            Unable to load Google Maps. Please check your internet connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Property Search */}
          <div className="flex-1">
            <label
              htmlFor="property-search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search Properties
            </label>
            <div className="relative">
              <input
                id="property-search"
                type="text"
                placeholder="Search by title, address, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Showing {filteredProperties.length} of {properties.length}{" "}
                properties
              </p>
            )}
          </div>

          {/* Location Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Location
            </label>
            <StandaloneSearchBox
              onLoad={onSearchBoxLoad}
              onPlacesChanged={onPlacesChanged}
            >
              <input
                type="text"
                placeholder="Search for a location..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </StandaloneSearchBox>
          </div>

          {/* Clear Search Button */}
          {(searchQuery || mapZoom !== 12) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setMapCenter({ lat: 6.5244, lng: 3.3792 });
                  setMapZoom(12);
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="rounded-xl overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapStyles}
          zoom={mapZoom}
          center={mapCenter}
          onZoomChanged={() => {
            // Update zoom state when user manually zooms
            const map = document.querySelector(".google-map") as any;
            if (map && map.getZoom) {
              setMapZoom(map.getZoom());
            }
          }}
        >
          {filteredProperties.map(
            (property) =>
              property.lat &&
              property.lng && (
                <Marker
                  key={property.id}
                  position={{ lat: property.lat, lng: property.lng }}
                  onClick={() => setSelectedProperty(property)}
                  icon={{
                    url:
                      property.status === "Available"
                        ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                        : property.status === "Processing"
                        ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                        : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    scaledSize: new google.maps.Size(30, 30),
                  }}
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
              <div className="p-2">
                <h3 className="font-semibold text-lg mb-2">
                  {selectedProperty?.title || "Property"}
                </h3>
                <p className="text-gray-600 mb-2">
                  {selectedProperty?.address}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedProperty.status === "Available"
                        ? "bg-green-100 text-green-800"
                        : selectedProperty.status === "Processing"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedProperty?.status}
                  </span>
                </div>
                <p className="font-medium text-gray-900">
                  Cost: ₦
                  {selectedProperty?.totalCost
                    ? selectedProperty.totalCost.toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Property List Summary */}
      {filteredProperties.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">
            Properties on Map
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProperties.slice(0, 6).map((property) => (
              <div
                key={property.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  if (property.lat && property.lng) {
                    setMapCenter({ lat: property.lat, lng: property.lng });
                    setMapZoom(15);
                    setSelectedProperty(property);
                  }
                }}
              >
                <h4 className="font-medium text-sm text-gray-900 truncate">
                  {property.title || "Untitled Property"}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {property.address}
                </p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    property.status === "Available"
                      ? "bg-green-100 text-green-800"
                      : property.status === "Processing"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {property.status}
                </span>
              </div>
            ))}
          </div>
          {filteredProperties.length > 6 && (
            <p className="text-sm text-gray-600 mt-3 text-center">
              +{filteredProperties.length - 6} more properties
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MapContainer;
