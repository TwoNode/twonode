"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  FileText,
  Loader2,
  XCircle,
  ExternalLink,
  Award,
  AlertTriangle,
  Clock,
  History,
  User,
  Hash,
  Briefcase,
  Mail,
  Phone,
  Lock,
  Search,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import { useBatchLock } from "../../../hooks/useBatchLock";
import { RemarkSelector } from "../../../components/RemarkSelector";
import { PlanLockWarningDialog } from "../../../components/PlanLockWarningDialog";
import { VerificationResultModal } from "../../../components/VerificationResultModal";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  planType?: string;
  referencePlanNumber?: string | null;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  locality: string | null;
  deededArea: string;
  chartingRemarks: string | null;
  redCopyFileUrl: string | null;
  intakeApprovedAt?: Date;
  // History fields
  recordsIIStatus?: string;
  recordsIIComment?: string | null;
  recordsIIApprovedAt?: Date;
  recordsIIApprovedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  isLocked?: boolean;
  isLockedByMe?: boolean;
  recordCopyVerdict?: string | null;
  recordCopyVerificationData?: any;
}

interface Batch {
  id: string;
  batchCode: string;
  createdAt: Date;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    surconRegNumber: string | null;
    companyName: string | null;
  } | null;
  plans: Plan[];
  _count?: { plans: number };
  isBatchLockedByMe?: boolean;
  batchLockExpiresAt?: Date | null;
}

export default function RecordsIIAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [historyBatches, setHistoryBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state — supports both batch-level and plan-level actions
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"batch" | "plan">("plan");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [uniqueQueryReasons, setUniqueQueryReasons] = useState<string[]>([]);

  // Image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeVerificationModal, setActiveVerificationModal] = useState<{
    isOpen: boolean;
    data: any;
    planNumber: string;
  }>({ isOpen: false, data: null, planNumber: "" });

  // Batch lock management
  const {
    lockedBatchId,
    lockedBatchCode,
    lockExpiresAt,
    lockedPlanCount,
    isLocking,
    isBatchLockedByMe,
    releaseLock,
    acquireLock,
    showLeaveWarning,
    confirmLeave,
    cancelLeave,
  } = useBatchLock({
    role: "RECORDS_II",
    onLockAcquired: (batchId, batchCode, planCount) => {
      toast.success(
        `Batch ${batchCode} locked (${planCount} plan${planCount !== 1 ? "s" : ""}, ${planCount * 3}min)`
      );
    },
    onLockReleased: () => {
      toast.info("Batch lock released");
    },
  });

  // Filter batches based on search query
  const filteredBatches = useMemo(() => {
    let result = batches;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = batches.filter((b) => {
        const matchesBatchCode = b.batchCode.toLowerCase().includes(query);
        const matchesUser =
          b.submitter &&
          (`${b.submitter.firstName} ${b.submitter.lastName}`
            .toLowerCase()
            .includes(query) ||
            b.submitter.surconRegNumber?.toLowerCase().includes(query));
        const matchesPlan = b.plans.some(
          (p) =>
            p.planNumber.toLowerCase().includes(query) ||
            p.surveyTitle.toLowerCase().includes(query) ||
            p.lga?.toLowerCase().includes(query) ||
            p.ward?.toLowerCase().includes(query)
        );
        return matchesBatchCode || matchesUser || matchesPlan;
      });
    }

    if (lockedBatchId) {
      const lockedBatchIndex = result.findIndex(
        (b) => b.id === lockedBatchId
      );
      if (lockedBatchIndex > -1) {
        const lockedBatch = result[lockedBatchIndex];
        result = [
          lockedBatch,
          ...result.slice(0, lockedBatchIndex),
          ...result.slice(lockedBatchIndex + 1),
        ];
      }
    }
    return result;
  }, [batches, searchQuery, lockedBatchId]);

  const filteredHistoryBatches = useMemo(() => {
    if (!searchQuery.trim()) return historyBatches;
    const query = searchQuery.toLowerCase();
    return historyBatches.filter((b) => {
      const matchesBatchCode = b.batchCode.toLowerCase().includes(query);
      const matchesUser =
        b.submitter &&
        (`${b.submitter.firstName} ${b.submitter.lastName}`
          .toLowerCase()
          .includes(query) ||
          b.submitter.surconRegNumber?.toLowerCase().includes(query));
      const matchesPlan = b.plans.some(
        (p) =>
          p.planNumber.toLowerCase().includes(query) ||
          p.surveyTitle.toLowerCase().includes(query)
      );
      return matchesBatchCode || matchesUser || matchesPlan;
    });
  }, [historyBatches, searchQuery]);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await releaseLock();
      await fetchBatches();
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchUniqueRemarks();
  }, []);

  const fetchUniqueRemarks = async () => {
    try {
      const res = await surfboardApi.mda.remarks.queryReasons("records-ii");
      if (res.success && res.data) {
        setUniqueQueryReasons(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch unique remarks", error);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && historyBatches.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const result = await surfboardApi.mda.recordsII.batches();
      if (result.success) {
        setBatches(result.data as any);
      } else {
        toast.error(result.error || "Failed to fetch batches");
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("An error occurred while fetching batches");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await surfboardApi.mda.recordsII.batches("history");
      if (result.success) {
        setHistoryBatches(result.data as any);
      } else {
        toast.error(result.error || "Failed to fetch history");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("An error occurred while fetching history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Plan-level action
  const handlePlanActionClick = (
    plan: Plan,
    batch: Batch,
    action: "approve" | "query"
  ) => {
    setSelectedPlan(plan);
    setSelectedBatch(batch);
    setDialogMode("plan");
    setActionType(action);
    setComment("");
    setShowDialog(true);
  };

  // Batch-level action
  const handleBatchActionClick = (
    batch: Batch,
    action: "approve" | "query"
  ) => {
    setSelectedBatch(batch);
    setSelectedPlan(null);
    setDialogMode("batch");
    setActionType(action);
    setComment("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (dialogMode === "batch") {
      await handleBatchSubmit();
    } else {
      await handlePlanSubmit();
    }
  };

  const handlePlanSubmit = async () => {
    if (!selectedPlan) return;

    if (actionType === "query" && !comment.trim()) {
      toast.error("Please provide a reason for the query");
      return;
    }

    try {
      setProcessing(true);
      setProcessingPlanId(selectedPlan.id);
      const result = await surfboardApi.mda.recordsII.decide(
        selectedPlan.id,
        actionType === "approve",
        comment.trim() || undefined
      );

      if (result.success) {
        toast.success(
          actionType === "approve"
            ? `Plan ${selectedPlan.planNumber} has been lodged successfully!`
            : `Plan ${selectedPlan.planNumber} has been queried`
        );
        setShowDialog(false);
        await fetchBatches();
        await acquireLock();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating Records II status:", error);
      toast.error("An error occurred while updating status");
    } finally {
      setProcessing(false);
      setProcessingPlanId(null);
    }
  };

  const handleBatchSubmit = async () => {
    if (!selectedBatch) return;

    if (actionType === "query" && !comment.trim()) {
      toast.error("Please provide a reason for querying the batch");
      return;
    }

    try {
      setProcessing(true);

      // Process all plans in the batch sequentially
      let successCount = 0;
      let failedCount = 0;

      for (const plan of selectedBatch.plans) {
        const result = await surfboardApi.mda.recordsII.decide(
          plan.id,
          actionType === "approve",
          comment.trim() || undefined
        );
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      if (failedCount === 0) {
        toast.success(
          actionType === "approve"
            ? `All ${successCount} plans in Batch ${selectedBatch.batchCode} lodged successfully!`
            : `All ${successCount} plans in Batch ${selectedBatch.batchCode} queried`
        );
      } else {
        toast.warning(
          `${successCount} succeeded, ${failedCount} failed in Batch ${selectedBatch.batchCode}`
        );
      }

      setShowDialog(false);
      await fetchBatches();
      await acquireLock();
      if (activeTab === "history") {
        fetchHistory();
      }
    } catch (error) {
      console.error("Error processing batch:", error);
      toast.error("An error occurred while processing batch");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const getStatusBadgeFull = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700">Lodged</Badge>;
      case "QUERIED":
        return <Badge className="bg-red-100 text-red-700">Queried</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading batches...</p>
        </div>
      </div>
    );
  }

  // Count total pending plans across all batches
  const totalPendingPlans = filteredBatches.reduce(
    (sum, b) => sum + b.plans.length,
    0
  );

  const renderBatchCard = (batch: Batch, isHistory: boolean = false) => {
    const isBatchMine = !isHistory && isBatchLockedByMe(batch.id);
    const isDisabled = !isHistory && !isBatchMine;
    const isQueried =
      isHistory && batch.plans.some((p) => p.recordsIIStatus === "QUERIED");
    const isApproved =
      isHistory &&
      !isQueried &&
      batch.plans.every((p) => p.recordsIIStatus === "APPROVED");

    return (
      <Card
        key={batch.id}
        className={`transition-all duration-200 ${
          isHistory
            ? isQueried
              ? "border-l-4 border-l-red-400"
              : isApproved
                ? "border-l-4 border-l-green-400"
                : ""
            : isBatchMine
              ? "border-2 border-blue-200 ring-2 ring-blue-100"
              : "border-2 border-gray-200 opacity-60 grayscale-30"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-xl">
                  Batch {batch.batchCode}
                </CardTitle>
                {isHistory && (
                  <Badge
                    className={
                      isQueried
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }
                  >
                    {isQueried ? "Queried" : "Lodged"}
                  </Badge>
                )}
                {!isHistory &&
                  (isBatchMine ? (
                    <Badge className="bg-blue-100 text-blue-700">
                      <Lock className="w-3 h-3 mr-1" />
                      Locked by you
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      View Only
                    </Badge>
                  ))}
              </div>
              <CardDescription className="mt-1">
                Submitted on {formatDate(batch.createdAt)} •{" "}
                {batch.plans.length} plan
                {batch.plans.length !== 1 ? "s" : ""} in batch
              </CardDescription>
              {!isHistory &&
                batch._count &&
                batch._count.plans > batch.plans.length && (
                  <div className="flex items-center gap-2 mt-2">
                    <Progress
                      value={
                        (batch.plans.length / batch._count.plans) * 100
                      }
                      className="w-32 h-2"
                    />
                    <span className="text-xs text-gray-600">
                      {batch.plans.length}/{batch._count.plans} ready for
                      Records II
                    </span>
                  </div>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Surveyor Information */}
          {batch.submitter && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-semibold text-emerald-800">
                  Surveyor Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-600">Submitted By</p>
                    <p className="text-sm font-medium text-gray-900">
                      {batch.submitter.firstName} {batch.submitter.lastName}
                    </p>
                  </div>
                </div>
                {batch.submitter.surconRegNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">SURCON Number</p>
                      <p className="text-sm font-medium text-gray-900">
                        {batch.submitter.surconRegNumber}
                      </p>
                    </div>
                  </div>
                )}
                {batch.submitter.companyName && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">Company</p>
                      <p className="text-sm font-medium text-gray-900">
                        {batch.submitter.companyName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-600">Email</p>
                    <p className="text-sm font-medium text-gray-900">
                      {batch.submitter.email}
                    </p>
                  </div>
                </div>
                {batch.submitter.phoneNumber && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {batch.submitter.phoneNumber}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans in this Batch */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
              Plans in this Batch
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {batch.plans.map((p) => {
                const isPlanProcessing = processingPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    className="p-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    {/* Plan header */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {p.planNumber}
                        </span>
                        <span className="text-gray-500">{p.surveyTitle}</span>
                        {p.planType && (
                          <Badge variant="secondary" className="text-xs">
                            {p.planType}
                          </Badge>
                        )}
                        {p.referencePlanNumber && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                            Ref: {p.referencePlanNumber}
                          </span>
                        )}
                      </div>
                      {isHistory && p.recordsIIStatus && (
                        <div className="flex items-center gap-2">
                          {getStatusBadgeFull(p.recordsIIStatus)}
                        </div>
                      )}
                    </div>

                    {/* Location info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg mb-3 text-xs">
                      <div>
                        <p className="text-gray-500">LGA</p>
                        <p className="font-medium">{p.lga || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Ward</p>
                        <p className="font-medium">{p.ward || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">LCDA</p>
                        <p className="font-medium">{p.lcda || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Deeded Area</p>
                        <p className="font-medium">{p.deededArea}</p>
                      </div>
                    </div>

                    {/* Charting Remarks */}
                    {p.chartingRemarks && (
                      <div className="bg-purple-50 p-3 rounded-lg mb-3">
                        <p className="text-xs font-medium text-purple-800 mb-1">
                          Charting Remarks
                        </p>
                        <p className="text-xs text-purple-700">
                          {p.chartingRemarks}
                        </p>
                      </div>
                    )}

                    {/* Record Copy Document */}
                    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        {!isHistory && (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        <FileText className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-medium text-blue-800">
                          {!isHistory
                            ? "Verify Physical Copy Matches Uploaded Copy"
                            : "Record Copy"}
                        </p>
                      </div>
                      {p.redCopyFileUrl ? (
                        <div className="space-y-2">
                          {isImageUrl(p.redCopyFileUrl) && (
                            <div
                              className="cursor-pointer inline-block"
                              onClick={() =>
                                setViewingImage(p.redCopyFileUrl)
                              }
                            >
                              <img
                                src={p.redCopyFileUrl}
                                alt={`Record Copy - ${p.planNumber}`}
                                className="max-h-32 rounded border shadow-sm hover:shadow-md transition-shadow"
                              />
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Click to view full size
                              </p>
                            </div>
                          )}
                          <a
                            href={p.redCopyFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded border text-blue-600 hover:bg-blue-50 transition-colors text-xs"
                          >
                            {isImageUrl(p.redCopyFileUrl) ? (
                              <ImageIcon className="w-3.5 h-3.5" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            Open Record Copy
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {p.recordCopyVerdict && p.recordCopyVerificationData && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="inline-flex items-center gap-1.5 ml-2 bg-white text-xs h-8"
                              onClick={() =>
                                setActiveVerificationModal({
                                  isOpen: true,
                                  data: p.recordCopyVerificationData,
                                  planNumber: p.planNumber,
                                })
                              }
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Verification Results
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-red-600">
                          No record copy uploaded
                        </p>
                      )}
                    </div>

                    {/* History info */}
                    {isHistory && p.recordsIIApprovedAt && (
                      <div className="bg-gray-50 p-3 rounded-lg text-sm mb-3">
                        <p className="text-gray-600">
                          <span className="font-medium">Reviewed by:</span>{" "}
                          {p.recordsIIApprovedByUser
                            ? `${p.recordsIIApprovedByUser.firstName} ${p.recordsIIApprovedByUser.lastName}`
                            : "Unknown"}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Date:</span>{" "}
                          {formatDate(p.recordsIIApprovedAt)}
                        </p>
                        {p.recordsIIStatus === "QUERIED" &&
                          p.recordsIIComment && (
                            <p className="text-red-600 mt-2">
                              <span className="font-medium">
                                Query Reason:
                              </span>{" "}
                              {p.recordsIIComment}
                            </p>
                          )}
                      </div>
                    )}

                    {/* Per-Plan Action Buttons */}
                    {!isHistory && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handlePlanActionClick(p, batch, "approve")
                          }
                          className="bg-green-600 hover:bg-green-700 text-xs h-8"
                          disabled={isDisabled || isPlanProcessing}
                        >
                          {isPlanProcessing ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : isDisabled ? (
                            <Lock className="w-3 h-3 mr-1" />
                          ) : (
                            <Award className="w-3 h-3 mr-1" />
                          )}
                          {isDisabled ? "View Only" : "Lodge Plan"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handlePlanActionClick(p, batch, "query")
                          }
                          className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-8"
                          disabled={isDisabled || isPlanProcessing}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Query Plan
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch-Level Action Buttons (only if > 1 plan) */}
          {!isHistory && batch.plans.length > 1 && (
            <div className="flex gap-3 pt-2 border-t border-gray-200">
              <Button
                onClick={() => handleBatchActionClick(batch, "approve")}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isDisabled}
              >
                {isDisabled ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    View Only
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Lodge All ({batch.plans.length} plans)
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleBatchActionClick(batch, "query")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                disabled={isDisabled}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Query All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Determine dialog labels based on mode
  const dialogTarget =
    dialogMode === "batch"
      ? `Batch ${selectedBatch?.batchCode}`
      : `Plan ${selectedPlan?.planNumber}`;

  return (
    <>
      {/* Leave Warning Dialog */}
      <PlanLockWarningDialog
        isOpen={showLeaveWarning}
        planNumber={lockedBatchCode ? `Batch ${lockedBatchCode}` : null}
        onConfirmLeave={confirmLeave}
        onCancel={cancelLeave}
      />

      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Records II Admin
          </h1>
          <p className="text-gray-600 mt-1">
            Final approval before submission to OSSG — verify physical copies
            match uploaded copies
          </p>
        </div>

        {/* Lock Status Indicator */}
        {lockedBatchCode && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                <strong>Batch {lockedBatchCode}</strong> locked ({lockedPlanCount} plan{lockedPlanCount !== 1 ? "s" : ""})
                {lockExpiresAt && (
                  <span className="text-blue-600 ml-1">
                    • Expires {formatDate(lockExpiresAt)}
                  </span>
                )}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="text-xs"
            >
              {isUnlocking ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : null}
              Release Lock
            </Button>
          </div>
        )}

        {isLocking && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">
              Acquiring batch lock...
            </span>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Award className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              This is the final approval step
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Only plans where all 5 approvals (Accounts, Charting, SURCON,
              Records I, Intake) are complete appear here. Batches are locked to
              you for review — {lockedPlanCount > 0 ? `${lockedPlanCount * 3} minutes` : "3 minutes per plan"}.
              Upon approval, plans are submitted to OSSG and marked as LODGED.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by batch code, plan number, surveyor, SURCON #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({filteredBatches.length} batches, {totalPendingPlans} plans)
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {filteredBatches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No batches awaiting Records II review"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Batches with all 5 approvals complete will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredBatches.map((batch) =>
                  renderBatchCard(batch, false)
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredHistoryBatches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No history yet"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Lodged and queried batches will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredHistoryBatches.map((batch) =>
                  renderBatchCard(batch, true)
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve"
                  ? dialogMode === "batch"
                    ? `Lodge All Plans in ${dialogTarget}`
                    : `Final Approval & Lodge`
                  : `Query ${dialogTarget}`}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? dialogMode === "batch"
                    ? `This will lodge ALL ${selectedBatch?.plans.length} plans in Batch ${selectedBatch?.batchCode} with OSSG`
                    : `This will lodge ${selectedPlan?.planNumber} with OSSG and mark it as complete`
                  : dialogMode === "batch"
                    ? `Provide a query reason for all plans in Batch ${selectedBatch?.batchCode}`
                    : `Provide a reason for querying ${selectedPlan?.planNumber}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === "approve" ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      By giving final approval, you confirm that:
                    </p>
                    <ul className="text-sm text-green-700 list-disc list-inside mt-2">
                      {dialogMode === "batch" ? (
                        <>
                          <li>
                            Physical record copies of ALL {selectedBatch?.plans.length} plans match uploaded versions
                          </li>
                          <li>All information has been verified</li>
                          <li>All plans are ready to be submitted to OSSG</li>
                        </>
                      ) : (
                        <>
                          <li>
                            Physical record copy matches the uploaded version
                          </li>
                          <li>All information has been verified</li>
                          <li>Plan is ready to be submitted to OSSG</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      What happens next:
                    </p>
                    <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
                      <li>Plan status will change to LODGED</li>
                      <li>Data will be submitted to OSSG API</li>
                      <li>Surveyor will receive a confirmation email</li>
                      <li>Certificate will be generated by OSSG</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Query Reason *
                  </label>
                  <div className="mb-2 mt-2">
                    <RemarkSelector
                      options={uniqueQueryReasons}
                      onSelect={(val) => setComment(val)}
                      placeholder="Search previous query reasons..."
                      buttonText="Select from previous query reasons..."
                    />
                  </div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      dialogMode === "batch"
                        ? "Specific issue with the physical plans..."
                        : "Explain why this plan is being queried (e.g., physical copy doesn't match, missing signature)..."
                    }
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The surveyor will be notified and can make corrections
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  processing ||
                  (actionType === "query" && !comment.trim())
                }
                className={
                  actionType === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === "approve" ? (
                      <Award className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    {actionType === "approve"
                      ? dialogMode === "batch"
                        ? `Lodge All (${selectedBatch?.plans.length})`
                        : "Lodge Plan"
                      : "Query"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog
          open={!!viewingImage}
          onOpenChange={() => setViewingImage(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Record Copy Preview</DialogTitle>
            </DialogHeader>
            {viewingImage && (
              <div className="flex justify-center">
                <img
                  src={viewingImage}
                  alt="Record Copy"
                  className="max-h-[70vh] rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <VerificationResultModal
        isOpen={activeVerificationModal.isOpen}
        onClose={() =>
          setActiveVerificationModal({ isOpen: false, data: null, planNumber: "" })
        }
        resultData={activeVerificationModal.data}
        planNumber={activeVerificationModal.planNumber}
      />
    </>
  );
}
