"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAllSurfPlans,
  updateSurfPlanStatus,
  deleteSurfPlan,
} from "@/app/(projects)/(surboard)/actions/surfboardActions";
import type { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

interface PlanWithPillars extends Plan {
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  areaSqM?: number;
  pdfFilePath: string | null;
  cadFilePath: string | null;
  certificateFilePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  pillars: Array<{
    pillarNumber: string;
    easting: number;
    northing: number;
    pointIndex: number;
  }>;
}

export default function PlanList() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanWithPillars[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadPlans = async () => {
    try {
      const result = await getAllSurfPlans();
      if (result?.success && result?.data) {
        setPlans(result.data as PlanWithPillars[]);
      } else {
        toast.error(result.error || "Failed to load plans");
      }
    } catch (error) {
      toast.error("Error loading plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleStatusUpdate = async (
    planId: string,
    newStatus: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW"
  ) => {
    setUpdating(planId);
    try {
      const result = await updateSurfPlanStatus(planId, newStatus);
      if (result.success) {
        toast.success("Status updated successfully");
        loadPlans(); // Reload plans
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (planId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this plan? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const result = await deleteSurfPlan(planId);
      if (result.success) {
        toast.success("Plan deleted successfully");
        loadPlans(); // Reload plans
      } else {
        toast.error(result.error || "Failed to delete plan");
      }
    } catch (error) {
      toast.error("Error deleting plan");
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No plans found
        </h3>
        <p className="text-gray-500">
          Get started by creating your first survey plan.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          All Survey Plans
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage and view all created survey plans
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Plan Number
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Created
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr
                key={plan.id}
                onClick={() => router.push(`/surfboard/dashboard/plan?planId=${plan.id}`)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {plan.planNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{plan.surveyTitle}</div>
                  <div className="text-sm text-gray-500">{plan.facilitator}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      plan.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : plan.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : plan.status === "UNDER_REVIEW"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {plan.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(plan.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle view action
                        router.push(`/surfboard/dashboard/plan/${plan.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            "Are you sure you want to delete this plan? This action cannot be undone."
                          )
                        ) {
                          setUpdating(plan.id);
                          const result = await deleteSurfPlan(plan.id);
                          if (result?.success) {
                            toast.success("Plan deleted successfully");
                            loadPlans();
                          } else {
                            toast.error(result?.error || "Failed to delete plan");
                          }
                          setUpdating(null);
                        }
                      }}
                      disabled={updating === plan.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {updating === plan.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
