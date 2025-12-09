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
import {
  CheckCircle,
  FileText,
  Loader2,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import {
  getRecordsIPlans,
  updateRecordsIStatus,
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
  redCopyFileUrl: string | null;
  accountsStatus: string;
  chartingStatus: string;
  surconStatus: string;
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

export default function RecordsIAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const result = await getRecordsIPlans();
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
      const result = await updateRecordsIStatus(
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
        fetchPlans(); // Refresh the list
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
        <h1 className="text-3xl font-bold text-gray-900">Records I Admin</h1>
        <p className="text-gray-600 mt-1">
          Review uploaded record copies for quality and completeness
        </p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              No plans awaiting Records I review
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Submitted plans will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{plan.planNumber}</CardTitle>
                    <CardDescription>{plan.surveyTitle}</CardDescription>
                    {plan.batch && (
                      <div className="mt-2">
                        <Badge variant="outline">
                          Batch: {plan.batch.batchCode}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">Accounts:</span>
                      {getStatusBadge(plan.accountsStatus)}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">Charting:</span>
                      {getStatusBadge(plan.chartingStatus)}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500">SURCON:</span>
                      {getStatusBadge(plan.surconStatus)}
                    </div>
                  </div>
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

                {/* Record Copy - Key verification area for Records I */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">
                        Record Copy (Verify Quality & Completeness)
                      </p>
                    </div>
                  </div>

                  {plan.redCopyFileUrl ? (
                    <div className="space-y-3">
                      {/* Preview if image */}
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
                          <p className="text-xs text-gray-500 mt-1">
                            Click to view full size
                          </p>
                        </div>
                      )}

                      {/* Link to file */}
                      <a
                        href={plan.redCopyFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border text-blue-600 hover:bg-blue-50 transition-colors"
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
                    <p className="text-sm text-red-600">
                      No record copy uploaded!
                    </p>
                  )}
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
                    disabled={!plan.redCopyFileUrl}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                <label className="text-sm font-medium text-gray-700">
                  Query Reason *
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain why this plan is being queried (e.g., illegible document, missing pages, poor quality)..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The surveyor will be notified and can upload a new record copy
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
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
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
  );
}
