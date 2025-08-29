"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiPlus,
  FiFileText,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import {
  getAllSurfPlans,
  getAllSharedSurfPlans,
  getSharedWithMeSurfPlans,
} from "../../actions/surfboardActions";
import { AnalyticsDashboard } from "./analytics/AnalyticsDashboard";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string; // Changed from title to surveyTitle
  status: string;
  updatedAt: string | Date;
  createdAt: string | Date;
  facilitator?: string;
  isOwner?: boolean;
}

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState<"analytics" | "recent" | "shared">(
    "analytics"
  );
  const [stats, setStats] = useState({
    totalPlans: 0,
    sharedPlans: 0,
    pending: 0,
    approved: 0,
  });

  const [recentPlans, setRecentPlans] = useState<Plan[]>([]);
  const [sharedPlans, setSharedPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [plansResult, sharedResult, sharedWithMeResult] = await Promise.all(
        [getAllSurfPlans(), getAllSharedSurfPlans(), getSharedWithMeSurfPlans()]
      );

      if (
        plansResult.success &&
        sharedResult.success &&
        sharedWithMeResult.success
      ) {
        const plans = plansResult.data || [];
        const sharedPlans = sharedResult.data || [];
        const sharedWithMe = sharedWithMeResult.data || [];

        // Calculate stats
        const totalPlans = plans.length;
        const pending = plans.filter(
          (plan) => plan.status === "PENDING"
        ).length;
        const approved = plans.filter(
          (plan) => plan.status === "APPROVED"
        ).length;

        setStats({
          totalPlans,
          sharedPlans: sharedPlans.length,
          pending,
          approved,
        });

        // Get recent plans (last 5 updated)
        const recent = [...plans]
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 5);

        setRecentPlans(recent);
        setSharedPlans(sharedWithMe);
      } else {
        setError("Failed to load data. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("An error occurred while fetching data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="mr-1" /> Approved
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="mr-1" /> Pending
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FiAlertCircle className="mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your survey plans.
          </p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <Link
            href="/surfboard/dashboard/newplan"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiPlus className="mr-2 h-4 w-4" />
            New Plan
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <FiFileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Plans
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.totalPlans}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link
                href="/surfboard/dashboard/plans"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View all plans
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <FiUsers className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Shared with Me
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.sharedPlans}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link
                href="/surfboard/dashboard/shared"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View shared plans
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <FiClock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Approval
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.pending}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link
                href="/surfboard/dashboard/plans?status=PENDING"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View pending
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <FiCheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Approved
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {stats.approved}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link
                href="/surfboard/dashboard/plans?status=APPROVED"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View approved
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`${
              activeTab === "analytics"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`${
              activeTab === "recent"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Recent Activity
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className={`${
              activeTab === "shared"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Shared with Me
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && <AnalyticsDashboard />}

        {activeTab === "recent" && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {recentPlans.length > 0 ? (
                recentPlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {plan.planNumber} - {plan.surveyTitle}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            {getStatusBadge(plan.status)}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {plan.facilitator || "No facilitator"}
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <p>
                              Updated{" "}
                              <time
                                dateTime={new Date(
                                  plan?.updatedAt || ""
                                ).toISOString()}
                              >
                                {new Date(
                                  plan?.updatedAt || ""
                                ).toLocaleDateString()}
                              </time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No recent plans found</p>
                </div>
              )}
            </ul>
          </div>
        )}

        {activeTab === "shared" && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {sharedPlans.length > 0 ? (
                sharedPlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {plan.planNumber} - {plan.surveyTitle}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            {getStatusBadge(plan.status)}
                            {!plan.isOwner && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Shared
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {plan.facilitator || "No facilitator"}
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <p>
                              Shared on{" "}
                              <time
                                dateTime={new Date(
                                  plan?.updatedAt || ""
                                ).toISOString()}
                              >
                                {new Date(
                                  plan?.updatedAt || ""
                                ).toLocaleDateString()}
                              </time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No shared plans found</p>
                </div>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
