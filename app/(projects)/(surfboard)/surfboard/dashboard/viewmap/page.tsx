"use client";

import React, { useState } from "react";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

const samplePlans = [
  {
    id: 1,
    planNumber: "SB-2024-001",
    title: "Ikeja GRA Layout",
    type: "APPROVED LAYOUT",
    facilitator: "John Doe",
    status: "Active",
    // geometry: ...
  },
  {
    id: 2,
    planNumber: "SB-2024-002",
    title: "Oregun Industrial",
    type: "DEED",
    facilitator: "Jane Smith",
    status: "Pending",
    // geometry: ...
  },
];

export default function MapViewerPage() {
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  // TODO: Integrate real map and backend data
  const filteredPlans = samplePlans.filter(
    (plan) =>
      plan.planNumber.toLowerCase().includes(search.toLowerCase()) ||
      plan.title.toLowerCase().includes(search.toLowerCase()) ||
      plan.facilitator.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: SURFBOARD_COLORS.primary.dark }}
      >
        Map Viewer
      </h1>
      <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <input
          type="text"
          className="input input-bordered w-full md:w-1/3"
          placeholder="Search by plan number, title, or facilitator"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* TODO: Add more filter controls if needed */}
      </div>
      <div
        className="w-full h-[500px] rounded-xl flex items-center justify-center mb-6"
        style={{ backgroundColor: SURFBOARD_COLORS.surface.main }}
      >
        {/* TODO: Integrate ArcGIS/Google Maps here. Render polygons for filteredPlans. */}
        <span style={{ color: SURFBOARD_COLORS.primary.main }}>
          [Map Placeholder]
        </span>
      </div>
      {/* Popup for plan details */}
      {selectedPlan && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white dark:bg-surface rounded-xl shadow-lg p-8 max-w-md w-full">
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: SURFBOARD_COLORS.primary.dark }}
            >
              {selectedPlan.title}
            </h2>
            <p className="mb-1">
              <b>Plan Number:</b> {selectedPlan.planNumber}
            </p>
            <p className="mb-1">
              <b>Type:</b> {selectedPlan.type}
            </p>
            <p className="mb-1">
              <b>Facilitator:</b> {selectedPlan.facilitator}
            </p>
            <p className="mb-1">
              <b>Status:</b> {selectedPlan.status}
            </p>
            <button
              className="mt-4 px-6 py-2 bg-[#2563EB] text-white rounded-lg font-semibold hover:bg-[#1D4ED8] transition"
              onClick={() => setSelectedPlan(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* TODO: On map polygon click, setSelectedPlan(plan) */}
    </div>
  );
}
