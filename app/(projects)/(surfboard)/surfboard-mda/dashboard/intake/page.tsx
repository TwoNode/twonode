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
  Clock,
  History,
  User,
  Hash,
  Briefcase,
  Mail,
  Phone,
  Search,
  Package,
  ExternalLink,
  Image as ImageIcon,
  Lock,
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
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  deededArea: string;
  redCopyFileUrl: string | null;
  intakeStatus?: string;
  intakeApprovedAt?: Date;
  intakeApprovedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  // Lock fields
  isLocked?: boolean;
  intakeLockedBy?: string | null;
  intakeLockExpiresAt?: Date | null;
  recordCopyVerdict?: string | null;
  recordCopyVerificationData?: any;
}

interface Batch {
  id: string;
  batchCode: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
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
}

export default function IntakeAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [historyBatches, setHistoryBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeVerificationModal, setActiveVerificationModal] = useState<{
    isOpen: boolean;
    data: any;
    planNumber: string;
  }>({ isOpen: false, data: null, planNumber: "" });

  // Dialog state - supports both batch-level and plan-level actions
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"batch" | "plan">("batch");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [uniqueQueryReasons, setUniqueQueryReasons] = useState<string[]>([]);

  // Track per-plan processing state (for inline loading indicators)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

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
    role: "INTAKE",
    onLockAcquired: (batchId, batchCode, planCount) => {
      toast.success(
        `Batch ${batchCode} locked (${planCount} plan${planCount !== 1 ? "s" : ""}, ${planCount * 3}min)`,
      );
    },
    onLockReleased: () => {
      toast.info("Batch lock released");
    },
  });

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
        return matchesBatchCode || matchesUser;
      });
    }

    if (lockedBatchId) {
      result = [...result].sort((a, b) => {
        if (a.id === lockedBatchId) return -1;
        if (b.id === lockedBatchId) return 1;
        return 0;
      });
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
      return matchesBatchCode || matchesUser;
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
      const res = await surfboardApi.mda.remarks.queryReasons("intake");
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
      const result = await surfboardApi.mda.intake.batches();
      if (result.success) {
        setBatches(result.data as any);
      } else {
        toast.error(result.error || "Failed to fetch batches");
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("An error occurred while fetching intake batches");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await surfboardApi.mda.intake.batches("history");
      if (result.success) {
        const sortedBatches = (result.data as any).sort((a: any, b: any) => {
          const aTime = new Date(
            Math.max(
              ...a.plans.map((p: any) =>
                new Date(p.intakeApprovedAt || 0).getTime(),
              ),
            ),
          ).getTime();
          const bTime = new Date(
            Math.max(
              ...b.plans.map((p: any) =>
                new Date(p.intakeApprovedAt || 0).getTime(),
              ),
            ),
          ).getTime();
          return bTime - aTime; // descending
        });
        setHistoryBatches(sortedBatches);
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

  // Batch-level action
  const handleBatchActionClick = (
    batch: Batch,
    action: "approve" | "query",
  ) => {
    setSelectedBatch(batch);
    setSelectedPlan(null);
    setDialogMode("batch");
    setActionType(action);
    setComment("");
    setShowDialog(true);
  };

  // Plan-level action
  const handlePlanActionClick = (
    plan: Plan,
    batch: Batch,
    action: "approve" | "query",
  ) => {
    setSelectedPlan(plan);
    setSelectedBatch(batch);
    setDialogMode("plan");
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

  const handleBatchSubmit = async () => {
    if (!selectedBatch) return;

    if (actionType === "query" && !comment.trim()) {
      toast.error("Please provide a reason for querying the batch");
      return;
    }

    try {
      setProcessing(true);
      const result = await surfboardApi.mda.intake.decide(
        selectedBatch.id,
        actionType === "approve",
        comment.trim() || undefined,
      );

      if (result.success) {
        toast.success(
          actionType === "approve"
            ? `Batch ${selectedBatch.batchCode} approved successfully (${result.data?.updatedCount} plans)`
            : `Batch ${selectedBatch.batchCode} queried successfully`,
        );
        setShowDialog(false);
        await fetchBatches();
        await acquireLock();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update batch status");
      }
    } catch (error) {
      console.error("Error updating Intake status:", error);
      toast.error("An error occurred while updating status");
    } finally {
      setProcessing(false);
    }
  };

  const handlePlanSubmit = async () => {
    if (!selectedPlan) return;

    if (actionType === "query" && !comment.trim()) {
      toast.error("Please provide a reason for querying this plan");
      return;
    }

    try {
      setProcessing(true);
      setProcessingPlanId(selectedPlan.id);
      const result = await surfboardApi.mda.stage.decide(
        "intake",
        selectedPlan.id,
        actionType === "approve",
        comment.trim() || undefined,
      );

      if (result.success) {
        toast.success(
          actionType === "approve"
            ? `Plan ${selectedPlan.planNumber} approved successfully`
            : `Plan ${selectedPlan.planNumber} has been queried`,
        );
        setShowDialog(false);
        await fetchBatches();
        await acquireLock();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update plan status");
      }
    } catch (error) {
      console.error("Error updating Intake plan status:", error);
      toast.error("An error occurred while updating plan status");
    } finally {
      setProcessing(false);
      setProcessingPlanId(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading intake batches...
          </p>
        </div>
      </div>
    );
  }

  const renderBatchCard = (batch: Batch, isHistory: boolean = false) => {
    const isBatchMine = !isHistory && isBatchLockedByMe(batch.id);
    const isDisabled = !isHistory && !isBatchMine;
    const isQueried =
      isHistory && batch.plans.some((p) => p.intakeStatus === "QUERIED");
    const isApproved =
      isHistory &&
      !isQueried &&
      batch.plans.every((p) => p.intakeStatus === "APPROVED");
    const intakeTime = isHistory
      ? new Date(
          Math.max(
            ...batch.plans.map((p) =>
              new Date(p.intakeApprovedAt || 0).getTime(),
            ),
          ),
        )
      : null;

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
              ? "border-2 border-violet-200 ring-2 ring-violet-100"
              : "border-2 border-gray-200 dark:border-white/10"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package
                  className={`w-5 h-5 ${isBatchMine ? "text-violet-600" : "text-gray-500 dark:text-gray-400"}`}
                />
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
                    {isQueried ? "Queried" : "Approved"}
                  </Badge>
                )}
                {!isHistory &&
                  (isBatchMine ? (
                    <Badge className="bg-violet-100 text-violet-700">
                      <Lock className="w-3 h-3 mr-1" />
                      Locked by you
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-gray-500 dark:text-gray-400"
                    >
                      View Only
                    </Badge>
                  ))}
              </div>
              <CardDescription className="mt-1">
                Submitted on {formatDate(batch.createdAt)} •{" "}
                {batch.plans.length} plan{batch.plans.length !== 1 ? "s" : ""}{" "}
                in batch
              </CardDescription>
              {!isHistory &&
                batch._count &&
                batch._count.plans > batch.plans.length && (
                  <div className="flex items-center gap-2 mt-2">
                    <Progress
                      value={(batch.plans.length / batch._count.plans) * 100}
                      className="w-32 h-2"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {batch.plans.length}/{batch._count.plans} ready for intake
                    </span>
                  </div>
                )}
            </div>
            {isHistory && intakeTime && (
              <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                <p>Processed on:</p>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {formatDate(intakeTime)}
                </p>
              </div>
            )}
            {!isHistory && isBatchMine && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUnlock}
                disabled={isUnlocking}
              >
                {isUnlocking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Unlock"
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {batch.submitter.firstName} {batch.submitter.lastName}
                    </p>
                  </div>
                </div>
                {batch.submitter.surconRegNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">SURCON Number</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {batch.submitter.companyName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 border-b border-gray-200 dark:border-white/10 font-medium text-sm text-gray-700 dark:text-gray-300">
              Plans in this Batch
            </div>
            <div className="divide-y divide-gray-100 max-h-150 overflow-y-auto">
              {batch.plans.map((p) => {
                const isPlanProcessing = processingPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    className="p-4 bg-white dark:bg-surface hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {p.planNumber}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          {p.surveyTitle}
                        </span>
                      </div>
                      {isHistory && p.intakeStatus && (
                        <Badge
                          variant={
                            p.intakeStatus === "APPROVED"
                              ? "outline"
                              : "destructive"
                          }
                          className="text-[10px] h-5"
                        >
                          {p.intakeStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="border border-violet-200 rounded-lg p-3 bg-violet-50 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-violet-600" />
                        <p className="text-xs font-medium text-violet-800">
                          Record Copy
                        </p>
                      </div>
                      {p.redCopyFileUrl ? (
                        <div className="space-y-2">
                          {isImageUrl(p.redCopyFileUrl) && (
                            <div
                              className="cursor-pointer inline-block"
                              onClick={() => setViewingImage(p.redCopyFileUrl)}
                            >
                              <img
                                src={p.redCopyFileUrl}
                                alt={`Record Copy - ${p.planNumber}`}
                                className="max-h-32 rounded border shadow-sm hover:shadow-md transition-shadow"
                              />
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Click to view full size
                              </p>
                            </div>
                          )}
                          <a
                            href={p.redCopyFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface rounded border text-violet-600 hover:bg-violet-50 transition-colors text-xs"
                          >
                            {isImageUrl(p.redCopyFileUrl) ? (
                              <ImageIcon className="w-3.5 h-3.5" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            Open Record Copy
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {p.recordCopyVerdict &&
                            p.recordCopyVerificationData && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-1.5 ml-2 bg-white dark:bg-surface text-xs h-8"
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

                    {!isHistory && (
                      <div className="flex gap-2 mt-3">
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
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {isDisabled ? "Locked" : "Approve Plan"}
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

          {!isHistory && batch.plans.length > 1 && (
            <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
              <Button
                onClick={() => handleBatchActionClick(batch, "approve")}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isDisabled}
              >
                {isDisabled ? (
                  <Lock className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isDisabled
                  ? "Locked"
                  : `Approve Batch (${batch.plans.length} plans)`}
              </Button>
              <Button
                onClick={() => handleBatchActionClick(batch, "query")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                disabled={isDisabled}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Query Batch
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const dialogTarget =
    dialogMode === "batch"
      ? `Batch ${selectedBatch?.batchCode}`
      : `Plan ${selectedPlan?.planNumber}`;

  return (
    <>
      <PlanLockWarningDialog
        isOpen={showLeaveWarning}
        planNumber={lockedBatchCode ? `Batch ${lockedBatchCode}` : null}
        onConfirmLeave={confirmLeave}
        onCancel={cancelLeave}
      />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Intake Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve physical documents sequentially — approve or
            query each plan individually
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search by batch code, surveyor name, or SURCON #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Batches ({filteredBatches.length})
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
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No batches awaiting Intake review"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Batches passing parallel review will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredBatches.map((batch) => renderBatchCard(batch, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : filteredHistoryBatches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No history yet"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Processed batches will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredHistoryBatches.map((batch) =>
                  renderBatchCard(batch, true),
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Unified Action Dialog (handles both batch and plan level) */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve"
                  ? `Approve ${dialogTarget}`
                  : `Query ${dialogTarget}`}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? dialogMode === "batch"
                    ? `Confirm that you have received and verified ALL physical plans in Batch ${selectedBatch?.batchCode}`
                    : `Confirm that the physical copy for ${selectedPlan?.planNumber} matches the digital record copy`
                  : dialogMode === "batch"
                    ? `Provide a query reason for all plans in Batch ${selectedBatch?.batchCode}`
                    : `Provide a query reason for plan ${selectedPlan?.planNumber}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === "approve" ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    By approving, you confirm that:
                  </p>
                  <ul className="text-sm text-green-700 list-disc list-inside mt-2">
                    {dialogMode === "batch" ? (
                      <>
                        <li>
                          The physical copies of ALL plans (
                          {selectedBatch?.plans.length}) in this batch align
                          perfectly.
                        </li>
                        <li>
                          Records II will now be able to process these plans.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          The physical copy of {selectedPlan?.planNumber}{" "}
                          matches the uploaded record copy.
                        </li>
                        <li>
                          Records II will be able to process this plan once all
                          plans in the batch are approved.
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        : `Issue with plan ${selectedPlan?.planNumber}...`
                    }
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The surveyor will be notified of this query.
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
                  processing || (actionType === "query" && !comment.trim())
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
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    {actionType === "approve" ? "Approve" : "Query"}
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
          setActiveVerificationModal({
            isOpen: false,
            data: null,
            planNumber: "",
          })
        }
        resultData={activeVerificationModal.data}
        planNumber={activeVerificationModal.planNumber}
      />
    </>
  );
}
