"use client";

import { MediaLink } from "@/components/media";
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
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  ExternalLink,
  History,
  Clock,
  Search,
  Lock,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";
import { useBatchLock } from "../../../hooks/useBatchLock";
import { RemarkSelector } from "../../../components/RemarkSelector";
import { PlanLockWarningDialog } from "../../../components/PlanLockWarningDialog";

interface Batch {
  id: string;
  batchCode: string;
  totalAmount: number;
  lasgReceiptUrl: string;
  remitaReceiptUrl?: string | null;
  createdAt: Date;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  plans: Array<{
    id: string;
    planNumber: string;
    planType?: string;
    referencePlanNumber?: string | null;
    lga: string | null;
    deededArea: string;
    queryLasgReceiptUrls?: string[];
    queryRemitaReceiptUrls?: string[];
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [uniqueQueryReasons, setUniqueQueryReasons] = useState<string[]>([]);

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
    role: "ACCOUNTS",
    onLockAcquired: (batchId, batchCode, planCount) => {
      toast.success(
        `Batch ${batchCode} locked for Accounts review (3 minutes)`
      );
    },
    onLockReleased: () => {
      toast.info("Accounts batch lock released");
    },
  });

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await releaseLock();
      await fetchBatches();
    } finally {
      setIsUnlocking(false);
    }
  };

  // Filter batches based on search query
  const filteredBatches = useMemo(() => {
    let result = batches;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = batches.filter((batch) => {
        const matchesBatchCode = batch.batchCode.toLowerCase().includes(query);
        const matchesSubmitter =
          `${batch.submitter.firstName} ${batch.submitter.lastName}`
            .toLowerCase()
            .includes(query);
        const matchesEmail = batch.submitter.email
          .toLowerCase()
          .includes(query);
        const matchesPlanNumbers = batch.plans.some(
          (plan) =>
            plan.planNumber.toLowerCase().includes(query) ||
            (plan.lga && plan.lga.toLowerCase().includes(query))
        );
        return (
          matchesBatchCode ||
          matchesSubmitter ||
          matchesEmail ||
          matchesPlanNumbers
        );
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
    return historyBatches.filter((batch) => {
      const matchesBatchCode = batch.batchCode.toLowerCase().includes(query);
      const matchesSubmitter =
        `${batch.submitter.firstName} ${batch.submitter.lastName}`
          .toLowerCase()
          .includes(query);
      const matchesEmail = batch.submitter.email.toLowerCase().includes(query);
      const matchesPlanNumbers = batch.plans.some(
        (plan) =>
          plan.planNumber.toLowerCase().includes(query) ||
          (plan.lga && plan.lga.toLowerCase().includes(query))
      );
      return (
        matchesBatchCode ||
        matchesSubmitter ||
        matchesEmail ||
        matchesPlanNumbers
      );
    });
  }, [historyBatches, searchQuery]);

  useEffect(() => {
    fetchBatches();
    fetchPendingCount();
    fetchUniqueRemarks();
  }, []);

  const fetchUniqueRemarks = async () => {
    try {
      const res = await surfboardApi.mda.remarks.queryReasons("accounts");
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

  const fetchPendingCount = async () => {
    try {
      const result = await surfboardApi.mda.pendingCounts();
      if (result.success) {
        setPendingCount(result.data.accounts);
      }
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const result = await surfboardApi.mda.accounts.batches();
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
    // Refresh pending count after fetching batches
    fetchPendingCount();
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await surfboardApi.mda.accounts.batches("history");
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
      const result = await surfboardApi.mda.accounts.decide(
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
        await fetchBatches(); // Refresh the list
        await acquireLock(); // Instantly lock next batch
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
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading batches...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PlanLockWarningDialog
        isOpen={showLeaveWarning}
        planNumber={lockedBatchCode ? `Batch ${lockedBatchCode}` : null}
        onConfirmLeave={confirmLeave}
        onCancel={cancelLeave}
      />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Accounts Admin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review and approve LASG payment receipts for Certificate of
              Deposit batches
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-violet-600">{pendingCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pending Batches
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search by batch code, plan number, submitter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending ({filteredBatches.length})
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
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No batches awaiting approval"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Batches with LASG receipts will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBatches.map((batch) => {
                  const isBatchMine = isBatchLockedByMe(batch.id);
                  const isDisabled = !isBatchMine;
                  return (
                    <Card
                      key={batch.id}
                      className={
                        isBatchMine
                          ? "border-2 border-violet-200 ring-2 ring-violet-100"
                          : "border-2 border-gray-200 dark:border-white/10"
                      }
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-xl">
                                Batch {batch.batchCode}
                              </CardTitle>
                              {isBatchMine ? (
                                <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
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
                              )}
                            </div>
                            <CardDescription>
                              Submitted by {batch.submitter.firstName}{" "}
                              {batch.submitter.lastName} (
                              {batch.submitter.email})
                            </CardDescription>
                          </div>
                          {isBatchMine && (
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
                          <div className="text-right">
                            <p className="text-2xl font-bold text-violet-600">
                              ₦{batch.totalAmount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {batch.plans.length} plan
                              {batch.plans.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Payment Receipts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* LASG Receipt */}
                          <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              LASG Payment Receipt
                            </p>
                            {batch.lasgReceiptUrl ? (
                              <MediaLink
                                href={surfboardApi.files.getViewUrl(batch.lasgReceiptUrl)}
                                className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                View LASG Receipt
                                <ExternalLink className="w-3 h-3" />
                              </MediaLink>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                                No LASG receipt
                              </span>
                            )}
                          </div>

                          {/* Remita Receipt */}
                          <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Remita Payment Receipt
                            </p>
                            {batch.remitaReceiptUrl ? (
                              <a
                                href={batch.remitaReceiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                View Remita Receipt
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                                No Remita receipt
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Plans Table */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Plans in Batch
                          </p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Plan Number</TableHead>
                                <TableHead>Plan Type</TableHead>
                                <TableHead>LGA</TableHead>
                                <TableHead>Area (m²)</TableHead>
                                <TableHead>Query Fee Receipts</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {batch.plans.map((plan) => (
                                <TableRow key={plan.id}>
                                  <TableCell className="font-medium">
                                    <span className="block">
                                      {plan.planNumber}
                                    </span>
                                    {plan.referencePlanNumber && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                        Ref: {plan.referencePlanNumber}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {plan.planType || "N/A"}
                                  </TableCell>
                                  <TableCell>{plan.lga || "N/A"}</TableCell>
                                  <TableCell>{plan.deededArea}</TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {plan.queryLasgReceiptUrls?.map(
                                        (url: string, idx: number) => (
                                          <MediaLink
                                            key={`lasg-${idx}`}
                                            href={surfboardApi.files.linkFor(url)}
                                            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                                          >
                                            <FileText className="w-3 h-3" />
                                            Query LASG {idx + 1}
                                          </MediaLink>
                                        )
                                      )}
                                      {plan.queryRemitaReceiptUrls?.map(
                                        (url: string, idx: number) => (
                                          <MediaLink
                                            key={`remita-${idx}`}
                                            href={surfboardApi.files.linkFor(url)}
                                            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                                          >
                                            <FileText className="w-3 h-3" />
                                            Query Remita {idx + 1}
                                          </MediaLink>
                                        )
                                      )}
                                      {!plan.queryLasgReceiptUrls?.length &&
                                        !plan.queryRemitaReceiptUrls
                                          ?.length && (
                                          <span className="text-xs text-gray-400 dark:text-gray-500">
                                            No Query Fees
                                          </span>
                                        )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-4">
                          <Button
                            onClick={() =>
                              handleApprovalClick(batch, "approve")
                            }
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isDisabled}
                          >
                            {isDisabled ? (
                              <Lock className="w-4 h-4 mr-2" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            {isDisabled ? "Locked" : "Approve"}
                          </Button>
                          <Button
                            onClick={() =>
                              handleApprovalClick(batch, "disapprove")
                            }
                            variant="destructive"
                            disabled={isDisabled}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Disapprove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {historyLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
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
                      : "Approved and disapproved batches will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHistoryBatches.map((batch) => (
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
                          <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
                            ₦{batch.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {batch.plans.length} plan
                            {batch.plans.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Review Info */}
                      <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-sm">
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Reviewed by:</span>{" "}
                          {batch.accountsApprovedByUser
                            ? `${batch.accountsApprovedByUser.firstName} ${batch.accountsApprovedByUser.lastName}`
                            : "Unknown"}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Date:</span>{" "}
                          {formatDate(batch.accountsApprovedAt)}
                        </p>
                        {batch.accountsComment && (
                          <p className="text-gray-600 dark:text-gray-400 mt-2">
                            <span className="font-medium">Comment:</span>{" "}
                            {batch.accountsComment}
                          </p>
                        )}
                      </div>

                      {/* Batch Receipts for History */}
                      <div className="flex flex-wrap gap-3">
                        {batch.lasgReceiptUrl && (
                          <MediaLink
                            href={surfboardApi.files.getViewUrl(batch.lasgReceiptUrl)}
                            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 bg-violet-50 px-2 py-1 rounded"
                          >
                            <FileText className="w-3 h-3" />
                            Batch LASG Receipt
                          </MediaLink>
                        )}
                        {batch.remitaReceiptUrl && (
                          <a
                            href={batch.remitaReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 bg-violet-50 px-2 py-1 rounded"
                          >
                            <FileText className="w-3 h-3" />
                            Batch Remita Receipt
                          </a>
                        )}
                      </div>

                      {/* Plans Summary */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Plans:</span>{" "}
                        {batch.plans.map((p) => p.planNumber).join(", ")}
                      </div>

                      {/* Query Receipts for History */}
                      {batch.plans.some(
                        (p) =>
                          p.queryLasgReceiptUrls?.length ||
                          p.queryRemitaReceiptUrls?.length
                      ) && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Query Fee Receipts:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {batch.plans
                              .flatMap((p) => [
                                ...(p.queryLasgReceiptUrls?.map((url, i) => ({
                                  url,
                                  label: `${p.planNumber} LASG ${i + 1}`,
                                })) || []),
                                ...(p.queryRemitaReceiptUrls?.map((url, i) => ({
                                  url,
                                  label: `${p.planNumber} Remita ${i + 1}`,
                                })) || []),
                              ])
                              .map((item, idx) => (
                                <MediaLink
                                  key={idx}
                                  href={surfboardApi.files.linkFor(item.url)}
                                  className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 bg-violet-50 px-2 py-1 rounded"
                                >
                                  <FileText className="w-3 h-3" />
                                  {item.label}
                                </MediaLink>
                              ))}
                          </div>
                        </div>
                      )}
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
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Batch: {selectedBatch.batchCode}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Amount: ₦{selectedBatch.totalAmount.toLocaleString()}
                  </p>
                </div>
              )}

              {approvalAction === "disapprove" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason for Disapproval *
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
    </>
  );
}
