import React from "react";
import Link from "next/link";

export default function RestrictedDashboardHome() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-blue-900 mb-2">
        Welcome to the Surfboard Restricted Dashboard
      </h1>
      <p className="text-blue-700 mb-8">
        This secure area provides advanced analytics, administrative tools, and
        secure management of sensitive survey plans.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Analytics
          </h2>
          <p className="text-blue-700 text-base mb-2">
            Gain insights from aggregated spatial datasets and plan activity.
          </p>
          <Link
            href="/surf-restricted/dashboard/analytics"
            className="text-blue-600 hover:underline font-medium"
          >
            View Analytics
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Admin Tools
          </h2>
          <p className="text-blue-700 text-base mb-2">
            Access administrative controls and system settings.
          </p>
          <Link
            href="/surf-restricted/dashboard/admin-tools"
            className="text-blue-600 hover:underline font-medium"
          >
            Go to Admin Tools
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Secure Plans
          </h2>
          <p className="text-blue-700 text-base mb-2">
            Review, approve, and manage confidential survey plans securely.
          </p>
          <Link
            href="/surf-restricted/dashboard/secure-plans"
            className="text-blue-600 hover:underline font-medium"
          >
            Manage Secure Plans
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            User Management
          </h2>
          <p className="text-blue-700 text-base mb-2">
            Manage user roles, permissions, and access control.
          </p>
          <Link
            href="/surf-restricted/dashboard/user-management"
            className="text-blue-600 hover:underline font-medium"
          >
            User Management
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            SuperAdmin Panel
          </h2>
          <p className="text-blue-700 text-base mb-2">
            Access superadmin controls and system-wide management tools.
          </p>
          <Link
            href="/surf-restricted/dashboard/superadmin"
            className="text-blue-600 hover:underline font-medium"
          >
            SuperAdmin Panel
          </Link>
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          href="/surf-restricted/dashboard/settings"
          className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
