"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SecurePlan {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  priority: "low" | "medium" | "high" | "critical";
  submittedBy: string;
  submittedDate: string;
  lastModified: string;
  assignedTo: string;
  confidentiality: "public" | "confidential" | "secret" | "top_secret";
  estimatedValue: number;
  location: string;
  tags: string[];
}

export default function SecurePlansPage() {
  const [plans, setPlans] = useState<SecurePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SecurePlan | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching secure plans data
    const fetchSecurePlans = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data
      const mockPlans: SecurePlan[] = [
        {
          id: "SP-2024-001",
          title: "Cape Town CBD Infrastructure Survey",
          description:
            "Comprehensive survey of underground infrastructure in Cape Town CBD area",
          status: "pending",
          priority: "high",
          submittedBy: "John Smith",
          submittedDate: "2024-01-15T08:00:00Z",
          lastModified: "2024-01-15T14:30:00Z",
          assignedTo: "Sarah Johnson",
          confidentiality: "confidential",
          estimatedValue: 250000,
          location: "Cape Town, Western Cape",
          tags: ["infrastructure", "underground", "CBD"],
        },
        {
          id: "SP-2024-002",
          title: "Johannesburg Metro Rail Expansion",
          description: "Survey for proposed metro rail expansion project",
          status: "under_review",
          priority: "critical",
          submittedBy: "Mike Wilson",
          submittedDate: "2024-01-14T10:15:00Z",
          lastModified: "2024-01-15T09:45:00Z",
          assignedTo: "David Brown",
          confidentiality: "secret",
          estimatedValue: 1500000,
          location: "Johannesburg, Gauteng",
          tags: ["rail", "expansion", "transport"],
        },
        {
          id: "SP-2024-003",
          title: "Durban Port Development",
          description: "Coastal survey for port expansion and development",
          status: "approved",
          priority: "high",
          submittedBy: "Lisa Chen",
          submittedDate: "2024-01-13T16:20:00Z",
          lastModified: "2024-01-14T11:30:00Z",
          assignedTo: "Robert Davis",
          confidentiality: "confidential",
          estimatedValue: 800000,
          location: "Durban, KwaZulu-Natal",
          tags: ["port", "coastal", "development"],
        },
        {
          id: "SP-2024-004",
          title: "Pretoria Government Complex",
          description: "Survey for new government administrative complex",
          status: "rejected",
          priority: "medium",
          submittedBy: "Alex Thompson",
          submittedDate: "2024-01-12T12:00:00Z",
          lastModified: "2024-01-13T15:20:00Z",
          assignedTo: "Emma Wilson",
          confidentiality: "top_secret",
          estimatedValue: 500000,
          location: "Pretoria, Gauteng",
          tags: ["government", "administrative", "complex"],
        },
        {
          id: "SP-2024-005",
          title: "Bloemfontein University Campus",
          description: "Campus expansion survey for university facilities",
          status: "pending",
          priority: "low",
          submittedBy: "Maria Garcia",
          submittedDate: "2024-01-15T09:30:00Z",
          lastModified: "2024-01-15T09:30:00Z",
          assignedTo: "Unassigned",
          confidentiality: "public",
          estimatedValue: 120000,
          location: "Bloemfontein, Free State",
          tags: ["education", "campus", "expansion"],
        },
      ];

      setPlans(mockPlans);
      setLoading(false);
    };

    fetchSecurePlans();
  }, []);

  const filteredPlans = plans.filter((plan) => {
    const matchesStatus =
      filterStatus === "all" || plan.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || plan.priority === filterPriority;
    const matchesSearch =
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidentialityColor = (confidentiality: string) => {
    switch (confidentiality) {
      case "top_secret":
        return "bg-red-100 text-red-800 border-red-300";
      case "secret":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "confidential":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "public":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              status: newStatus as any,
              lastModified: new Date().toISOString(),
            }
          : plan
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading secure plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Secure Plans Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Review, approve, and manage confidential survey plans with
                  enhanced security
                </p>
              </div>
              <button
                onClick={() => router.push("/surf-restricted/dashboard")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Plans
                </label>
                <input
                  type="text"
                  placeholder="Search by title, ID, or submitter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex items-end">
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Create New Plan
                </button>
              </div>
            </div>
          </div>

          {/* Plans List */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Secure Plans ({filteredPlans.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidentiality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {plan.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {plan.id} • {plan.location}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Submitted by {plan.submittedBy} on{" "}
                            {new Date(plan.submittedDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            Value: R{plan.estimatedValue.toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            plan.status
                          )}`}
                        >
                          {plan.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                            plan.priority
                          )}`}
                        >
                          {plan.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getConfidentialityColor(
                            plan.confidentiality
                          )}`}
                        >
                          {plan.confidentiality.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {plan.assignedTo}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedPlan(plan)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View
                          </button>
                          {plan.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusChange(plan.id, "approved")
                                }
                                className="text-green-600 hover:text-green-900 text-sm font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(plan.id, "rejected")
                                }
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {plan.status === "pending" && (
                            <button
                              onClick={() =>
                                handleStatusChange(plan.id, "under_review")
                              }
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plan Details Modal */}
          {selectedPlan && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Plan Details: {selectedPlan.id}
                    </h2>
                    <button
                      onClick={() => setSelectedPlan(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Plan Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Title
                          </label>
                          <p className="text-gray-900">{selectedPlan.title}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <p className="text-gray-900">
                            {selectedPlan.description}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Location
                          </label>
                          <p className="text-gray-900">
                            {selectedPlan.location}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Estimated Value
                          </label>
                          <p className="text-gray-900">
                            R{selectedPlan.estimatedValue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Status & Assignment
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              selectedPlan.status
                            )}`}
                          >
                            {selectedPlan.status
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                              selectedPlan.priority
                            )}`}
                          >
                            {selectedPlan.priority.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Confidentiality
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getConfidentialityColor(
                              selectedPlan.confidentiality
                            )}`}
                          >
                            {selectedPlan.confidentiality
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Submitted By
                          </label>
                          <p className="text-gray-900">
                            {selectedPlan.submittedBy}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Assigned To
                          </label>
                          <p className="text-gray-900">
                            {selectedPlan.assignedTo}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlan.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setSelectedPlan(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Edit Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
