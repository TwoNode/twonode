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
} from "lucide-react";
import {
  getRecordsIIPlans,
  updateRecordsIIStatus,
  getRecordsIIHistory,
} from "../../../actions/codActions";
import { usePlanLock } from "../../../hooks/usePlanLock";
import {
  PlanLockIndicator,
  LockedPlanBadge,
} from "../../../components/PlanLockIndicator";
import { PlanLockWarningDialog } from "../../../components/PlanLockWarningDialog";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  locality: string | null;
  deededArea: string;
  chartingRemarks: string | null;
  redCopyFileUrl: string | null;
  accountsStatus: string;
  chartingStatus: string;
  surconStatus: string;
  recordsIStatus: string;
  recordsIIStatus?: string;
  recordsIIComment?: string | null;
  recordsIIApprovedAt?: Date;
  recordsIIApprovedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  batch: {
    batchCode: string;
    paymentStatus: string;
    planCount: number;
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

export default function RecordsIIAdminPage() {
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
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter plans based on search query
  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const query = searchQuery.toLowerCase();
    return plans.filter((plan) => {
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
  }, [plans, searchQuery]);

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
  } = usePlanLock({
    role: "RECORDS_II",
    onLockAcquired: (planId, planNumber) => {
      toast.success(`Plan ${planNumber} is now locked for you`);
    },
    onLockReleased: () => {
      toast.info("Plan lock released");
    },
  });

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
  }, []);

  useEffect(() => {
    if (activeTab === "history" && historyPlans.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const result = await getRecordsIIPlans();
      if (result.success && result.data) {
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
      const result = await getRecordsIIHistory();
      if (result.success && result.data) {
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
      const result = await updateRecordsIIStatus(
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
        fetchPlans();
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
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700">✓</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-700">○</Badge>;
      case "QUERIED":
        return <Badge className="bg-red-100 text-red-700">✗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  const getBatchProgress = (batchCode: string) => {
    const batchPlans = plans.filter((p) => p.batch?.batchCode === batchCode);
    return {
      readyForFinal: batchPlans.length,
      total: batchPlans[0]?.batch?.planCount || batchPlans.length,
    };
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
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  const renderPlanCard = (plan: Plan, isHistory: boolean = false) => {
    const batchProgress =
      plan.batch && !isHistory ? getBatchProgress(plan.batch.batchCode) : null;
    const isPlanLockedByMe = isLockedByMe(plan.id);
    const isDisabled = !isHistory && !isPlanLockedByMe;

    return (
      <Card
        key={plan.id}
        className={`transition-all duration-200 ${
          isHistory
            ? plan.recordsIIStatus === "QUERIED"
              ? "border-l-4 border-l-red-400"
              : "border-l-4 border-l-green-400"
            : isPlanLockedByMe
            ? "border-2 border-green-200 ring-2 ring-blue-200"
            : "border-2 border-green-200 opacity-60 grayscale-30"
        }`}
      >
        <CardHeader className={isHistory ? "" : "bg-green-50"}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {!isHistory && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <CardTitle className="text-xl">{plan.planNumber}</CardTitle>
                {isHistory &&
                  getStatusBadgeFull(plan.recordsIIStatus || "PENDING")}
                {!isHistory && (
                  <LockedPlanBadge
                    isLockedByMe={isPlanLockedByMe}
                    isLockedByOther={!isPlanLockedByMe && !!lockedPlanId}
                  />
                )}
              </div>
              <CardDescription className="mt-1">
                {plan.surveyTitle}
              </CardDescription>
              {plan.batch && (
                <div className="mt-2 space-y-2">
                  <Badge variant="outline">Batch: {plan.batch.batchCode}</Badge>
                  {batchProgress && (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          (batchProgress.readyForFinal / batchProgress.total) *
                          100
                        }
                        className="w-32 h-2"
                      />
                      <span className="text-xs text-gray-600">
                        {batchProgress.readyForFinal}/{batchProgress.total}{" "}
                        ready
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isHistory && (
              <div className="flex flex-col items-end gap-1">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-gray-500">Accounts</span>
                  {getStatusBadge(plan.accountsStatus)}
                  <span className="text-gray-500">Charting</span>
                  {getStatusBadge(plan.chartingStatus)}
                  <span className="text-gray-500">SURCON</span>
                  {getStatusBadge(plan.surconStatus)}
                  <span className="text-gray-500">Records I</span>
                  {getStatusBadge(plan.recordsIStatus)}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Location Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">LGA</p>
              <p className="text-sm font-medium">{plan.lga || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ward</p>
              <p className="text-sm font-medium">{plan.ward || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">LCDA</p>
              <p className="text-sm font-medium">{plan.lcda || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deeded Area</p>
              <p className="text-sm font-medium">{plan.deededArea}</p>
            </div>
          </div>

          {/* Review Info (for history) */}
          {isHistory && plan.recordsIIApprovedAt && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Reviewed by:</span>{" "}
                {plan.recordsIIApprovedByUser
                  ? `${plan.recordsIIApprovedByUser.firstName} ${plan.recordsIIApprovedByUser.lastName}`
                  : "Unknown"}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Date:</span>{" "}
                {formatDate(plan.recordsIIApprovedAt)}
              </p>
              {plan.recordsIIStatus === "QUERIED" && plan.recordsIIComment && (
                <p className="text-red-600 mt-2">
                  <span className="font-medium">Query Reason:</span>{" "}
                  {plan.recordsIIComment}
                </p>
              )}
            </div>
          )}

          {/* Charting Remarks */}
          {plan.chartingRemarks && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800 mb-1">
                Final Charting Remarks
              </p>
              <p className="text-sm text-purple-700">{plan.chartingRemarks}</p>
            </div>
          )}

          {/* Record Copy */}
          {!isHistory && (
            <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Verify Physical Copy Matches Uploaded Copy
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Ensure the physical record copy submitted matches the
                    uploaded version below
                  </p>
                  {plan.redCopyFileUrl && (
                    <a
                      href={plan.redCopyFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-white rounded-lg border text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Uploaded Record Copy
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Record Copy for history - simplified */}
          {isHistory && plan.redCopyFileUrl && (
            <a
              href={plan.redCopyFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FileText className="w-4 h-4" />
              View Record Copy
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

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
                    <p className="text-sm font-medium text-gray-900">
                      {plan.user.firstName} {plan.user.lastName}
                    </p>
                  </div>
                </div>
                {plan.user.surconRegNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">SURCON Number</p>
                      <p className="text-sm font-medium text-gray-900">
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
                      <p className="text-sm font-medium text-gray-900">
                        {plan.user.companyName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-600">Email</p>
                    <p className="text-sm font-medium text-gray-900">
                      {plan.user.email}
                    </p>
                  </div>
                </div>
                {plan.user.phoneNumber && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
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
                    Final Approval & Lodge
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
          <h1 className="text-3xl font-bold text-gray-900">Records II Admin</h1>
          <p className="text-gray-600 mt-1">
            Final approval before submission to OSSG - verify physical copy
            matches uploaded copy
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
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">
              Acquiring plan lock...
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
              Only plans where all 4 other approvals (Accounts, Charting,
              SURCON, Records I) are complete will appear here. Upon approval,
              the plan will be submitted to OSSG and marked as LODGED.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                  <p className="text-gray-500 text-lg">
                    {searchQuery
                      ? "No matching plans found"
                      : "No plans awaiting Records II review"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Plans with all other approvals complete will appear here"}
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
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredHistoryPlans.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">
                    {searchQuery ? "No matching plans found" : "No history yet"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Lodged and queried plans will appear here"}
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
                {actionType === "approve"
                  ? "Final Approval & Lodge"
                  : "Query Plan"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `This will lodge ${selectedPlan?.planNumber} with OSSG and mark it as complete`
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
                      <li>Physical record copy matches the uploaded version</li>
                      <li>All information has been verified</li>
                      <li>Plan is ready to be submitted to OSSG</li>
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
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Explain why this plan is being queried (e.g., physical copy doesn't match, missing signature)..."
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
                      <Award className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    {actionType === "approve" ? "Lodge Plan" : "Query"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
