"use client";
import { useEffect, useState } from "react";
import ArcGISMap from "@/app/(projects)/(surboard)/surfboard/dashboard/newplan/ArcGISMap";
import { getAllSurfPlans } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
import { Loader2 } from "lucide-react";
import {
  GeoJSONPolygon,
  PillarData,
} from "@/app/(projects)/(surboard)/types/surfboardTypes";

const SurfMapViewer = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const result = await getAllSurfPlans();
        if (result.success && result.data) {
          // Filter out plans without geometry data
          const validPlans = result.data.filter(
            (plan) =>
              plan.geometry &&
              (
                plan.geometry as
                  | GeoJSONPolygon
                  | { type: "Polygon"; coordinates: [[number, number][]] }
              ).coordinates &&
              (
                plan.geometry as
                  | GeoJSONPolygon
                  | { type: "Polygon"; coordinates: [[number, number][]] }
              ).coordinates.length > 0
          );
          setPlans(validPlans);
        } else {
          setError(result.error || "Failed to load plans");
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("An unexpected error occurred while loading plans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Combine all pillars from all plans for the map
  const allPillars = plans.flatMap((plan) =>
    Array.isArray(plan.pillars as PillarData[])
      ? (plan.pillars as PillarData[])
      : []
  ) as PillarData[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-gray-600">Loading surfboard plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              No surfboard plans found with valid geometry data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Surfboard Plans Map
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Viewing {plans.length} surfboard plan{plans.length !== 1 ? "s" : ""}{" "}
            on the map
          </p>
        </div>
      </header>
      <main className="flex-1">
        <div className="h-[calc(100vh-180px)] w-full">
          <ArcGISMap
            pillars={allPillars}
            planInfo={{
              totalPlans: plans.length,
              lastUpdated: new Date().toISOString(),
            }}
            initialCenter={[6.5244, 3.3792]} // Default to Lagos
            zoomPadding={{
              duration: 1000,
              padding: 50,
              zoom: 14,
            }}
          />
        </div>
      </main>
    </div>
  );
};

export default SurfMapViewer;
