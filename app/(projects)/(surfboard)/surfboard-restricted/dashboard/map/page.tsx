"use client";

import { useEffect, useState } from "react";
import { MapPinOff, AlertCircle } from "lucide-react";
import PlansMapClient from "@/app/(projects)/(surfboard)/components/PlansMapClient";
import { surfboardApi } from "@/surfboard/apiClient";
import { PageLoader } from "@/components/ui/spinner";

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4 text-center p-6">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <h2 className="text-2xl font-semibold text-gray-800">
      Oops! Something went wrong
    </h2>
    <p className="max-w-md text-gray-600 dark:text-gray-400">{message}</p>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
    >
      Try Again
    </button>
  </div>
);

const LoadingState = () => (
  <PageLoader className="h-[calc(100vh-200px)] min-h-0" label="Fetching spatial data across the platform…" />
);

export default function AdminMapViewerPage() {
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await surfboardApi.admin.plansMap();

      if (result.success) {
        setAllPlans(result.data.plans || []);
      } else {
        setError(result.error || "Failed to fetch plans");
      }
    } catch (err) {
      console.error("Error fetching admin plans:", err);
      setError("An error occurred while fetching plans");
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
        <MapPinOff className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
          No Surf Plans Available
        </h2>
        <p className="max-w-md text-gray-500 dark:text-gray-400">
          There are currently no survey plans in the system. Plans will appear
          here once users start submitting them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-96px)] w-full flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Map Viewer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View all survey plans across the platform with spatial visualization
        </p>
      </div>
      <div className="min-h-0 flex-1 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
        <PlansMapClient plansRaw={allPlans} />
      </div>
    </div>
  );
}
