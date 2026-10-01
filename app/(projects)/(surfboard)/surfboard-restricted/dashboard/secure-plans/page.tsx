"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ShieldAlert, X, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/useConfirm";
import { PageLoader } from "@/components/ui/spinner";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/useViewMode";

interface SecurePlan {
  id: string;
  title: string;
  description: string;
  status: "pending" | "lodged" | "queried" | "under_review";
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

const STATUS_LABEL: Record<SecurePlan["status"], string> = {
  pending: "Pending",
  lodged: "Lodged",
  queried: "Queried",
  under_review: "Under Review",
};

const STATUS_TONE: Record<SecurePlan["status"], string> = {
  pending:
    "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  lodged:
    "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30",
  queried:
    "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
  under_review:
    "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
};

const PRIORITY_TONE: Record<SecurePlan["priority"], string> = {
  critical:
    "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300",
  high:
    "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300",
  medium:
    "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low:
    "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const CONFIDENTIALITY_TONE: Record<SecurePlan["confidentiality"], string> = {
  top_secret:
    "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
  secret:
    "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
  confidential:
    "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  public:
    "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
};

export default function SecurePlansPage() {
  const [plans, setPlans] = useState<SecurePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SecurePlan | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [viewMode, setViewMode] = useViewMode("secure-plans", "list");

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
          status: "lodged",
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
          status: "queried",
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

  const handleStatusChange = async (
    planId: string,
    newStatus: SecurePlan["status"],
    label: string
  ) => {
    const ok = await confirm({
      title: `${label} this plan?`,
      description:
        "This updates the plan's status for every reviewer with access to this record.",
      confirmLabel: label,
    });
    if (!ok) return;

    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              status: newStatus,
              lastModified: new Date().toISOString(),
            }
          : plan
      )
    );
  };

  if (loading) {
    return <PageLoader label="Loading secure plans…" />;
  }

  return (
    <div className="min-h-full space-y-6">
      {ConfirmDialog}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-500 dark:text-red-400" />
            Secure Plans
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review, approve, and manage confidential survey plans with
            enhanced security
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/surfboard-restricted/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, ID, or submitter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg bg-white dark:bg-surface-muted text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Status
            </label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="lodged">Lodged</SelectItem>
                <SelectItem value="queried">Queried</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Priority
            </label>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Secure Plans ({filteredPlans.length})
          </h2>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {viewMode === "grid" ? (
          <div className="p-4">
            {filteredPlans.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No secure plans match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {plan.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {plan.id} • {plan.location}
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_TONE[plan.status]}`}
                      >
                        {STATUS_LABEL[plan.status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_TONE[plan.priority]}`}
                      >
                        {plan.priority.toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${CONFIDENTIALITY_TONE[plan.confidentiality]}`}
                      >
                        {plan.confidentiality.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Assigned to {plan.assignedTo}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Value: R{plan.estimatedValue.toLocaleString()}
                    </div>

                    <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-100 dark:border-white/10">
                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      {plan.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(plan.id, "lodged", "Lodge")
                            }
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium"
                          >
                            Lodge
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(
                                plan.id,
                                "under_review",
                                "Review"
                              )
                            }
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Review
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(plan.id, "queried", "Query")
                            }
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Query
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Confidentiality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {filteredPlans.map((plan) => (
                <motion.tr
                  key={plan.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {plan.id} • {plan.location}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Submitted by {plan.submittedBy} on{" "}
                        {new Date(plan.submittedDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Value: R{plan.estimatedValue.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_TONE[plan.status]}`}
                    >
                      {STATUS_LABEL[plan.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_TONE[plan.priority]}`}
                    >
                      {plan.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${CONFIDENTIALITY_TONE[plan.confidentiality]}`}
                    >
                      {plan.confidentiality.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {plan.assignedTo}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      {plan.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(plan.id, "lodged", "Lodge")
                            }
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium"
                          >
                            Lodge
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(
                                plan.id,
                                "under_review",
                                "Review"
                              )
                            }
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Review
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(plan.id, "queried", "Query")
                            }
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Query
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredPlans.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No secure plans match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Plan Details Modal */}
      {selectedPlan && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPlan(null)}
        >
          <div
            className="bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-white/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Plan Details: {selectedPlan.id}
                </h2>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                    Plan Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Title
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedPlan.title}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedPlan.description}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Location
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedPlan.location}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Estimated Value
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        R{selectedPlan.estimatedValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                    Status &amp; Assignment
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Status
                      </label>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_TONE[selectedPlan.status]}`}
                      >
                        {STATUS_LABEL[selectedPlan.status]}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Priority
                      </label>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_TONE[selectedPlan.priority]}`}
                      >
                        {selectedPlan.priority.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Confidentiality
                      </label>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${CONFIDENTIALITY_TONE[selectedPlan.confidentiality]}`}
                      >
                        {selectedPlan.confidentiality
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Submitted By
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedPlan.submittedBy}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Assigned To
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedPlan.assignedTo}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                  Close
                </Button>
                <Button>Edit Plan</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
