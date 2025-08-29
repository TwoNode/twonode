"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAllSurfPlans } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import PlanView from "../../../components/PlanView";

export default function AllPlans() {
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = async () => {
    try {
      const result = await getAllSurfPlans();
      if (result?.success && result?.data) {
        setPlans(result.data);
      } else {
        toast.error(result?.error || "Failed to load plans");
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          All Survey Plans
        </h1>
        <p className="text-gray-600">
          View and manage all created survey plans
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by plan number, title, or facilitator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Export
          </button>
          <button
            onClick={() =>
              (window.location.href = "/surfboard/dashboard/newplan")
            }
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Create New Plan
          </button>
        </div>
      </div>

      <PlanView 
        plans={plans} 
        emptyMessage="No survey plans found. Create a new plan to get started."
        defaultView="list"
      />
    </main>
  );
}
