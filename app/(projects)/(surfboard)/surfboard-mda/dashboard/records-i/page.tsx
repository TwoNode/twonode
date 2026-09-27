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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  FileText,
  Loader2,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  Clock,
  History,
  User,
  Hash,
  Briefcase,
  Mail,
  Phone,
  Lock,
  Search,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import { usePlanLock } from "../../../hooks/usePlanLock";
import { RemarkSelector } from "../../../components/RemarkSelector";
import {
  PlanLockIndicator,
  LockedPlanBadge,
} from "../../../components/PlanLockIndicator";
import { PlanLockWarningDialog } from "../../../components/PlanLockWarningDialog";

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
  redCopyFileUrl: string | null;
  accountsStatus: string;
  chartingStatus: string;
  surconStatus: string;
  recordsIStatus?: string;
  recordsIComment?: string | null;
  recordsIApprovedAt?: Date;
  recordsILockedBy?: string | null;
  isLocked?: boolean;
  lockExpiresAt?: Date | null;
  recordsIApprovedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  batch: {
    batchCode: string;
    paymentStatus: string;
  } | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    surconRegNumber: string | null;
    companyName: string | null;
  } | null;
}

export default function RecordsIAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [historyPlans, setHistoryPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uniqueQueryReasons, setUniqueQueryReasons] = useState<string[]>([]);

  // Plan lock management
  const {
    lockedPlanId,
    lockedPlanNumber,
    lockExpiresAt,
    isLocking,
    isLockedByMe,
    releaseLock,
    acquireLock,
    showLeaveWarning,
    confirmLeave,
    cancelLeave,
    lockError,
  } = usePlanLock({
    role: "RECORDS_I",
    onLockAcquired: (planId, planNumber) => {
      toast.success(`Plan ${planNumber} is now locked for you`);
    },
    onLockReleased: () => {
      toast.info("Plan lock released");
    },
  });

  useEffect(() => {
    if (lockError) toast.error(lockError);
  }, [lockError]);

  // Filter plans based on search query
  const filteredPlans = useMemo(() => {
    let result = plans;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = plans.filter((plan) => {
        const matchesPlanNumber = plan.planNumber.toLowerCase().includes(query);
        const matchesSurveyTitle = plan.surveyTitle.toLowerCase().includes(query);
        const matchesLga = plan.lga?.toLowerCase().includes(query);
        const matchesWard = plan.ward?.toLowerCase().includes(query);
        const matchesBatch = plan.batch?.batchCode.toLowerCase().includes(query);
        const matchesUser =
          plan.user &&
          `${plan.user.firstName} ${plan.user.lastName}`
            .toLowerCase()
            .includes(query);
        const matchesSurconNumber = plan.user?.surconRegNumber
          ?.toLowerCase()
          .includes(query);

        return (
          matchesPlanNumber ||
          matchesSurveyTitle ||
          matchesLga ||
          matchesWard ||
          matchesBatch ||
          matchesUser ||
          matchesSurconNumber
        );
      });
    }

    if (lockedPlanId) {
      result = [...result].sort((a, b) => {
        if (a.id === lockedPlanId) return -1;
        if (b.id === lockedPlanId) return 1;
        return 0;
      });
    }

    return result;
  }, [plans, searchQuery, lockedPlanId]);

  const filteredHistoryPlans = useMemo(() => {
    if (!searchQuery.trim()) return historyPlans;
    const query = searchQuery.toLowerCase();

    return historyPlans.filter((plan) => {
      const matchesPlanNumber = plan.planNumber.toLowerCase().includes(query);
      const matchesSurveyTitle = plan.surveyTitle.toLowerCase().includes(query);
      const matchesLga = plan.lga?.toLowerCase().includes(query);
      const matchesWard = plan.ward?.toLowerCase().includes(query);
      const matchesBatch = plan.batch?.batchCode.toLowerCase().includes(query);
      const matchesUser =
        plan.user &&
        `${plan.user.firstName} ${plan.user.lastName}`
          .toLowerCase()
          .includes(query);
      const matchesSurconNumber = plan.user?.surconRegNumber
        ?.toLowerCase()
        .includes(query);

      return (
        matchesPlanNumber ||
        matchesSurveyTitle ||
        matchesLga ||
        matchesWard ||
        matchesBatch ||
        matchesUser ||
        matchesSurconNumber
      );
    });
  }, [historyPlans, searchQuery]);



  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await releaseLock();
      await fetchPlans();
      // await acquireLock();
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchUniqueRemarks();
  }, []);

  const fetchUniqueRemarks = async () => {
    try {
      const res = await surfboardApi.mda.remarks.queryReasons("records-i");
      if (res.success && res.data) {
        setUniqueQueryReasons(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch unique remarks", error);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && historyPlans.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const result = await surfboardApi.mda.stage.plans("records-i");
      if (result.success) {
        setPlans(result.data as any);
      } else {
        toast.error(result.error || "Failed to fetch plans");
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("An error occurred while fetching plans");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await surfboardApi.mda.stage.plans("records-i", "history");
      if (result.success) {
        setHistoryPlans(result.data as any);
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

  const handleActionClick = (plan: Plan, action: "approve" | "query") => {
    setSelectedPlan(plan);
    setActionType(action);
    setComment("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    if (actionType === "query" && !comment.trim()) {
      toast.error("Please provide a reason for the query");
      return;
    }

    try {
      setProcessing(true);
      const result = await surfboardApi.mda.stage.decide(
        "records-i",
        selectedPlan.id,
        actionType === "approve",
        comment.trim() || undefined
      );

      if (result.success) {
        toast.success(
          actionType === "approve"
            ? `Plan ${selectedPlan.planNumber} approved successfully`
            : `Plan ${selectedPlan.planNumber} has been queried`
        );
        setShowDialog(false);
        await fetchPlans();
        await acquireLock();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating Records I status:", error);
      toast.error("An error occurred while updating status");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "QUERIED":
        return <Badge className="bg-red-100 text-red-700">Queried</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading plans...</p>
        </div>
      </div>
    );
  }

  const renderPlanCard = (plan: Plan, isHistory: boolean = false) => {
    const isPlanLockedByMe = isLockedByMe(plan.id);
    const isDisabled = !isHistory && !isPlanLockedByMe;

    return (
      <Card
        key={plan.id}
        className={`transition-all duration-200 ${isHistory
            ? plan.recordsIStatus === "QUERIED"
              ? "border-l-4 border-l-red-400"
              : "border-l-4 border-l-green-400"
            : isPlanLockedByMe
              ? "border-l-4 border-l-violet-500 ring-2 ring-violet-200"
              : "border-l-4 border-l-gray-300 opacity-60 grayscale-30"
          }`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{plan.planNumber}</CardTitle>
                {isHistory && getStatusBadge(plan.recordsIStatus || "PENDING")}
                {!isHistory && (
                  <LockedPlanBadge
                    isLockedByMe={isPlanLockedByMe}
                    isLockedByOther={!isPlanLockedByMe && !!lockedPlanId}
                  />
                )}
              </div>
              <CardDescription>{plan.surveyTitle}</CardDescription>
              <div className="flex gap-2 mt-1 mb-1">
                {plan.planType && (
                  <Badge variant="secondary" className="text-xs">
                    {plan.planType}
                  </Badge>
                )}
                {plan.referencePlanNumber && (
                  <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10">
                    Ref: {plan.referencePlanNumber}
                  </span>
                )}
              </div>
              {plan.batch && (
                <div className="mt-2">
                  <Badge variant="outline">Batch: {plan.batch.batchCode}</Badge>
                </div>
              )}
            </div>
            {!isHistory && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Accounts:</span>
                  {getStatusBadge(plan.accountsStatus)}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Charting:</span>
                  {getStatusBadge(plan.chartingStatus)}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">SURCON:</span>
                  {getStatusBadge(plan.surconStatus)}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">LGA</p>
              <p className="text-sm font-medium">{plan.lga || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ward</p>
              <p className="text-sm font-medium">{plan.ward || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">LCDA</p>
              <p className="text-sm font-medium">{plan.lcda || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Deeded Area</p>
              <p className="text-sm font-medium">{plan.deededArea}</p>
            </div>
          </div>

          {/* Review Info (for history) */}
          {isHistory && plan.recordsIApprovedAt && (
            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Reviewed by:</span>{" "}
                {plan.recordsIApprovedByUser
                  ? `${plan.recordsIApprovedByUser.firstName} ${plan.recordsIApprovedByUser.lastName}`
                  : "Unknown"}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Date:</span>{" "}
                {formatDate(plan.recordsIApprovedAt)}
              </p>
              {plan.recordsIStatus === "QUERIED" && plan.recordsIComment && (
                <p className="text-red-600 mt-2">
                  <span className="font-medium">Query Reason:</span>{" "}
                  {plan.recordsIComment}
                </p>
              )}
            </div>
          )}

          {/* Record Copy */}
          <div className="border-2 border-violet-200 rounded-lg p-4 bg-violet-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                <p className="text-sm font-medium text-violet-800">
                  Record Copy {!isHistory && "(Verify Quality & Completeness)"}
                </p>
              </div>
            </div>

            {plan.redCopyFileUrl ? (
              <div className="space-y-3">
                {isImageUrl(plan.redCopyFileUrl) && (
                  <div
                    className="cursor-pointer"
                    onClick={() => setViewingImage(plan.redCopyFileUrl)}
                  >
                    <img
                      src={plan.redCopyFileUrl}
                      alt="Record Copy Preview"
                      className="max-h-48 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Click to view full size
                    </p>
                  </div>
                )}

                <a
                  href={plan.redCopyFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface rounded-lg border text-violet-600 hover:bg-violet-50 transition-colors"
                >
                  {isImageUrl(plan.redCopyFileUrl) ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Open Record Copy
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-red-600">No record copy uploaded!</p>
            )}
          </div>

          {/* Surveyor Information */}
          {plan.user && (
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
                      {plan.user.firstName} {plan.user.lastName}
                    </p>
                  </div>
                </div>
                {plan.user.surconRegNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">SURCON Number</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.user.surconRegNumber}
                      </p>
                    </div>
                  </div>
                )}
                {plan.user.companyName && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">Company</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.user.companyName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-600">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {plan.user.email}
                    </p>
                  </div>
                </div>
                {plan.user.phoneNumber && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.user.phoneNumber}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons (for pending only) */}
          {!isHistory && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => handleActionClick(plan, "approve")}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!plan.redCopyFileUrl || isDisabled}
              >
                {isDisabled ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    View Only
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleActionClick(plan, "query")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                disabled={isDisabled}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Query
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Leave Warning Dialog */}
      <PlanLockWarningDialog
        isOpen={showLeaveWarning}
        planNumber={lockedPlanNumber}
        onConfirmLeave={confirmLeave}
        onCancel={cancelLeave}
      />

      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Records I Admin</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review uploaded record copies for quality and completeness
          </p>
        </div>

        {/* Lock Status Indicator */}
        {lockedPlanNumber && (
          <PlanLockIndicator
            planNumber={lockedPlanNumber}
            lockExpiresAt={lockExpiresAt}
            onUnlock={handleUnlock}
            isUnlocking={isUnlocking}
          />
        )}

        {isLocking && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
            <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Acquiring plan lock...
            </span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search by plan number, title, LGA, surveyor, SURCON #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({filteredPlans.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {filteredPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery
                      ? "No matching plans found"
                      : "No plans awaiting Records I review"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Submitted plans will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredPlans.map((plan) => renderPlanCard(plan, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : filteredHistoryPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery ? "No matching plans found" : "No history yet"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Approved and queried plans will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredHistoryPlans.map((plan) => renderPlanCard(plan, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve Plan" : "Query Plan"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `Confirm that the record copy for ${selectedPlan?.planNumber} is complete and of acceptable quality`
                  : `Provide a reason for querying ${selectedPlan?.planNumber}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === "approve" ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    By approving, you confirm that:
                  </p>
                  <ul className="text-sm text-green-700 list-disc list-inside mt-2">
                    <li>The record copy document is legible</li>
                    <li>All required information is visible</li>
                    <li>The document quality is acceptable</li>
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
                    placeholder="Explain why this plan is being queried (e.g., illegible document, missing pages, poor quality)..."
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The surveyor will be notified and can upload a new record
                    copy
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
    </>
  );
}
