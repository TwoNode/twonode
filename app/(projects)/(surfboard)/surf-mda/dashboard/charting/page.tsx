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
  Clock,
  History,
} from "lucide-react";
import {
  getChartingPlans,
  updateChartingStatus,
  getChartingHistory,
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
  const [chartingRemarks, setChartingRemarks] = useState("");
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
      const result = await getChartingPlans();
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
      const result = await getChartingHistory();
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

  const handleEditClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setChartingRemarks(plan.possibleChartingRemarks || "");
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

    try {
      setProcessing(true);
      const result = await updateChartingStatus(
        selectedPlan.id,
        chartingRemarks
      );

      if (result.success) {
        toast.success(
          `Charting remarks approved for ${selectedPlan.planNumber}`
        );
        setShowDialog(false);
        fetchPlans();
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
      className={isHistory ? "border-l-4 border-l-green-400" : ""}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{plan.planNumber}</CardTitle>
              {isHistory && (
                <Badge className="bg-green-100 text-green-700">Approved</Badge>
              )}
            </div>
            <CardDescription>{plan.surveyTitle}</CardDescription>
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
            <p className="text-xs text-gray-500">Locality</p>
            <p className="text-sm font-medium">{plan.locality || "N/A"}</p>
          </div>
        </div>

        {/* Charting Remarks (for history) */}
        {isHistory && plan.chartingRemarks && (
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Charting Remarks
            </p>
            <p className="text-sm text-gray-600">{plan.chartingRemarks}</p>
          </div>
        )}

        {/* Reviewed By (for history) */}
        {isHistory && plan.chartingApprovedAt && (
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Reviewed by:</span>{" "}
              {plan.chartingApprovedByUser
                ? `${plan.chartingApprovedByUser.firstName} ${plan.chartingApprovedByUser.lastName}`
                : "Unknown"}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Date:</span>{" "}
              {formatDate(plan.chartingApprovedAt)}
            </p>
          </div>
        )}

        {/* Possible Charting Remarks (for pending) */}
        {!isHistory && plan.possibleChartingRemarks && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Possible Charting Remarks (from LASG dataset)
            </p>
            <p className="text-sm text-gray-600">
              {plan.possibleChartingRemarks}
            </p>
          </div>
        )}

        {/* Pillars */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              Pillar Coordinates
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyPillarsToClipboard(plan.pillars)}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
            <span className="text-lg font-bold text-blue-800">PL</span>
          </div>
          <pre className="text-xs bg-white p-3 overflow-x-auto">
            {(() => {
              const text = getPillarsText(plan.pillars);
              const lines = text.split("\n");
              if (lines[0] === "PL" || lines[0]?.length === 2) {
                return lines.slice(1).join("\n") || "No pillars data";
              }
              return text || "No pillars data";
            })()}
          </pre>
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

        {/* Action Button (for pending only) */}
        {!isHistory && (
          <Button onClick={() => handleEditClick(plan)} className="w-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            Edit & Approve Charting Remarks
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Charting Admin</h1>
        <p className="text-gray-600 mt-1">
          Review and confirm charting remarks for submitted survey plans
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
                  No plans awaiting charting review
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
                  Approved plans will appear here
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

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Charting Remarks</DialogTitle>
            <DialogDescription>
              Review and edit the charting remarks for{" "}
              {selectedPlan?.planNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPlan?.possibleChartingRemarks && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
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
                <p className="text-sm text-gray-600">
                  {selectedPlan.possibleChartingRemarks}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Final Charting Remarks *
                </label>
                {selectedPlan?.possibleChartingRemarks && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPossibleRemarks}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Suggested Remarks
                  </Button>
                )}
              </div>
              <Textarea
                value={chartingRemarks}
                onChange={(e) => setChartingRemarks(e.target.value)}
                placeholder="Enter or edit charting remarks..."
                className="mt-1"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                These remarks will be used in the final certificate
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
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
