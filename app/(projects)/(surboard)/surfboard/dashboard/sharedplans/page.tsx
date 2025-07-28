"use client";

import React, { useState } from "react";

const sampleSharedPlans = [
  {
    id: 1,
    planNumber: "SB-2024-003",
    title: "Maryland Residential",
    sharedWith: "user123",
  },
  {
    id: 2,
    planNumber: "SB-2024-004",
    title: "Ojota Commercial",
    sharedWith: "user456",
  },
];

export default function SharedPlansPage() {
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");
  // TODO: Fetch shared plans from backend

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Share plan with userId
    alert(`Plan ${planId} shared with user ${userId}`);
  };

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
        <table className="table w-full bg-white rounded-xl shadow">
          <thead>
            <tr className="bg-blue-100 text-blue-900">
              <th>Plan Number</th>
              <th>Title</th>
              <th>Shared With (User ID)</th>
            </tr>
          </thead>
          <tbody>
            {sampleSharedPlans.map((plan) => (
              <tr key={plan.id} className="hover:bg-blue-50">
                <td>{plan.planNumber}</td>
                <td>{plan.title}</td>
                <td>{plan.sharedWith}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="w-full h-[300px] bg-blue-100 rounded-xl flex items-center justify-center">
        {/* TODO: Integrate map for shared plans */}
        <span className="text-blue-700">[Shared Plans Map Placeholder]</span>
      </div>
    </main>
  );
}
