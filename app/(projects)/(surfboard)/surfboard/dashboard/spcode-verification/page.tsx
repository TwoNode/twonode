"use client";

import React, { useState } from "react";

const samplePlans = [
  {
    id: 1,
    planNumber: "SB-2024-001",
    spCode: "SPC-001",
    title: "Ikeja GRA Layout",
  },
  {
    id: 2,
    planNumber: "SB-2024-002",
    spCode: "SPC-002",
    title: "Oregun Industrial",
  },
];

export default function SPCodeVerificationPage() {
  const [search, setSearch] = useState("");
  const filteredPlans = samplePlans.filter(
    (plan) =>
      plan.spCode.toLowerCase().includes(search.toLowerCase()) ||
      plan.planNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">
        SP-Code Verification
      </h1>
      <div className="mb-4 flex gap-4 items-center">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Search by SP-Code or Plan Number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-surface rounded-xl shadow p-6 flex flex-col md:flex-row items-center gap-6"
          >
            {/* TODO: Replace with real QR code */}
            <div className="w-32 h-32 bg-blue-100 flex items-center justify-center rounded-lg text-blue-700 font-bold text-lg">
              QR
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-blue-900 mb-1">
                {plan.title}
              </h2>
              <p className="mb-1">
                <b>Plan Number:</b> {plan.planNumber}
              </p>
              <p className="mb-1">
                <b>SP-Code:</b> {plan.spCode}
              </p>
              {/* TODO: Add public verification portal link */}
              <button className="mt-2 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition">
                Verify
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* TODO: Add public verification portal section */}
    </div>
  );
}
