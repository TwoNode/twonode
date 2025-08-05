"use client";

import React, { useEffect, useState } from "react";
import {
  getAllSharedSurfPlans,
  getSharedWithMeSurfPlans,
} from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";

export default function SharedPlansPage() {
  const [sharedPlans, setSharedPlans] = useState<Plan[]>([]);
  const [sharedWithMePlans, setSharedWithMePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");

  useEffect(() => {
    const fetchSharedPlans = async () => {
      try {
        setLoading(true);
        const result = await getAllSharedSurfPlans();
        const result2 = await getSharedWithMeSurfPlans();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch shared plans");
        }

        setSharedPlans(result.data || []);
        setSharedWithMePlans(result2.data || []);
      } catch (err) {
        console.error("Error fetching shared plans:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSharedPlans();
  }, []);

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Share plan with userId
    alert(`Plan ${planId} shared with user ${userId}`);
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Shared Plans</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Shared Plans</h1>
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Shared Plans</h1>

      <form
        className="mb-8 flex flex-col md:flex-row gap-4 items-center"
        onSubmit={handleShare}
      >
        <input
          type="text"
          className="input input-bordered"
          placeholder="Plan ID"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        />
        <input
          type="text"
          className="input input-bordered"
          placeholder="User ID to share with"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Share Plan
        </button>
      </form>

      <div className="overflow-x-auto mb-8">
        {sharedWithMePlans.length > 0 ? (
          <table className="table w-full bg-white rounded-xl shadow">
            <thead>
              <tr className="bg-blue-100 text-blue-900">
                <th>Plan Number</th>
                <th>Title</th>
                <th>Plan Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sharedWithMePlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-blue-50">
                  <td>{plan.planNumber}</td>
                  <td>{plan.surveyTitle}</td>
                  <td>{plan.planType}</td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        plan.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : plan.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : plan.status === "UNDER_REVIEW"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-lg">
            <p className="font-medium">No shared plans found</p>
            <p>Plans shared with you will appear here.</p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto mb-8">
        {sharedPlans.length > 0 ? (
          <table className="table w-full bg-white rounded-xl shadow">
            <thead>
              <tr className="bg-blue-100 text-blue-900">
                <th>Plan Number</th>
                <th>Title</th>
                <th>Plan Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sharedPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-blue-50">
                  <td>{plan.planNumber}</td>
                  <td>{plan.surveyTitle}</td>
                  <td>{plan.planType}</td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        plan.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : plan.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : plan.status === "UNDER_REVIEW"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-lg">
            <p className="font-medium">No shared plans found</p>
            <p>You've shared no plans with others.</p>
          </div>
        )}
      </div>
      <div className="w-full h-[300px] bg-blue-100 rounded-xl flex items-center justify-center">
        {/* TODO: Integrate map for shared plans */}
        <span className="text-blue-700">[Shared Plans Map Placeholder]</span>
      </div>
    </main>
  );
}
