"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SurfboardPlanForm from "@/app/(projects)/(surfboard)/components/SurfboardPlanForm";
import {
  getSurfPlanById,
  updatePlan,
} from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

export default function UpdateSurfPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<SurfboardPlanDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await getSurfPlanById(params.id);
        if (res.success && res.data) {
          setPlan(res.data as SurfboardPlanDTO);
        } else {
          toast.error("Plan not found");
          router.push("/surf-restricted/dashboard");
        }
      } catch (error) {
        console.error("Error fetching plan:", error);
        toast.error("Failed to load plan");
        router.push("/surf-restricted/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [params.id, router]);

  const handleSubmit = async (updatedPlan: SurfboardPlanDTO) => {
    try {
      await updatePlan(updatedPlan);
      toast.success("Plan updated successfully");
      router.push("/surf-restricted/dashboard");
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-gray-600">Loading plan details...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-red-600">Plan not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">
          Update Surf Plan
        </h1>
        <div className="max-w-4xl mx-auto">
          <SurfboardPlanForm
            mode="edit"
            initial={plan}
            // onSubmit={handleSubmit}
            isSuperAdmin={true} // Assuming this is a restricted admin area
          />
        </div>
      </div>
    </div>
  );
}
