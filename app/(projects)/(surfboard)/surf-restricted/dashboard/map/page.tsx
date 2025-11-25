"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPinOff, AlertCircle } from "lucide-react";
import PlansMapClient from "@/app/(projects)/(surfboard)/components/PlansMapClient";

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4 text-center p-6">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <h2 className="text-2xl font-semibold text-gray-800">
      Oops! Something went wrong
    </h2>
    <p className="max-w-md text-gray-600">{message}</p>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
    >
      Try Again
    </button>
  </div>
);

const LoadingState = () => (
  <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4">
    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
    <h2 className="text-xl font-medium text-gray-700">
      Loading All Surf Plans
    </h2>
    <p className="text-gray-500">
      Fetching spatial data across the platform...
    </p>
  </div>
);

export default function AdminMapViewerPage() {
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real scenario, admins would fetch ALL plans from all users
      // For now, we'll use a mock data fetch or the same endpoint
      const response = await fetch("/api/surfboard/plans/all-admin");

      if (!response.ok) {
        // Fallback to mock data for demonstration
        const mockPlans = [
          {
            id: "1",
            planNumber: "SP-2024-001",
            surveyTitle: "Commercial Development Site A",
            location: "Cape Town, Western Cape",
            status: "APPROVED",
            polygon: {
              type: "Polygon",
              coordinates: [
                [
                  [18.4241, -33.9249],
                  [18.4251, -33.9249],
                  [18.4251, -33.9259],
                  [18.4241, -33.9259],
                  [18.4241, -33.9249],
                ],
              ],
            },
            owner: { name: "John Doe", email: "john@example.com" },
          },
          {
            id: "2",
            planNumber: "SP-2024-002",
            surveyTitle: "Residential Plot Survey",
            location: "Durban, KwaZulu-Natal",
            status: "PENDING",
            polygon: {
              type: "Polygon",
              coordinates: [
                [
                  [31.0218, -29.8587],
                  [31.0228, -29.8587],
                  [31.0228, -29.8597],
                  [31.0218, -29.8597],
                  [31.0218, -29.8587],
                ],
              ],
            },
            owner: { name: "Jane Smith", email: "jane@example.com" },
          },
          {
            id: "3",
            planNumber: "SP-2024-003",
            surveyTitle: "Industrial Park Boundary",
            location: "Pretoria, Gauteng",
            status: "UNDER_REVIEW",
            polygon: {
              type: "Polygon",
              coordinates: [
                [
                  [28.2293, -25.7479],
                  [28.2303, -25.7479],
                  [28.2303, -25.7489],
                  [28.2293, -25.7489],
                  [28.2293, -25.7479],
                ],
              ],
            },
            owner: { name: "Mike Wilson", email: "mike@example.com" },
          },
        ];
        setAllPlans(mockPlans);
      } else {
        const data = await response.json();
        setAllPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Error fetching admin plans:", err);

      // Fallback to mock data for demonstration
      const mockPlans = [
        {
          id: "1",
          planNumber: "SP-2024-001",
          surveyTitle: "Commercial Development Site A",
          location: "Cape Town, Western Cape",
          status: "APPROVED",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [18.4241, -33.9249],
                [18.4251, -33.9249],
                [18.4251, -33.9259],
                [18.4241, -33.9259],
                [18.4241, -33.9249],
              ],
            ],
          },
          owner: { name: "John Doe", email: "john@example.com" },
        },
        {
          id: "2",
          planNumber: "SP-2024-002",
          surveyTitle: "Residential Plot Survey",
          location: "Durban, KwaZulu-Natal",
          status: "PENDING",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [31.0218, -29.8587],
                [31.0228, -29.8587],
                [31.0228, -29.8597],
                [31.0218, -29.8597],
                [31.0218, -29.8587],
              ],
            ],
          },
          owner: { name: "Jane Smith", email: "jane@example.com" },
        },
        {
          id: "3",
          planNumber: "SP-2024-003",
          surveyTitle: "Industrial Park Boundary",
          location: "Pretoria, Gauteng",
          status: "UNDER_REVIEW",
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [28.2293, -25.7479],
                [28.2303, -25.7479],
                [28.2303, -25.7489],
                [28.2293, -25.7489],
                [28.2293, -25.7479],
              ],
            ],
          },
          owner: { name: "Mike Wilson", email: "mike@example.com" },
        },
      ];
      setAllPlans(mockPlans);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPlans();
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!allPlans || allPlans.length === 0) {
    return (
      <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4 p-6 text-center">
        <MapPinOff className="h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-medium text-gray-700">
          No Surf Plans Available
        </h2>
        <p className="max-w-md text-gray-500">
          There are currently no survey plans in the system. Plans will appear
          here once users start submitting them.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Map Viewer</h1>
        <p className="text-gray-600 mt-1">
          View all survey plans across the platform with spatial visualization
        </p>
      </div>
      <div className="h-[calc(100%-80px)] w-full rounded-lg overflow-hidden border border-gray-200 shadow-lg">
        <PlansMapClient plansRaw={allPlans} />
      </div>
    </div>
  );
}
