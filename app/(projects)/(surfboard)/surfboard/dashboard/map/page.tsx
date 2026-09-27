"use client";
import { useEffect, useState } from "react";
import { Loader2, MapPinOff, AlertCircle } from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import PlansMapClient from "@/app/(projects)/(surfboard)/components/PlansMapClient";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4 text-center p-6">
    <AlertCircle
      className="h-12 w-12"
      style={{ color: SURFBOARD_COLORS.error.main }}
    />
    <h2 className="text-2xl font-semibold text-gray-800">
      Oops! Something went wrong
    </h2>
    <p className="max-w-md text-gray-600 dark:text-gray-400">{message}</p>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 rounded-md bg-[#2563EB] px-4 py-2 text-white hover:bg-[#1D4ED8] transition-colors"
    >
      Try Again
    </button>
  </div>
);

const LoadingState = () => (
  <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center space-y-4">
    <Loader2
      className="h-12 w-12 animate-spin"
      style={{ color: SURFBOARD_COLORS.primary.main }}
    />
    <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">Loading Surf Plans</h2>
    <p className="text-gray-500 dark:text-gray-400">Hang tight while we fetch your data...</p>
  </div>
);

export default function SurfMapViewerPage() {
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await surfboardApi.plans.list({ noPagination: true });
      if (res.success) {
        setAllPlans(res.data?.plans || []);
      } else {
        throw new Error(res.error || "Failed to load plans");
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
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
          It looks like there are no surf plans to display. Check back later or
          create a new plan.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <PlansMapClient plansRaw={allPlans} />
    </div>
  );
}
