"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  PillarData,
  convertCoordinates,
} from "@/app/(projects)/(surfboard)/utils/surfboardUtils";

// Fix for Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPreviewProps {
  pillars: PillarData[];
  geometry?: string;
  className?: string;
}

export default function MapPreview({
  pillars,
  geometry,
  className = "",
}: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || pillars.length === 0) return;

    let isMounted = true;
    const markers: L.Marker[] = [];
    const tooltips: L.Tooltip[] = [];
    let polygon: L.Polygon | null = null;

    const initMap = async () => {
      try {
        // Initialize map
        const map = L.map(mapRef.current!).setView([6.5244, 3.3792], 10); // Lagos coordinates

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        // Convert all coordinates asynchronously
        const points = await Promise.all(
          pillars.map((pillar) =>
            convertCoordinates(pillar.easting, pillar.northing)
          )
        );

        if (!isMounted) return;

        // Create polygon coordinates array
        const polygonCoords = points.map(({ lat, lng }) => [lat, lng]);

        // Ensure polygon is closed by adding first point at the end
        if (
          polygonCoords.length > 0 &&
          (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
            polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1])
        ) {
          polygonCoords.push(polygonCoords[0]);
        }

        // Add polygon layer if we have enough points
        if (polygonCoords.length > 2) {
          polygon = L.polygon(polygonCoords as L.LatLngExpression[], {
            color: "red",
            weight: 2,
            fillColor: "blue",
            fillOpacity: 0.2,
          }).addTo(map);
        }

        // Add pillar markers and tooltips
        pillars.forEach((pillar, index) => {
          const { lat, lng } = points[index];

          // Create marker
          const marker = L.marker([lat, lng])
            .bindPopup(
              `<b>Pillar ${
                pillar.pillarNumber
              }</b><br>Index: ${index}<br>Easting: ${pillar.easting.toFixed(
                2
              )}<br>Northing: ${pillar.northing.toFixed(2)}`
            )
            .addTo(map);
          markers.push(marker);

          // Add pillar number label
          const tooltip = L.tooltip({
            permanent: true,
            direction: "center",
            className: "pillar-label",
          })
            .setContent(pillar.pillarNumber)
            .setLatLng([lat, lng])
            .addTo(map);
          tooltips.push(tooltip);
        });

        // Fit map to show all features
        if (points.length > 0) {
          const bounds = L.latLngBounds(
            points.map(({ lat, lng }) => [lat, lng] as [number, number])
          );
          map.fitBounds(bounds, { padding: [20, 20] });
        }

        mapInstanceRef.current = map;
      } catch (error) {
        console.error("Error initializing map:", error);
        // You might want to show an error message to the user here
      }
    };

    initMap();

    return () => {
      isMounted = false;

      // Clean up markers and tooltips
      markers.forEach((marker) => marker.remove());
      tooltips.forEach((tooltip) => tooltip.remove());
      if (polygon) {
        polygon.remove();
      }

      // Clean up map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pillars, geometry]);

  if (pillars.length === 0) {
    return (
      <div
        className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}
      >
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"
            />
          </svg>
        </div>
        <p className="text-gray-600">No survey data to display</p>
        <p className="text-sm text-gray-500 mt-2">
          Upload a CSV file to see the map preview
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        className="h-[500px] overflow-hidden w-full rounded-lg"
      />
      <style jsx global>{`
        .pillar-label {
          background: none;
          border: none;
          box-shadow: none;
          color: #1f2937;
          font-weight: bold;
          font-size: 12px;
          text-shadow: 1px 1px 2px white;
        }
      `}</style>
    </div>
  );
}
