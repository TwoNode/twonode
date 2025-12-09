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
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  FileText,
  Loader2,
  XCircle,
  ExternalLink,
  Award,
  AlertTriangle,
} from "lucide-react";
import {
  getRecordsIIPlans,
  updateRecordsIIStatus,
} from "../../../../actions/codActions";

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
  batch: {
    batchCode: string;
    paymentStatus: string;
    planCount: number;
  } | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function RecordsIIAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

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

  const handleActionClick = (plan: Plan, action: "approve" | "query") => {
    setSelectedPlan(plan);
    setActionType(action);
    setComment("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    // Query action requires a comment
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
        fetchPlans(); // Refresh the list
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

  // Calculate batch progress
  const getBatchProgress = (batchCode: string) => {
    const batchPlans = plans.filter((p) => p.batch?.batchCode === batchCode);
    return {
      readyForFinal: batchPlans.length,
      total: batchPlans[0]?.batch?.planCount || batchPlans.length,
    };
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Records II Admin</h1>
        <p className="text-gray-600 mt-1">
          Final approval before submission to OSSG - verify physical copy
          matches uploaded copy
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Award className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">
            This is the final approval step
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Only plans where all 4 other approvals (Accounts, Charting, SURCON,
            Records I) are complete will appear here. Upon approval, the plan
            will be submitted to OSSG and marked as LODGED.
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              No plans awaiting Records II review
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Plans with all other approvals complete will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const batchProgress = plan.batch
              ? getBatchProgress(plan.batch.batchCode)
              : null;

            return (
              <Card key={plan.id} className="border-2 border-green-200">
                <CardHeader className="bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-xl">
                          {plan.planNumber}
                        </CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        {plan.surveyTitle}
                      </CardDescription>
                      {plan.batch && (
                        <div className="mt-2 space-y-2">
                          <Badge variant="outline">
                            Batch: {plan.batch.batchCode}
                          </Badge>
                          {batchProgress && (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={
                                  (batchProgress.readyForFinal /
                                    batchProgress.total) *
                                  100
                                }
                                className="w-32 h-2"
                              />
                              <span className="text-xs text-gray-600">
                                {batchProgress.readyForFinal}/
                                {batchProgress.total} ready
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                      <p className="text-sm font-medium">
                        {plan.ward || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">LCDA</p>
                      <p className="text-sm font-medium">
                        {plan.lcda || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Deeded Area</p>
                      <p className="text-sm font-medium">{plan.deededArea}</p>
                    </div>
                  </div>

                  {/* Charting Remarks (Final Approved) */}
                  {plan.chartingRemarks && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-purple-800 mb-1">
                        Final Charting Remarks
                      </p>
                      <p className="text-sm text-purple-700">
                        {plan.chartingRemarks}
                      </p>
                    </div>
                  )}

                  {/* Record Copy */}
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

                  {/* Submitter Info */}
                  {plan.user && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Submitted by</p>
                      <p className="text-sm font-medium">
                        {plan.user.firstName} {plan.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{plan.user.email}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleActionClick(plan, "approve")}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Final Approval & Lodge
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
  );
}
