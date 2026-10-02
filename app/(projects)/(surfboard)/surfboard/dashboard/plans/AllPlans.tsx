// In AllPlans.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  Calendar as CalendarIcon,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  FileText,
  User,
  QrCode,
  RefreshCw,
  MoreVertical,
  Grid3x3,
  List,
  Plus,
  Loader2,
  AlertTriangle,
  Share2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_TYPES as PLAN_TYPES_OBJ } from "../../../types/surfboardTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BatchSelectionBar,
  BatchSubmissionModal,
  isPlanEligibleForCertificate,
  getPlanEligibilityMessage,
} from "../../../components/CertificateBatchSelection";
import { RecordCopyUploadModal } from "../../../components/RecordCopyUploadModal";
import { SubmittedBatchesModal } from "../../../components/SubmittedBatchesModal";
import { BulkSharePlanModal } from "../../../components/BulkSharePlanModal";
import SurfboardPlanForm from "../../../components/SurfboardPlanForm";
import OptimizedSinglePlanDetails from "../../../components/OptimizedSinglePlanDetails";
import { getQrColors } from "@/lib/qrColorPreferences";
import {
  PlanDetailsLoadingState,
  PlanFormLoadingState,
} from "../../../components/LoadingStates";
import {
  PlanDetailsErrorState,
  PlanFormErrorState,
} from "../../../components/ErrorStates";

interface PlanFilters {
  search?: string;
  status: string[];
  planType: string[];
  facilitator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const PLAN_STATUSES = ["PENDING", "UNDER_REVIEW", "LODGED", "QUERIED"];
const PLAN_TYPES = Array.from(Object.values(PLAN_TYPES_OBJ));

/** "Shared Access": which plans to load. Filters, not tabs — see out/Surfboard Shared Access.pdf. */
type PlanScope = "mine" | "sharedWithMe" | "mySharedPlans";
const SCOPE_OPTIONS: { id: PlanScope; label: string }[] = [
  { id: "mine", label: "My Plans" },
  { id: "sharedWithMe", label: "Shared with me" },
  { id: "mySharedPlans", label: "My Shared Plans" },
];

export default function AllPlans() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filters, setFilters] = useState<PlanFilters>({
    status: [],
    planType: [],
  });
  const [scope, setScope] = useState<PlanScope>("mine");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // QR Code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [selectedPlanForQr, setSelectedPlanForQr] = useState<string | null>(
    null
  );
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Batch Selection State
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [showBulkShareModal, setShowBulkShareModal] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showBatchesModal, setShowBatchesModal] = useState(false);

  // User Profile Data
  const [isKycValidated, setIsKycValidated] = useState<boolean>(true); // Default to true to prevent flash
  // /newplan is subscription-gated server-side (proxy.ts + createSurfPlan) —
  // hide this CTA rather than send an unsubscribed user into a page that
  // immediately redirects them out.
  const [hasSubscriptionAccess, setHasSubscriptionAccess] = useState(true);
  // Independent of `scope`/`pagination.total` (which only reflect whichever
  // scope tab is currently active) — a dedicated lightweight fetch just to
  // badge the "Shared with me" tab with its own count up front.
  const [sharedWithMeCount, setSharedWithMeCount] = useState<number | null>(
    null
  );

  const loadPlans = async (
    page = pagination.page,
    pageSize = pagination.pageSize
  ) => {
    try {
      setLoading(true);
      const scopedFilters = {
        status: filters.status.length > 0 ? filters.status : undefined,
        planType: filters.planType.length > 0 ? filters.planType : undefined,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        search: search || undefined,
      };
      const sort = { field: "dateOnSurveyPlan" as any, order: "desc" as const };
      const result =
        scope === "sharedWithMe"
          ? await surfboardApi.plans.sharedWithMe(
              page,
              pageSize,
              scopedFilters,
              sort
            )
          : scope === "mySharedPlans"
            ? await surfboardApi.plans.shared(
                page,
                pageSize,
                scopedFilters,
                sort
              )
            : await surfboardApi.plans.list({
                page,
                pageSize,
                filters: scopedFilters,
                sort,
              });

      if (result?.success && result?.data) {
        setPlans(result.data.plans || []);
        setPagination((prev) => ({
          ...prev,
          page,
          pageSize,
          total: result?.data?.total || 0,
          totalPages: result?.data?.totalPages || 1,
        }));
      } else {
        console.warn(result);
        toast.error("Error loading plans");
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Error loading plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans(1, pagination.pageSize);
    // Load profile to check KYC validation status
    surfboardApi.profile.get().then((res) => {
      if (res.success) {
        setIsKycValidated(res.data.isKycValidated);
      }
    });
    surfboardApi.subscription.userAndActiveSub().then((res) => {
      setHasSubscriptionAccess(res.success ? !!res.data?.subscription : false);
    });
    surfboardApi.plans.sharedWithMe(1, 1, {}, undefined).then((res) => {
      if (res.success) setSharedWithMeCount(res.data.total);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlans(1, pagination.pageSize);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters, search, scope]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlans(pagination.page, pagination.pageSize);
    setRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPlans(newPage);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    setPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
    loadPlans(1, newSize);
  };

  const handleStatusChange = (status: string) => {
    setFilters((prev) => {
      const newStatuses = prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status];
      return { ...prev, status: newStatuses };
    });
  };

  const handlePlanTypeChange = (type: string) => {
    setFilters((prev) => {
      const newTypes = prev.planType.includes(type)
        ? prev.planType.filter((t) => t !== type)
        : [...prev.planType, type];
      return { ...prev, planType: newTypes };
    });
  };

  const handleDateChange = (
    field: "dateFrom" | "dateTo",
    date: Date | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [field]: date }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      planType: [],
      dateFrom: undefined,
      dateTo: undefined,
      facilitator: undefined,
    });
    setSearch("");
  };

  const handleExport = () => {
    try {
      // Prepare CSV headers
      const headers = [
        "Plan Number",
        "Survey Title",
        "Status",
        "Location",
        "Facilitator",
        "Facility",
        "Pillars Count",
        "Area (m²)",
        "Created At",
        "Updated At",
      ];

      // Prepare CSV rows
      const rows = plans.map((plan) => [
        plan.planNumber || "N/A",
        plan.surveyTitle || "Untitled",
        plan.status?.replace("_", " ") || "N/A",
        plan.location || "N/A",
        plan.facilitator || "N/A",
        plan.facility || "N/A",
        plan.pillars?.length || 0,
        plan.areaSqM || 0,
        plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : "N/A",
        plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : "N/A",
      ]);

      // Convert to CSV format
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `survey-plans-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${plans.length} plans successfully`);
    } catch (error) {
      console.error("Error exporting plans:", error);
      toast.error("Failed to export plans");
    }
  };

  // Handle opening view modal - use already loaded data
  const handleViewPlan = (planId: string) => {
    // Find plan in the already-loaded plans array
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setSelectedPlanId(planId);
      setViewModalOpen(true);
      setModalError(null);
    } else {
      toast.error("Plan not found");
    }
  };

  // Handle opening edit modal - use already loaded data
  const handleEditPlan = (planId: string) => {
    // Find plan in the already-loaded plans array
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setSelectedPlanId(planId);
      setEditModalOpen(true);
      setModalError(null);
    } else {
      toast.error("Plan not found");
    }
  };

  // Refresh a single plan's data after update
  const refreshSelectedPlan = async (planId: string) => {
    try {
      setModalLoading(true);
      const result = await surfboardApi.plans.get(planId);
      if (result.success) {
        setSelectedPlan(result.data);
        // Also update the plan in the plans array
        setPlans((prevPlans) =>
          prevPlans.map((p) => (p.id === planId ? result.data : p))
        );
      } else {
        toast.error(result.error || "Failed to refresh plan data");
      }
    } catch (error) {
      console.error("Error refreshing plan:", error);
      toast.error("Failed to refresh plan data");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle closing modals
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setEditModalOpen(false);
    setSelectedPlanId(null);
    setSelectedPlan(null);
    setModalError(null);
  };

  // Handle successful edit - refresh the specific plan and close modal
  const handleEditSuccess = async () => {
    if (selectedPlanId) {
      await refreshSelectedPlan(selectedPlanId);
      toast.success("Plan updated successfully");
      // Close the edit modal after successful save
      setEditModalOpen(false);
    }
  };

  // Handle QR Code generation
  const handleGenerateQrCode = async (planId: string) => {
    try {
      setIsGeneratingQr(true);
      setSelectedPlanForQr(planId);
      setQrCodeDataUrl(null); // Reset previous QR code
      setQrModalOpen(true); // Open modal immediately to show loading

      const result = await surfboardApi.plans.generateQR(planId, {
        ...getQrColors(),
        minLightAlpha: 0.3,
        margin: 4,
        scale: 8,
        forceOpaque: false,
      });

      if (result.success) {
        setQrCodeDataUrl(result.data.qrCodeDataUrl);
      } else {
        toast.error(result.error || "Failed to generate QR code");
        setQrModalOpen(false); // Close modal on error
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
      setQrModalOpen(false); // Close modal on error
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Handle delete plan
  const handleDeleteClick = (planId: string) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;

    setIsDeleting(true);
    toast.loading("Deleting plan...", { duration: Infinity });
    try {
      const result = await surfboardApi.plans.permanentDelete(planToDelete);
      if (result.success) {
        toast.success("Plan deleted successfully");
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
        // Refresh the plans list
        loadPlans(pagination.page, pagination.pageSize);
      } else {
        toast.error(result.error || "Failed to delete plan");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("An error occurred while deleting the plan");
    } finally {
      setIsDeleting(false);
      toast.dismiss();
    }
  };

  // Selection Handlers
  const handleSelectPlan = (planId: string) => {
    setSelectedPlans((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId]
    );
  };

  const handleSelectAll = () => {
    // Only select eligible plans if needed, or just all visible plans
    // For now, let's select all visible plans
    if (selectedPlans.length === plans.length && plans.length > 0) {
      setSelectedPlans([]);
    } else {
      setSelectedPlans(plans.map((p) => p.id));
    }
  };

  const handleBulkShare = () => {
    if (selectedPlans.length === 0) return;
    setShowBulkShareModal(true);
  };

  const handleBatchSubmit = () => {
    if (!isKycValidated) {
      toast.error(
        "You must complete your KYC validation in the Settings page to submit plans for CoD."
      );
      return;
    }

    // Get the selected plan objects
    const selectedPlanObjects = plans.filter((p) =>
      selectedPlans.includes(p.id)
    );

    // Check if any selected plan is missing a record copy
    const plansMissingRecordCopy = selectedPlanObjects.filter(
      (p) => !p.redCopyFileUrl
    );

    if (plansMissingRecordCopy.length > 0) {
      // Open upload modal first
      setUploadModalOpen(true);
    } else {
      // All plans have record copies, proceed to batch submission
      setBatchModalOpen(true);
    }
  };

  const handleUploadComplete = () => {
    // Refresh plans to get updated record copy URLs
    loadPlans(pagination.page, pagination.pageSize).then(() => {
      // Close upload modal and open batch submission modal
      setUploadModalOpen(false);
      setBatchModalOpen(true);
    });
  };

  const handleBatchSuccess = () => {
    setSelectedPlans([]);
    loadPlans(pagination.page, pagination.pageSize);
  };

  const hasActiveFilters = () => {
    return (
      filters.status.length > 0 ||
      filters.planType.length > 0 ||
      filters.dateFrom ||
      filters.dateTo ||
      search
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LODGED":
        return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
      case "PENDING":
        return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
      case "QUERIED":
        return "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20";
      case "UNDER_REVIEW":
        return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10";
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "LODGED":
        return "bg-emerald-500";
      case "PENDING":
        return "bg-amber-500";
      case "QUERIED":
        return "bg-rose-500";
      case "UNDER_REVIEW":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

  /** "Shared Access" badge: who this plan is shared with/by, when relevant to the current scope. */
  const SharedBadge = ({ plan }: { plan: any }) => {
    if (scope === "sharedWithMe") {
      const owner = plan.user;
      const ownerName = owner
        ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
          owner.email
        : null;
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20"
          title={ownerName ? `Shared by ${ownerName}` : "Shared with you"}
        >
          <Share2 className="w-3 h-3" />
          {ownerName ? `Shared by ${ownerName}` : "Shared with you"}
        </span>
      );
    }
    if (plan.sharedTo?.length > 0) {
      // sharedToUsers (resolved names, batch-fetched alongside the list
      // query) lets this show who a plan is actually shared with on
      // hover/tap, without a trip to the single-plan page — falls back to
      // just the count if the names somehow didn't come back with this
      // plan (e.g. a stale cached row).
      const names: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }[] = plan.sharedToUsers || [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
            >
              <Share2 className="w-3 h-3" />
              Shared ({plan.sharedTo.length})
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Shared with
            </p>
            {names.length > 0 ? (
              <ul className="space-y-1.5">
                {names.map((u) => (
                  <li
                    key={u.id}
                    className="text-sm text-gray-900 dark:text-white truncate"
                  >
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                      u.email}
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                      {u.email}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {plan.sharedTo.length}{" "}
                {plan.sharedTo.length === 1 ? "person" : "people"}
              </p>
            )}
          </PopoverContent>
        </Popover>
      );
    }
    return null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "LODGED":
      case "APPROVED":
        return <CheckCircle className="w-4 h-4" />;
      case "QUERIED":
        return <XCircle className="w-4 h-4" />;
      case "PENDING":
      case "UNDER_REVIEW":
      case "SUBMITTED":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Helper to get the display status (redCopyStatus if not NOT_SUBMITTED, else status)
  const getDisplayStatus = (plan: any) => {
    if (plan.status === "LODGED") {
      return "LODGED";
    }

    if (plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED") {
      return plan.redCopyStatus;
    }

    return plan.status;
  };

  // Helper to check if a plan is locked (submitted and cannot be edited/deleted)
  const isPlanLocked = (plan: any) => {
    return plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED";
  };

  // Helper to check if a plan has been queried by any MDA role
  const isQueried = (plan: any) => {
    return (
      plan.accountsStatus === "QUERIED" ||
      plan.chartingStatus === "QUERIED" ||
      plan.surconStatus === "QUERIED" ||
      plan.recordsIStatus === "QUERIED" ||
      plan.recordsIIStatus === "QUERIED"
    );
  };

  // Get query info for a plan
  const getQueryInfo = (plan: any) => {
    const queriers: string[] = [];
    if (plan.accountsStatus === "QUERIED") queriers.push("Accounts");
    if (plan.chartingStatus === "QUERIED") queriers.push("Charting");
    if (plan.surconStatus === "QUERIED") queriers.push("SURCON");
    if (plan.recordsIStatus === "QUERIED") queriers.push("Records I");
    if (plan.recordsIIStatus === "QUERIED") queriers.push("Records II");

    const comments = [];
    if (plan.accountsComment)
      comments.push(`Accounts: ${plan.accountsComment}`);
    if (plan.chartingComment)
      comments.push(`Charting: ${plan.chartingComment}`);
    if (plan.surconComment) comments.push(`SURCON: ${plan.surconComment}`);
    if (plan.recordsIComment)
      comments.push(`Records I: ${plan.recordsIComment}`);
    if (plan.recordsIIComment)
      comments.push(`Records II: ${plan.recordsIIComment}`);

    return {
      isQueried: queriers.length > 0,
      queriedBy: queriers.join(", "),
      comment: comments.length > 0 ? comments.join("\n") : undefined,
    };
  };

  const statsData = [
    {
      label: "Total Plans",
      value: pagination.total,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
      icon: FileText,
    },
    {
      label: "Pending",
      value: plans.filter((p) => p.status === "PENDING").length,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
      icon: Clock,
    },
    {
      label: "Lodged",
      value: plans.filter((p) => p.status === "LODGED").length,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
      icon: CheckCircle,
    },
    {
      // `redCopyStatus` has no "APPROVED" value in its enum (NOT_SUBMITTED
      // / SUBMITTED / COMPLETED / FAILED) — this always evaluated to 0.
      // `redCopyFileUrl` is the same field the row-level "Record Copy"
      // badge below already treats as the source of truth for "uploaded".
      label: "Red Copy",
      value: plans.filter((p) => !!p.redCopyFileUrl).length,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
      icon: QrCode,
    },
  ];

  // Skeleton loading components
  const StatsSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-surface rounded-lg p-4 border border-gray-100 dark:border-white/10 shadow-sm"
        >
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );

  const TableRowSkeleton = () => (
    <tr className="border-b border-gray-200 dark:border-white/10">
      <td className="px-6 py-4">
        <Skeleton className="h-4 w-4" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      <td className="hidden lg:table-cell px-6 py-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </td>
      <td className="hidden md:table-cell px-6 py-4">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="hidden md:table-cell px-6 py-4">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className="hidden sm:table-cell px-6 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="hidden xl:table-cell px-6 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-6 py-4">
        <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
      </td>
    </tr>
  );

  const GridCardSkeleton = () => (
    <Card className="relative">
      <div className="absolute top-3 right-3">
        <Skeleton className="h-4 w-4" />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 w-4 mt-0.5" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 w-4 mt-0.5" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-36 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-2 pt-3 border-t">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-10" />
        </div>
      </CardContent>
    </Card>
  );

  const PlansListSkeleton = () => (
    <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left">
                <Skeleton className="h-4 w-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
              <th className="hidden lg:table-cell px-6 py-3 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left">
                <Skeleton className="h-4 w-14" />
              </th>
              <th className="hidden sm:table-cell px-6 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="hidden xl:table-cell px-6 py-3 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="px-6 py-3 text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const PlansGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <GridCardSkeleton key={i} />
      ))}
    </div>
  );

  if (loading && plans.length === 0) {
    return (
      <div className="min-h-full w-full max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-72" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
          <StatsSkeleton />
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white dark:bg-surface rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <Skeleton className="flex-1 h-10" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        {/* Plans Skeleton - show based on viewMode */}
        {viewMode === "list" ? <PlansListSkeleton /> : <PlansGridSkeleton />}
      </div>
    );
  }

  return (
    <div className="min-h-full w-full max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8 sm:py-8 mb-6 shadow-lg"
          style={{
            background:
              "linear-gradient(120deg, var(--color-brand-primary-dark), var(--color-brand-primary))",
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-4 -bottom-18 h-40 w-40 rounded-full bg-white/10"
            aria-hidden
          />

          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
                Survey plans
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Your Survey Plans
              </h1>
              <p className="text-white/75 mt-1.5 max-w-xl text-sm">
                Manage and review all your survey plan submissions in one place.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 backdrop-blur-xs"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setShowBatchesModal(true)}
                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-xs"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">My Batches</span>
                <span className="sm:hidden">Batches</span>
              </button>
              {hasSubscriptionAccess && (
                <button
                  onClick={() =>
                    (window.location.href = "/surfboard/dashboard/newplan")
                  }
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sm font-bold shadow-lg shadow-black/20 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ color: "var(--color-brand-primary-dark)" }}
                >
                  <Plus className="w-4 h-4" />
                  New Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {!isKycValidated && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl flex items-start gap-3 mb-6">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-sm">
                Action Required: Surveyor KYC Validation
              </p>
              <p className="text-xs opacity-90 mt-1">
                Your profile is pending validation. You will not be able to
                submit plans for CoD until an administrator has reviewed and
                validated your profile. Please ensure all your details are
                correctly set in the Settings page.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-xl bg-white dark:bg-surface p-4 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={`text-2xl font-bold ${stat.color} tabular-nums leading-tight`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {stat.label}
                  </div>
                </div>
                <div
                  className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scope — "Shared Access": My Plans / Shared with me / My Shared Plans */}
      <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setScope(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              scope === opt.id
                ? "bg-white text-[#1D4ED8] shadow-sm dark:bg-white/10 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            {opt.label}
            {opt.id === "sharedWithMe" && !!sharedWithMeCount && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                  scope === "sharedWithMe"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                    : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                )}
              >
                {sharedWithMeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-3 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by plan number, title, facilitator, or pillar number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-surface focus:border-blue-200 transition-colors"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                showFilters
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white dark:bg-surface border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters() && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                    showFilters
                      ? "bg-white/25 text-white"
                      : "bg-blue-100 text-blue-700"
                  )}
                >
                  {filters.status.length +
                    filters.planType.length +
                    (filters.dateFrom ? 1 : 0) +
                    (filters.dateTo ? 1 : 0)}
                </span>
              )}
            </button>

            <div className="flex bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/15 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-white dark:bg-surface text-blue-600 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-white dark:bg-surface text-blue-600 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={plans.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      <AnimatePresence>
        {hasActiveFilters() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
              {filters.status.map((status) => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface"
                >
                  <span className="text-xs font-medium">Status: {status}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleStatusChange(status)}
                  />
                </Badge>
              ))}
              {filters.planType.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface"
                >
                  <span className="text-xs font-medium">Type: {type}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handlePlanTypeChange(type)}
                  />
                </Badge>
              ))}
              {filters.dateFrom && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface"
                >
                  <span className="text-xs font-medium">
                    From: {format(filters.dateFrom, "MMM d, yyyy")}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleDateChange("dateFrom", undefined)}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface"
                >
                  <span className="text-xs font-medium">
                    To: {format(filters.dateTo, "MMM d, yyyy")}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600"
                    onClick={() => handleDateChange("dateTo", undefined)}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 text-xs font-medium h-auto py-1.5"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Status
                  </label>
                  <div className="space-y-2.5">
                    {PLAN_STATUSES.map((status) => (
                      <label
                        key={status}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={() => handleStatusChange(status)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-white/15 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 transition-colors">
                          {status.replace("_", " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Plan Type Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Plan Type
                  </label>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2">
                    {PLAN_TYPES.map((type) => (
                      <label
                        key={type}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.planType.includes(type)}
                          onChange={() => handlePlanTypeChange(type)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-white/15 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 transition-colors">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Date Range
                  </label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-auto transition-all duration-200",
                          "py-2 px-3 sm:py-3 sm:px-4",
                          "justify-between text-left font-normal",
                          "bg-white dark:bg-surface hover:bg-linear-to-r hover:from-blue-50 hover:to-purple-50",
                          "border-2 border-gray-200 dark:border-white/10 hover:border-blue-300",
                          "shadow-sm hover:shadow-md",
                          !filters.dateFrom &&
                            !filters.dateTo &&
                            "text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="p-1.5 sm:p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg shrink-0">
                            <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {filters.dateFrom || filters.dateTo ? (
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-linear-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm">
                                  <CalendarIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white shrink-0" />
                                  <span className="text-[0.65rem] sm:text-xs font-semibold text-white whitespace-nowrap">
                                    {filters.dateFrom
                                      ? new Date(
                                          filters.dateFrom
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "Start"}
                                  </span>
                                </div>
                                <svg
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                  />
                                </svg>
                                <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-linear-to-r from-purple-500 to-purple-600 rounded-lg shadow-sm">
                                  <CalendarIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white shrink-0" />
                                  <span className="text-[0.65rem] sm:text-xs font-semibold text-white whitespace-nowrap">
                                    {filters.dateTo
                                      ? new Date(
                                          filters.dateTo
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "End"}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Select Date Range
                                </span>
                                <span className="text-[0.65rem] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                  Choose from presets or custom dates
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[calc(100vw-2rem)] sm:w-auto max-w-[calc(100vw-2rem)] sm:max-w-6xl p-2 shadow-2xl border-2 border-gray-200 dark:border-white/10"
                      align="start"
                    >
                      <div className="flex flex-col lg:flex-row max-h-[80vh] overflow-auto">
                        {/* Preset Options - Enhanced Design */}
                        <div className="border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-white/10 bg-linear-to-br from-gray-50 to-white lg:min-w-50">
                          <div className="p-3 sm:p-4 lg:p-5 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-surface">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 sm:p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-md">
                                <svg
                                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                Quick Select
                              </h3>
                            </div>
                          </div>

                          <div className="p-2 sm:p-3 lg:p-4 space-y-1 sm:space-y-1.5 lg:space-y-2 w-min">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 hover:bg-linear-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 transition-all duration-200 rounded-lg"
                              onClick={() => {
                                const today = new Date();
                                handleDateChange("dateFrom", today);
                                handleDateChange("dateTo", today);
                              }}
                            >
                              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500 mr-2 sm:mr-3"></span>
                              Today
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 hover:bg-linear-to-r hover:from-indigo-50 hover:to-indigo-100 hover:text-indigo-700 transition-all duration-200 rounded-lg"
                              onClick={() => {
                                const today = new Date();
                                const lastWeek = new Date();
                                lastWeek.setDate(today.getDate() - 7);
                                handleDateChange("dateFrom", lastWeek);
                                handleDateChange("dateTo", today);
                              }}
                            >
                              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500 mr-2 sm:mr-3"></span>
                              Last 7 days
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 hover:bg-linear-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-700 transition-all duration-200 rounded-lg"
                              onClick={() => {
                                const today = new Date();
                                const lastMonth = new Date();
                                lastMonth.setDate(today.getDate() - 30);
                                handleDateChange("dateFrom", lastMonth);
                                handleDateChange("dateTo", today);
                              }}
                            >
                              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-500 mr-2 sm:mr-3"></span>
                              Last 30 days
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 hover:bg-linear-to-r hover:from-pink-50 hover:to-pink-100 hover:text-pink-700 transition-all duration-200 rounded-lg"
                              onClick={() => {
                                const today = new Date();
                                const firstDay = new Date(
                                  today.getFullYear(),
                                  today.getMonth(),
                                  1
                                );
                                handleDateChange("dateFrom", firstDay);
                                handleDateChange("dateTo", today);
                              }}
                            >
                              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-pink-500 mr-2 sm:mr-3"></span>
                              This month
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 hover:bg-linear-to-r hover:from-rose-50 hover:to-rose-100 hover:text-rose-700 transition-all duration-200 rounded-lg"
                              onClick={() => {
                                const today = new Date();
                                const firstDayLastMonth = new Date(
                                  today.getFullYear(),
                                  today.getMonth() - 1,
                                  1
                                );
                                const lastDayLastMonth = new Date(
                                  today.getFullYear(),
                                  today.getMonth(),
                                  0
                                );
                                handleDateChange("dateFrom", firstDayLastMonth);
                                handleDateChange("dateTo", lastDayLastMonth);
                              }}
                            >
                              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500 mr-2 sm:mr-3"></span>
                              Last month
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 hover:bg-linear-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700 transition-all duration-200 rounded-lg"
                              onClick={() => {
                                const today = new Date();
                                const lastYear = new Date();
                                lastYear.setFullYear(today.getFullYear() - 1);
                                handleDateChange("dateFrom", lastYear);
                                handleDateChange("dateTo", today);
                              }}
                            >
                              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-orange-500 mr-2 sm:mr-3"></span>
                              Last year
                            </Button>
                            <div className="pt-2 sm:pt-2.5 lg:pt-3 mt-2 sm:mt-2.5 lg:mt-3 border-t border-gray-200 dark:border-white/10">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs sm:text-sm font-medium py-2 sm:py-2.5 lg:py-3 text-red-600 hover:bg-linear-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all duration-200 rounded-lg"
                                onClick={() => {
                                  handleDateChange("dateFrom", undefined);
                                  handleDateChange("dateTo", undefined);
                                }}
                              >
                                <svg
                                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-3"
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
                                Clear dates
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Calendar Pickers - Side by Side on Desktop */}
                        <div className="bg-white dark:bg-surface flex-1">
                          <div className="p-3 sm:p-4 lg:p-5 border-b border-gray-200 dark:border-white/10 bg-linear-to-r from-blue-50 to-purple-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 sm:p-2 bg-linear-to-br from-blue-500 to-blue-600 rounded-md shadow-sm">
                                  <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                                  Custom Range
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 sm:p-4 lg:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                              <div>
                                <div className="mb-2 sm:mb-3 lg:mb-4 flex items-center gap-2">
                                  <div className="w-1 h-4 sm:h-5 bg-linear-to-b from-blue-500 to-blue-600 rounded-full"></div>
                                  <label className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                    Start Date
                                  </label>
                                </div>
                                <Calendar
                                  mode="single"
                                  selected={filters.dateFrom}
                                  onSelect={(date: any) =>
                                    handleDateChange(
                                      "dateFrom",
                                      date || undefined
                                    )
                                  }
                                  initialFocus
                                  disabled={(date) =>
                                    filters.dateTo
                                      ? date > filters.dateTo
                                      : false
                                  }
                                  className="rounded-xl border-2 border-blue-100 p-1.5 sm:p-2 lg:p-3 w-full min-w-50 max-w-xs"
                                />
                              </div>
                              <div>
                                <div className="mb-2 sm:mb-3 lg:mb-4 flex items-center gap-2">
                                  <div className="w-1 h-4 sm:h-5 bg-linear-to-b from-purple-500 to-purple-600 rounded-full"></div>
                                  <label className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                                    End Date
                                  </label>
                                </div>
                                <Calendar
                                  mode="single"
                                  selected={filters.dateTo}
                                  onSelect={(date: any) =>
                                    handleDateChange(
                                      "dateTo",
                                      date || undefined
                                    )
                                  }
                                  disabled={(date) =>
                                    filters.dateFrom
                                      ? date < filters.dateFrom
                                      : false
                                  }
                                  className="rounded-xl border-2 border-purple-100 p-1.5 sm:p-2 lg:p-3 w-full min-w-50 max-w-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plans Table/Grid */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/10">
              <thead className="bg-gray-50/80 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3.5 text-left">
                    <Checkbox
                      checked={
                        plans.length > 0 &&
                        selectedPlans.length === plans.length
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan Details
                  </th>
                  <th className="hidden lg:table-cell px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="hidden md:table-cell px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Facilitator
                  </th>
                  <th className="hidden md:table-cell px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Survey Date
                  </th>
                  <th className="hidden xl:table-cell px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-surface divide-y divide-gray-100 dark:divide-white/10">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                        <FileText className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">
                        No plans found
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  plans.map((plan, index) => (
                    <motion.tr
                      key={plan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedPlans.includes(plan.id)}
                          onCheckedChange={() => handleSelectPlan(plan.id)}
                          aria-label={`Select plan ${plan.planNumber}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg shrink-0 ring-1 ring-inset ring-blue-100 dark:ring-blue-500/20">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                              className="font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 transition-colors block max-w-xs"
                              title={plan.planNumber || "N/A"}
                            >
                              {plan.planNumber || "N/A"}
                            </Link>

                            <div
                              className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs"
                              title={plan.surveyTitle || "Untitled"}
                            >
                              {plan.surveyTitle || "Untitled"}
                            </div>

                            <div className="mt-1">
                              <SharedBadge plan={plan} />
                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span>{plan?.pillars?.length || 0} pillars</span>
                              <span>•</span>
                              <span>
                                {(plan.areaSqM || 0).toLocaleString()} m²
                              </span>
                              <span>•</span>
                              {plan.redCopyFileUrl ? (
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                                  title="Record copy uploaded"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-xs">Record Copy</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
                                  title="Record copy not uploaded"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span className="text-xs">
                                    No Record Copy
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="md:hidden mt-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                  getDisplayStatus(plan)
                                )}`}
                              >
                                {getStatusIcon(getDisplayStatus(plan))}
                                {getDisplayStatus(plan)?.replace("_", " ") ||
                                  "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            {plan.ward && (
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {plan.ward}
                              </div>
                            )}
                            {plan.lga && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {plan.lga}
                              </div>
                            )}
                            {!plan.ward && !plan.lga && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                N/A
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                          <div
                            className="text-sm text-gray-900 dark:text-white truncate max-w-37.5"
                            title={plan.facilitator || "N/A"}
                          >
                            {plan.facilitator || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            getDisplayStatus(plan)
                          )}`}
                        >
                          {getStatusIcon(getDisplayStatus(plan))}
                          {getDisplayStatus(plan)?.replace("_", " ") || "N/A"}
                        </span>
                        {/* Queried Indicator */}
                        {isQueried(plan) && (
                          <div className="mt-1">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
                              title={`Queried by ${
                                getQueryInfo(plan).queriedBy
                              }${
                                getQueryInfo(plan).comment
                                  ? `: ${getQueryInfo(plan).comment}`
                                  : ""
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Queried
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <div className="flex items-start gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                          <div className="text-sm text-gray-900 dark:text-white">
                            {plan.dateOnSurveyPlan
                              ? new Date(
                                  plan.dateOnSurveyPlan
                                ).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="hidden xl:table-cell px-6 py-4">
                        <div className="flex items-start gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                          <div className="text-sm text-gray-900 dark:text-white">
                            {plan.updatedAt
                              ? new Date(plan.updatedAt).toLocaleDateString()
                              : "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleViewPlan(plan.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {scope !== "sharedWithMe" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleEditPlan(plan.id)}
                                    disabled={isPlanLocked(plan)}
                                    className={
                                      isPlanLocked(plan)
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    {isPlanLocked(plan)
                                      ? "Edit Plan (Locked)"
                                      : "Edit Plan"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (!isKycValidated) {
                                        toast.error(
                                          "You must complete your KYC validation in the Settings page to submit plans for CoD."
                                        );
                                        return;
                                      }
                                      setSelectedPlans([plan.id]);
                                      setBatchModalOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Submit for Certificate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleGenerateQrCode(plan.id)
                                    }
                                  >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    QR Code
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(plan.id)}
                                    disabled={
                                      (isDeleting &&
                                        planToDelete === plan.id) ||
                                      isPlanLocked(plan)
                                    }
                                    className={`text-red-600 focus:text-red-600 focus:bg-red-50 ${
                                      isPlanLocked(plan)
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    {isDeleting && planToDelete === plan.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4 mr-2" />
                                    )}
                                    {isDeleting && planToDelete === plan.id
                                      ? "Deleting..."
                                      : isPlanLocked(plan)
                                        ? "Delete (Locked)"
                                        : "Delete Plan"}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {plans.length > 0 && (
            <div className="bg-gray-50/60 dark:bg-white/5 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 dark:border-white/10 gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.pageSize,
                    pagination.total
                  )}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> plans
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-27.5 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        Show {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-surface border border-gray-200 dark:border-white/15 rounded-lg min-w-25 text-center">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
                <FileText className="w-6 h-6 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                No plans found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="rounded-xl border-gray-100 dark:border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative">
                  {/* Selection Checkbox for Grid */}
                  <div className="absolute top-3 right-3 z-10">
                    <Checkbox
                      checked={selectedPlans.includes(plan.id)}
                      onCheckedChange={() => handleSelectPlan(plan.id)}
                      className="bg-white/80 backdrop-blur-xs border-gray-300 dark:border-white/15 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg shrink-0 ring-1 ring-inset ring-blue-100 dark:ring-blue-500/20">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/surfboard/dashboard/plan?planId=${plan.id}`}
                          >
                            <CardTitle className="text-base truncate hover:text-blue-600 transition-colors cursor-pointer">
                              {plan.planNumber || "N/A"}
                            </CardTitle>
                          </Link>
                          <CardDescription className="text-sm truncate">
                            {plan.surveyTitle || "Untitled"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            getDisplayStatus(plan)
                          )}`}
                        >
                          {getStatusIcon(getDisplayStatus(plan))}
                        </span>
                        {/* Queried Indicator */}
                        {isQueried(plan) && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
                            title={`Queried by ${getQueryInfo(plan).queriedBy}${
                              getQueryInfo(plan).comment
                                ? `: ${getQueryInfo(plan).comment}`
                                : ""
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Queried
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Location with LGA/Ward hierarchy like list view */}
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        {plan.ward && (
                          <div className="text-sm text-gray-900 dark:text-white truncate">
                            {plan.ward}
                          </div>
                        )}
                        {plan.lga && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {plan.lga}
                          </div>
                        )}
                        {!plan.ward && !plan.lga && (
                          <span className="text-gray-600 dark:text-gray-400">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Facilitator */}
                    <div className="flex items-start gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                      <span
                        className="text-gray-600 dark:text-gray-400 truncate"
                        title={plan.facilitator || "N/A"}
                      >
                        {plan.facilitator || "N/A"}
                      </span>
                    </div>

                    {/* Pillars and Area */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{plan.pillars?.length || 0} pillars</span>
                      <span>•</span>
                      <span>{(plan.areaSqM || 0).toLocaleString()} m²</span>
                    </div>

                    <SharedBadge plan={plan} />

                    {/* Record Copy Status */}
                    <div className="flex items-center gap-2 text-xs">
                      {plan.redCopyFileUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          <span>Record Copy Uploaded</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          <span>No Record Copy</span>
                        </span>
                      )}
                    </div>

                    {/* Survey Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-3 h-3" />
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Survey:
                      </span>
                      <span>
                        {plan.dateOnSurveyPlan
                          ? new Date(plan.dateOnSurveyPlan).toLocaleDateString()
                          : "No date"}
                      </span>
                    </div>

                    {/* Updated Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-3 h-3" />
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Updated:
                      </span>
                      <span>
                        {plan.updatedAt
                          ? new Date(plan.updatedAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewPlan(plan.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-3">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleViewPlan(plan.id)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {scope !== "sharedWithMe" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleEditPlan(plan.id)}
                                disabled={isPlanLocked(plan)}
                                className={
                                  isPlanLocked(plan)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {isPlanLocked(plan)
                                  ? "Edit Plan (Locked)"
                                  : "Edit Plan"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!isKycValidated) {
                                    toast.error(
                                      "You must complete your KYC validation in the Settings page to submit plans for CoD."
                                    );
                                    return;
                                  }
                                  setSelectedPlans([plan.id]);
                                  setBatchModalOpen(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Submit for Certificate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleGenerateQrCode(plan.id)}
                              >
                                <QrCode className="w-4 h-4 mr-2" />
                                QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(plan.id)}
                                disabled={
                                  (isDeleting && planToDelete === plan.id) ||
                                  isPlanLocked(plan)
                                }
                                className={`text-red-600 focus:text-red-600 focus:bg-red-50 ${
                                  isPlanLocked(plan)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {isDeleting && planToDelete === plan.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                {isDeleting && planToDelete === plan.id
                                  ? "Deleting..."
                                  : isPlanLocked(plan)
                                    ? "Delete (Locked)"
                                    : "Delete Plan"}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Pagination for Grid View */}
      {viewMode === "grid" && plans.length > 0 && (
        <div className="mt-6 bg-white dark:bg-surface rounded-xl shadow-sm border border-gray-200 dark:border-white/10 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing{" "}
            <span className="font-medium">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total
              )}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> plans
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-27.5 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    Show {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="h-9 w-9 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-surface border border-gray-200 dark:border-white/15 rounded-lg min-w-25 text-center">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-9 w-9 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="z-301 max-w-[90%] md:max-w-[75%] 2xl:max-w-7xl max-h-[90vh] overflow-y-auto flex flex-col justify-between gap-2">
          <DialogHeader>
            <DialogTitle>View Plan Details</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[85%] overflow-y-auto">
            {modalError ? (
              <PlanDetailsErrorState
                message={modalError}
                onRetry={() => selectedPlanId && handleViewPlan(selectedPlanId)}
                onGoBack={() => setViewModalOpen(false)}
              />
            ) : !selectedPlan ? (
              <PlanDetailsLoadingState />
            ) : (
              <>
                {modalLoading && (
                  <Dialog open={modalLoading}>
                    <DialogContent className="sm:max-w-md" hideCloseButton>
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-blue-600 animate-pulse" />
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            Refreshing Plan Data
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Please wait while we update the information...
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <OptimizedSinglePlanDetails
                  planData={selectedPlan}
                  onEdit={() => {
                    setViewModalOpen(false);
                    handleEditPlan(selectedPlan.id);
                  }}
                  onRefresh={() =>
                    selectedPlanId && refreshSelectedPlan(selectedPlanId)
                  }
                />
              </>
            )}{" "}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="z-301 max-w-[90%] md:max-w-[75%] 2xl:max-w-7xl max-h-[90vh] overflow-y-auto flex flex-col justify-between gap-2">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 max-h-[85%] overflow-y-auto">
            {modalError ? (
              <PlanFormErrorState
                message={modalError}
                onRetry={() => selectedPlanId && handleEditPlan(selectedPlanId)}
                onGoBack={() => setEditModalOpen(false)}
              />
            ) : !selectedPlan ? (
              <PlanFormLoadingState />
            ) : (
              <>
                {modalLoading && (
                  <Dialog open={modalLoading}>
                    <DialogContent className="sm:max-w-md" hideCloseButton>
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-100 border-t-green-600"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600 animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            Saving Changes
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Please wait while we save your updates...
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <SurfboardPlanForm
                  key={selectedPlan?.id || "edit-plan"}
                  mode="edit"
                  initial={selectedPlan}
                  onSuccess={handleEditSuccess}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              plan and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white dark:bg-surface rounded-lg border">
              {isGeneratingQr || !qrCodeDataUrl ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Generating QR Code...
                  </p>
                </div>
              ) : (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto"
                />
              )}
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setQrModalOpen(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrCodeDataUrl || "";
                  link.download = `plan-qrcode.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!qrCodeDataUrl}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Selection Bar */}
      <BatchSelectionBar
        selectedCount={selectedPlans.length}
        onSubmit={handleBatchSubmit}
        onClear={() => setSelectedPlans([])}
        onShare={handleBulkShare}
      />

      <BulkSharePlanModal
        isOpen={showBulkShareModal}
        onClose={() => {
          setShowBulkShareModal(false);
          loadPlans(pagination.page, pagination.pageSize);
        }}
        onShared={(updatedPlanIds, addedUser, removedUserId) => {
          if (updatedPlanIds && updatedPlanIds.length > 0) {
            setPlans((prev) =>
              prev.map((p) => {
                if (!updatedPlanIds.includes(p.id)) return p;
                let nextSharedTo = [...(p.sharedTo || [])];
                let nextSharedToUsers = [...((p as any).sharedToUsers || [])];
                if (addedUser) {
                  if (!nextSharedTo.includes(addedUser.id)) {
                    nextSharedTo.push(addedUser.id);
                  }
                  if (
                    !nextSharedToUsers.some((u: any) => u.id === addedUser.id)
                  ) {
                    nextSharedToUsers.push({
                      id: addedUser.id,
                      firstName: addedUser.firstName,
                      lastName: addedUser.lastName,
                      email: addedUser.email,
                      surconRegNumber: addedUser.surconRegNumber,
                    });
                  }
                }
                if (removedUserId) {
                  nextSharedTo = nextSharedTo.filter(
                    (id) => id !== removedUserId
                  );
                  nextSharedToUsers = nextSharedToUsers.filter(
                    (u: any) => u.id !== removedUserId
                  );
                }
                return {
                  ...p,
                  sharedTo: nextSharedTo,
                  sharedToUsers: nextSharedToUsers,
                };
              })
            );
          }
          loadPlans(pagination.page, pagination.pageSize);
        }}
        plans={plans.filter((p) => selectedPlans.includes(p.id))}
      />

      {/* Record Copy Upload Modal */}
      <RecordCopyUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        selectedPlans={plans.filter((p) => selectedPlans.includes(p.id))}
        onUploadComplete={handleUploadComplete}
        onRemovePlan={(planId) => {
          setSelectedPlans((prev) => prev.filter((id) => id !== planId));

          if (selectedPlans.length === 0) {
            setUploadModalOpen(false);
          }
        }}
      />

      {/* Batch Submission Modal */}
      <BatchSubmissionModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        selectedPlans={plans.filter((p) => selectedPlans.includes(p.id))}
        onSuccess={handleBatchSuccess}
        onRemovePlan={(planId) => {
          setSelectedPlans((prev) => prev.filter((id) => id !== planId));

          if (selectedPlans.length === 0) {
            setBatchModalOpen(false);
          }
        }}
      />

      {/* Submitted Batches Modal */}
      <SubmittedBatchesModal
        isOpen={showBatchesModal}
        onClose={() => setShowBatchesModal(false)}
        onSuccess={() => {
          // Refresh plans after successful payment
          loadPlans(pagination.page, pagination.pageSize);
        }}
      />
    </div>
  );
}
