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
  Copy,
  Clock,
  History,
  User,
  Mail,
  Phone,
  Lock,
  Search,
  XCircle,
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
  possibleChartingRemarks: string | null;
  chartingRemarks?: string | null;
  pillars: any;
  redCopyFileUrl: string | null;
  accountsStatus: string;
  chartingStatus?: string;
  chartingApprovedAt?: Date;
  chartingApprovedByUser?: {
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
  } | null;
}

export default function ChartingAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [historyPlans, setHistoryPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [chartingRemarks, setChartingRemarks] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uniqueChartingRemarks, setUniqueChartingRemarks] = useState<string[]>([]);
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
    role: "CHARTING",
    onLockAcquired: (planId, planNumber) => {
      toast.success(`Plan ${planNumber} is now locked for you`);
    },
    onLockReleased: () => {
      toast.info("Plan lock released");
    },
  });

  // Without this, a failed lock-acquire (e.g. a 403 from the lock route)
  // left every pending plan silently stuck in the disabled "View Only"
  // state with no indication anything had gone wrong.
  useEffect(() => {
    if (lockError) toast.error(lockError);
  }, [lockError]);

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
      return (
        matchesPlanNumber ||
        matchesSurveyTitle ||
        matchesLga ||
        matchesWard ||
        matchesBatch ||
        matchesUser
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
      return (
        matchesPlanNumber ||
        matchesSurveyTitle ||
        matchesLga ||
        matchesWard ||
        matchesBatch ||
        matchesUser
      );
    });
  }, [historyPlans, searchQuery]);



  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await releaseLock();
      // Re-fetch plans and try to acquire a new lock
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
      const [chartingRes, queryRes] = await Promise.all([
        surfboardApi.mda.remarks.charting(),
        surfboardApi.mda.remarks.queryReasons("charting"),
      ]);
      if (chartingRes.success && chartingRes.data) {
        setUniqueChartingRemarks(chartingRes.data);
      }
      if (queryRes.success && queryRes.data) {
        setUniqueQueryReasons(queryRes.data);
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
      const result = await surfboardApi.mda.stage.plans("charting");
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
      const result = await surfboardApi.mda.stage.plans("charting", "history");
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
    setChartingRemarks(action === "approve" ? (plan.possibleChartingRemarks || "") : "");
    setShowDialog(true);
  };

  const handleCopyPossibleRemarks = () => {
    if (selectedPlan?.possibleChartingRemarks) {
      setChartingRemarks(selectedPlan.possibleChartingRemarks);
      toast.success("Copied possible charting remarks");
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    if (actionType === "query" && !chartingRemarks.trim()) {
      toast.error("Please provide a reason for the query");
      return;
    }

    try {
      setProcessing(true);
      const result = await surfboardApi.mda.stage.decide(
        "charting",
        selectedPlan.id,
        actionType === "approve",
        chartingRemarks
      );

      if (result.success) {
        toast.success(
          actionType === "approve"
            ? `Charting remarks approved for ${selectedPlan.planNumber}`
            : `Plan ${selectedPlan.planNumber} has been queried`
        );
        setShowDialog(false);
        await fetchPlans();
        await acquireLock();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update charting status");
      }
    } catch (error) {
      console.error("Error updating charting status:", error);
      toast.error("An error occurred while updating charting status");
    } finally {
      setProcessing(false);
    }
  };

  const getPillarsText = (pillars: any): string => {
    if (!pillars) return "";
    try {
      const pillarsArray = Array.isArray(pillars)
        ? pillars
        : JSON.parse(pillars);

      // Group by polygonIndex if available
      const groups: Record<number, any[]> = {};
      pillarsArray.forEach((p: any) => {
        const idx = p.polygonIndex ?? 0;
        if (!groups[idx]) groups[idx] = [];
        groups[idx].push(p);
      });

      const output: string[] = [];
      const groupKeys = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
      
      for (const key of groupKeys) {
        const group = groups[Number(key)];
        if (groupKeys.length > 1) {
          output.push(`PL Parcel ${Number(key) + 1}`);
        } else {
          output.push("PL");
        }
        for (const p of group) {
          const easting = p.easting ?? p.lng ?? "";
          const northing = p.northing ?? p.lat ?? "";
          if (easting && northing) {
            output.push(`${easting},${northing}`);
          }
        }
      }

      return output.join("\n");
    } catch {
      return "";
    }
  };

  const copyPillarsToClipboard = (pillars: any) => {
    const text = getPillarsText(pillars);
    navigator.clipboard.writeText(text);
    toast.success("Pillar coordinates copied to clipboard");
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
          ? "border-l-4 border-l-green-400"
          : isPlanLockedByMe
            ? "border-l-4 border-l-violet-500 ring-2 ring-violet-200"
            : "opacity-60 grayscale-30"
          }`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{plan.planNumber}</CardTitle>
                {isHistory && (
                  <Badge className="bg-green-100 text-green-700">
                    Approved
                  </Badge>
                )}
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
              <Badge
                className={
                  plan.accountsStatus === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }
              >
                Accounts: {plan.accountsStatus}
              </Badge>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Locality</p>
              <p className="text-sm font-medium">{plan.locality || "N/A"}</p>
            </div>
          </div>

          {/* Charting Remarks (for history) */}
          {isHistory && plan.chartingRemarks && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Charting Remarks
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{plan.chartingRemarks}</p>
            </div>
          )}

          {/* Reviewed By (for history) */}
          {isHistory && plan.chartingApprovedAt && (
            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Reviewed by:</span>{" "}
                {plan.chartingApprovedByUser
                  ? `${plan.chartingApprovedByUser.firstName} ${plan.chartingApprovedByUser.lastName}`
                  : "Unknown"}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Date:</span>{" "}
                {formatDate(plan.chartingApprovedAt)}
              </p>
            </div>
          )}

          {/* Possible Charting Remarks (for pending) */}
          {!isHistory && plan.possibleChartingRemarks && (
            <div className="bg-violet-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Possible Charting Remarks (from LASG dataset)
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {plan.possibleChartingRemarks}
              </p>
            </div>
          )}

          {/* Pillars */}
          <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            {(() => {
              let pillarsArray: any[] = [];
              try {
                pillarsArray = Array.isArray(plan.pillars)
                  ? plan.pillars
                  : JSON.parse(plan.pillars || "[]");
              } catch {
                pillarsArray = [];
              }

              if (pillarsArray.length === 0) {
                return (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    No pillars data
                  </div>
                );
              }

              const groups: Record<number, any[]> = {};
              pillarsArray.forEach((p: any) => {
                const idx = p.polygonIndex ?? 0;
                if (!groups[idx]) groups[idx] = [];
                groups[idx].push(p);
              });

              const groupKeys = Object.keys(groups).sort((a, b) => Number(a) - Number(b));

              return groupKeys.map((key, index) => {
                const group = groups[Number(key)];
                const isMulti = groupKeys.length > 1;
                const parcelLabel = isMulti ? `Parcel ${String.fromCharCode(65 + Number(key))}` : "Parcel";
                
                const groupText = [
                  "PL",
                  ...group.map((p) => {
                    const easting = p.easting ?? p.lng ?? "";
                    const northing = p.northing ?? p.lat ?? "";
                    return easting && northing ? `${easting},${northing}` : null;
                  }).filter(Boolean)
                ].join("\n");

                return (
                  <div key={key} className={index > 0 ? "border-t border-gray-200 dark:border-white/10" : ""}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isMulti ? `Pillar Coordinates - ${parcelLabel}` : "Pillar Coordinates"}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${isMulti ? parcelLabel + "\n\n" : ""}PL\n${groupText.substring(3)}`);
                          toast.success(`${parcelLabel} coordinates copied to clipboard`);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="px-4 py-2 bg-violet-50 border-b border-gray-200 dark:border-white/10">
                      <span className="text-lg font-bold text-violet-800">{isMulti ? parcelLabel : "PL"}</span>
                    </div>
                    <pre className="text-xs bg-white dark:bg-surface p-3 overflow-x-auto">
                      {isMulti && <span className="font-bold text-violet-800">PL{"\n"}</span>}
                      {groupText.substring(3) || "No valid coordinates"}
                    </pre>
                  </div>
                );
              });
            })()}
          </div>

          {/* Record Copy */}
          {plan.redCopyFileUrl && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Record Copy
              </p>
              <a
                href={plan.redCopyFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
              >
                <FileText className="w-4 h-4" />
                View Record Copy
              </a>
            </div>
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
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {plan.user.firstName} {plan.user.lastName}
                    </p>
                  </div>
                </div>
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
                disabled={isDisabled}
              >
                {isDisabled ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    View Only
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Edit & Approve
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Charting Admin</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and confirm charting remarks for submitted survey plans
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
            placeholder="Search by plan number, title, LGA, surveyor..."
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
                      : "No plans awaiting charting review"}
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
                      : "Approved plans will appear here"}
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

        {/* Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve"
                  ? "Edit & Approve Charting Remarks"
                  : "Query Plan"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `Review and edit the charting remarks for ${selectedPlan?.planNumber}`
                  : `Provide a reason for querying ${selectedPlan?.planNumber}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === "approve" && selectedPlan?.possibleChartingRemarks && (
                <div className="bg-violet-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Possible Charting Remarks (from LASG)
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPossibleRemarks}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Use This
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPlan.possibleChartingRemarks}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {actionType === "approve" ? "Final Charting Remarks *" : "Query Reason *"}
                  </label>
                  {actionType === "approve" && selectedPlan?.possibleChartingRemarks && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPossibleRemarks}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Suggested Remarks
                    </Button>
                  )}
                </div>
                
                <div className="mb-2 mt-2">
                  <RemarkSelector
                    options={actionType === "approve" ? uniqueChartingRemarks : uniqueQueryReasons}
                    onSelect={(val) => setChartingRemarks(val)}
                    placeholder={actionType === "approve" ? "Search previous charting remarks..." : "Search previous query reasons..."}
                    buttonText={actionType === "approve" ? "Select from previous charting remarks..." : "Select from previous query reasons..."}
                  />
                </div>

                <Textarea
                  value={chartingRemarks}
                  onChange={(e) => setChartingRemarks(e.target.value)}
                  placeholder={actionType === "approve" ? "Enter or edit charting remarks..." : "Explain why this plan is being queried..."}
                  className="mt-1"
                  rows={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {actionType === "approve"
                    ? "These remarks will be used in the final certificate"
                    : "The surveyor will be notified and can make corrections"}
                </p>
              </div>
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
                disabled={processing || !chartingRemarks.trim()}
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
      </div>
    </>
  );
}
