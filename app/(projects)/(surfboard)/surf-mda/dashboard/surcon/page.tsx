"use client";

import { useState, useEffect } from "react";
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
import {
  CheckCircle,
  FileText,
  Loader2,
  Copy,
  AlertCircle,
  XCircle,
  User,
  Briefcase,
  Hash,
  Mail,
  Phone,
  Clock,
  History,
} from "lucide-react";
import {
  getSurconPlans,
  updateSurconStatus,
  getSurconHistory,
} from "../../../actions/codActions";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  locality: string | null;
  deededArea: string;
  pillars: any;
  redCopyFileUrl: string | null;
  accountsStatus: string;
  chartingStatus: string;
  surconStatus?: string;
  surconComment?: string | null;
  surconApprovedAt?: Date;
  surconApprovedByUser?: {
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
    surconRegNumber: string | null;
    companyName: string | null;
    surconRegName: string | null;
    phoneNumber: string | null;
  } | null;
}

export default function SurconAdminPage() {
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
      const result = await getSurconPlans();
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
      const result = await getSurconHistory();
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
      const result = await updateSurconStatus(
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
        fetchPlans();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating SURCON status:", error);
      toast.error("An error occurred while updating status");
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
      const lines: string[] = [];
      for (const p of pillarsArray) {
        const easting = p.easting ?? p.lng ?? "";
        const northing = p.northing ?? p.lat ?? "";
        if (easting && northing) {
          lines.push(`${easting},${northing}`);
        }
      }
      return `PL\n${lines.join("\n")}`;
    } catch {
      return "";
    }
  };

  const copyPillarsToClipboard = (pillars: any) => {
    const text = getPillarsText(pillars);
    navigator.clipboard.writeText(text);
    toast.success("Pillar coordinates copied to clipboard");
  };

  const getPillarsArray = (pillars: any): any[] => {
    if (!pillars) return [];
    try {
      return Array.isArray(pillars) ? pillars : JSON.parse(pillars);
    } catch {
      return [];
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

  const renderPlanCard = (plan: Plan, isHistory: boolean = false) => (
    <Card
      key={plan.id}
      className={
        isHistory
          ? plan.surconStatus === "QUERIED"
            ? "border-l-4 border-l-red-400"
            : "border-l-4 border-l-green-400"
          : ""
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{plan.planNumber}</CardTitle>
              {isHistory && getStatusBadge(plan.surconStatus || "PENDING")}
            </div>
            <CardDescription>{plan.surveyTitle}</CardDescription>
            {plan.batch && (
              <div className="mt-2">
                <Badge variant="outline">Batch: {plan.batch.batchCode}</Badge>
              </div>
            )}
          </div>
          {!isHistory && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <span className="text-xs text-gray-500">Accounts:</span>
                {getStatusBadge(plan.accountsStatus)}
              </div>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500">Charting:</span>
                {getStatusBadge(plan.chartingStatus)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        {isHistory && plan.surconApprovedAt && (
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Reviewed by:</span>{" "}
              {plan.surconApprovedByUser
                ? `${plan.surconApprovedByUser.firstName} ${plan.surconApprovedByUser.lastName}`
                : "Unknown"}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Date:</span>{" "}
              {formatDate(plan.surconApprovedAt)}
            </p>
            {plan.surconStatus === "QUERIED" && plan.surconComment && (
              <p className="text-red-600 mt-2">
                <span className="font-medium">Query Reason:</span>{" "}
                {plan.surconComment}
              </p>
            )}
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
                  <p className="text-sm font-medium text-gray-900">
                    {plan.user.firstName} {plan.user.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-xs text-emerald-600">SURCON Number</p>
                  <p className="text-sm font-medium text-gray-900">
                    {plan.user.surconRegNumber || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-xs text-emerald-600">Company</p>
                  <p className="text-sm font-medium text-gray-900">
                    {plan.user.companyName || "N/A"}
                  </p>
                </div>
              </div>
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

        {/* Pillars */}
        <div className="border-2 border-blue-200 rounded-lg overflow-hidden bg-blue-50">
          <div className="flex items-center justify-between p-4 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Pillar Coordinates {!isHistory && "(Verify Against Database)"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyPillarsToClipboard(plan.pillars)}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          {(() => {
            const pillarsArray = getPillarsArray(plan.pillars);
            if (!pillarsArray || pillarsArray.length === 0) {
              return (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No pillars data available
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <div className="px-4 py-2 bg-blue-100 border-b border-blue-200">
                  <span className="text-lg font-bold text-blue-800">PL</span>
                </div>
                <table className="min-w-full divide-y divide-blue-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                        Pillar #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                        Easting
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                        Northing
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-blue-100">
                    {pillarsArray.map((pillar: any, index: number) => (
                      <tr key={index} className="hover:bg-blue-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pillar.pillarNumber ||
                            pillar.name ||
                            `P${index + 1}`}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {(pillar.easting ?? pillar.lng)?.toFixed(3) || "N/A"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {(pillar.northing ?? pillar.lat)?.toFixed(3) || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* Record Copy */}
        {plan.redCopyFileUrl && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Record Copy
            </p>
            <a
              href={plan.redCopyFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <FileText className="w-4 h-4" />
              View Record Copy
            </a>
          </div>
        )}

        {/* Action Buttons (for pending only) */}
        {!isHistory && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleActionClick(plan, "approve")}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleActionClick(plan, "query")}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Query
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SURCON Admin</h1>
        <p className="text-gray-600 mt-1">
          Verify pillar numbers match database for submitted survey plans
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">
                  No plans awaiting SURCON review
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Submitted plans will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => renderPlanCard(plan, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {historyLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : historyPlans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No history yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Approved and queried plans will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {historyPlans.map((plan) => renderPlanCard(plan, true))}
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
                ? `Confirm that pillar numbers for ${selectedPlan?.planNumber} match the database`
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
                  <li>
                    Pillar numbers have been verified against the database
                  </li>
                  <li>All coordinates are accurate</li>
                </ul>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Query Reason *
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain why this plan is being queried..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The surveyor will be notified and can edit the pillars field
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
    </div>
  );
}
