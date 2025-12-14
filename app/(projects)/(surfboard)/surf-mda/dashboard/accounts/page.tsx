"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  XCircle,
  FileText,
  Loader2,
  ExternalLink,
  History,
  Clock,
} from "lucide-react";
import {
  getAccountsBatches,
  updateAccountsApproval,
  getPendingCountByRole,
  getAccountsHistory,
} from "../../../actions/codActions";

interface Batch {
  id: string;
  batchCode: string;
  totalAmount: number;
  lasgReceiptUrl: string;
  createdAt: Date;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  plans: Array<{
    id: string;
    planNumber: string;
    lga: string | null;
    deededArea: string;
  }>;
}

interface HistoryBatch extends Batch {
  accountsApprovedAt: Date;
  accountsDisapproved: boolean;
  accountsComment: string | null;
  accountsApprovedByUser: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function AccountsAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [historyBatches, setHistoryBatches] = useState<HistoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    "approve" | "disapprove"
  >("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    fetchBatches();
    fetchPendingCount();
  }, []);

  useEffect(() => {
    if (activeTab === "history" && historyBatches.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchPendingCount = async () => {
    try {
      const result = await getPendingCountByRole();
      if (result.success && result.data) {
        setPendingCount(result.data.accounts);
      }
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const result = await getAccountsBatches();
      if (result.success && result.data) {
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
    // Refresh pending count after fetching batches
    fetchPendingCount();
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await getAccountsHistory();
      if (result.success && result.data) {
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

  const handleApprovalClick = (
    batch: Batch,
    action: "approve" | "disapprove"
  ) => {
    setSelectedBatch(batch);
    setApprovalAction(action);
    setShowApprovalDialog(true);
    setComment("");
  };

  const handleApprovalSubmit = async () => {
    if (!selectedBatch) return;

    try {
      setProcessing(true);
      const result = await updateAccountsApproval(
        selectedBatch.id,
        approvalAction === "approve",
        comment || undefined
      );

      if (result.success) {
        toast.success(
          `Batch ${selectedBatch.batchCode} ${
            approvalAction === "approve" ? "approved" : "disapproved"
          } successfully`
        );
        setShowApprovalDialog(false);
        fetchBatches(); // Refresh the list
        // Refresh history if on history tab
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to update approval");
      }
    } catch (error) {
      console.error("Error updating approval:", error);
      toast.error("An error occurred while updating approval");
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts Admin</h1>
          <p className="text-gray-600 mt-1">
            Review and approve LASG payment receipts for Certificate of Deposit
            batches
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blue-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">Pending Batches</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({batches.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {batches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">
                  No batches awaiting approval
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Batches with LASG receipts will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => (
                <Card key={batch.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          Batch {batch.batchCode}
                        </CardTitle>
                        <CardDescription>
                          Submitted by {batch.submitter.firstName}{" "}
                          {batch.submitter.lastName} ({batch.submitter.email})
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          ₦{batch.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {batch.plans.length} plan
                          {batch.plans.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* LASG Receipt */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        LASG Payment Receipt
                      </p>
                      <a
                        href={batch.lasgReceiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="w-4 h-4" />
                        View Receipt
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Plans Table */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Plans in Batch
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plan Number</TableHead>
                            <TableHead>LGA</TableHead>
                            <TableHead>Area</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batch.plans.map((plan) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium">
                                {plan.planNumber}
                              </TableCell>
                              <TableCell>{plan.lga || "N/A"}</TableCell>
                              <TableCell>{plan.deededArea}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        onClick={() => handleApprovalClick(batch, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleApprovalClick(batch, "disapprove")}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Disapprove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {historyLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : historyBatches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No history yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Approved and disapproved batches will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {historyBatches.map((batch) => (
                <Card key={batch.id} className="border-l-4 border-l-gray-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">
                            Batch {batch.batchCode}
                          </CardTitle>
                          <Badge
                            className={
                              batch.accountsDisapproved
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }
                          >
                            {batch.accountsDisapproved
                              ? "Disapproved"
                              : "Approved"}
                          </Badge>
                        </div>
                        <CardDescription>
                          Submitted by {batch.submitter.firstName}{" "}
                          {batch.submitter.lastName}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-600">
                          ₦{batch.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {batch.plans.length} plan
                          {batch.plans.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Review Info */}
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Reviewed by:</span>{" "}
                        {batch.accountsApprovedByUser
                          ? `${batch.accountsApprovedByUser.firstName} ${batch.accountsApprovedByUser.lastName}`
                          : "Unknown"}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Date:</span>{" "}
                        {formatDate(batch.accountsApprovedAt)}
                      </p>
                      {batch.accountsComment && (
                        <p className="text-gray-600 mt-2">
                          <span className="font-medium">Comment:</span>{" "}
                          {batch.accountsComment}
                        </p>
                      )}
                    </div>

                    {/* Plans Summary */}
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Plans:</span>{" "}
                      {batch.plans.map((p) => p.planNumber).join(", ")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve" : "Disapprove"} Batch
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "Confirm that the LASG payment receipt is valid and the payment has been verified."
                : "Provide a reason for disapproving this batch. Surfboard admins will be notified."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedBatch && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  Batch: {selectedBatch.batchCode}
                </p>
                <p className="text-sm text-gray-600">
                  Amount: ₦{selectedBatch.totalAmount.toLocaleString()}
                </p>
              </div>
            )}

            {approvalAction === "disapprove" && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Reason for Disapproval *
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter reason for disapproval..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprovalSubmit}
              disabled={
                processing || (approvalAction === "disapprove" && !comment)
              }
              className={
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {approvalAction === "approve" ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  {approvalAction === "approve" ? "Approve" : "Disapprove"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
