import React from "react";
import Link from "next/link";

const recentEdited = [
  {
    id: 1,
    planNumber: "SB-2024-001",
    title: "Ikeja GRA Layout",
    updatedAt: "2024-06-01",
  },
  {
    id: 2,
    planNumber: "SB-2024-002",
    title: "Oregun Industrial",
    updatedAt: "2024-05-30",
  },
];

const recentUploaded = [
  {
    id: 3,
    planNumber: "SB-2024-003",
    title: "Maryland Residential",
    createdAt: "2024-05-29",
  },
  {
    id: 4,
    planNumber: "SB-2024-004",
    title: "Ojota Commercial",
    createdAt: "2024-05-28",
  },
];

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-900 mb-2">
        Welcome to Surfboard Dashboard
      </h1>
      <p className="text-blue-700 mb-8">
        Manage, visualize, and verify your survey plans with ease.
      </p>
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Recently Edited Plans
          </h2>
          <ul>
            {recentEdited.map((plan) => (
              <li
                key={plan.id}
                className="mb-2 flex justify-between items-center"
              >
                <span className="font-medium text-blue-900">
                  {plan.planNumber}
                </span>
                <span className="text-blue-600">{plan.title}</span>
                <span className="text-xs text-gray-500">{plan.updatedAt}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Recently Uploaded Plans
          </h2>
          <ul>
            {recentUploaded.map((plan) => (
              <li
                key={plan.id}
                className="mb-2 flex justify-between items-center"
              >
                <span className="font-medium text-blue-900">
                  {plan.planNumber}
                </span>
                <span className="text-blue-600">{plan.title}</span>
                <span className="text-xs text-gray-500">{plan.createdAt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          href="/surfboard/dashboard/newplan"
          className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Upload New Plan
        </Link>
        <Link
          href="/surfboard/dashboard/allplans"
          className="px-6 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold hover:bg-blue-200 transition"
        >
          View All Plans
        </Link>
      </div>
    </div>
  );
}
