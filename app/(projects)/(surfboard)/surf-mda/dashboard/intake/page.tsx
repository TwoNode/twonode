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
  Clock,
  History,
  User,
  Hash,
  Briefcase,
  Mail,
  Phone,
  Search,
  Package,
} from "lucide-react";
import {
  getIntakeBatches,
  getIntakeHistoryBatches,
  updateIntakeBatchStatus,
} from "../../../actions/codActions";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  deededArea: string;
  intakeStatus?: string;
  intakeApprovedAt?: Date;
  intakeApprovedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
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
}

export default function IntakeAdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [historyBatches, setHistoryBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "query">("approve");
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const query = searchQuery.toLowerCase();
    return batches.filter((b) => {
      const matchesBatchCode = b.batchCode.toLowerCase().includes(query);
      const matchesUser = b.submitter && (`${b.submitter.firstName} ${b.submitter.lastName}`.toLowerCase().includes(query) || b.submitter.surconRegNumber?.toLowerCase().includes(query));
      return matchesBatchCode || matchesUser;
    });
  }, [batches, searchQuery]);

  const filteredHistoryBatches = useMemo(() => {
    if (!searchQuery.trim()) return historyBatches;
    const query = searchQuery.toLowerCase();
    return historyBatches.filter((b) => {
      const matchesBatchCode = b.batchCode.toLowerCase().includes(query);
      const matchesUser = b.submitter && (`${b.submitter.firstName} ${b.submitter.lastName}`.toLowerCase().includes(query) || b.submitter.surconRegNumber?.toLowerCase().includes(query));
      return matchesBatchCode || matchesUser;
    });
  }, [historyBatches, searchQuery]);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === "history" && historyBatches.length === 0) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const result = await getIntakeBatches();
      if (result.success && result.data) {
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
      const result = await getIntakeHistoryBatches();
      if (result.success && result.data) {
        const sortedBatches = (result.data as any).sort((a: any, b: any) => {
          const aTime = new Date(Math.max(...a.plans.map((p: any) => new Date(p.intakeApprovedAt || 0).getTime()))).getTime();
          const bTime = new Date(Math.max(...b.plans.map((p: any) => new Date(p.intakeApprovedAt || 0).getTime()))).getTime();
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

  const handleActionClick = (batch: Batch, action: "approve" | "query") => {
    setSelectedBatch(batch);
    setActionType(action);
    setComment("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!selectedBatch) return;

    if (actionType === "query" && !comment.trim()) {
      toast.error("Please provide a reason for querying the batch");
      return;
    }

    try {
      setProcessing(true);
      const result = await updateIntakeBatchStatus(
        selectedBatch.id,
        actionType === "approve",
        comment.trim() || undefined
      );

      if (result.success) {
        toast.success(
          actionType === "approve"
            ? `Batch ${selectedBatch.batchCode} approved successfully (${result.data?.updatedCount} plans)`
            : `Batch ${selectedBatch.batchCode} queried successfully`
        );
        setShowDialog(false);
        fetchBatches();
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
          <p className="mt-4 text-gray-600">Loading intake batches...</p>
        </div>
      </div>
    );
  }

  const renderBatchCard = (batch: Batch, isHistory: boolean = false) => {
    const isQueried = isHistory && batch.plans.some(p => p.intakeStatus === "QUERIED");
    const isApproved = isHistory && !isQueried && batch.plans.every(p => p.intakeStatus === "APPROVED");
    const intakeTime = isHistory ? new Date(Math.max(...batch.plans.map(p => new Date(p.intakeApprovedAt || 0).getTime()))) : null;

    return (
      <Card
        key={batch.id}
        className={`transition-all duration-200 ${isHistory
            ? isQueried ? "border-l-4 border-l-red-400" : isApproved ? "border-l-4 border-l-green-400" : ""
            : "border-l-4 border-l-orange-400 hover:shadow-md"
          }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-xl">Batch {batch.batchCode}</CardTitle>
                {isHistory && (
                  <Badge className={isQueried ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                    {isQueried ? "Queried" : "Approved"}
                  </Badge>
                )}
                {!isHistory && (
                  <Badge className="bg-amber-100 text-amber-700">Pending Review</Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Submitted on {formatDate(batch.createdAt)} • {batch.plans.length} plan{batch.plans.length !== 1 ? 's' : ''} in batch
              </CardDescription>
            </div>
            {isHistory && intakeTime && (
               <div className="text-right text-xs text-gray-500">
                  <p>Processed on:</p>
                  <p className="font-medium text-gray-700">{formatDate(intakeTime)}</p>
               </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Surveyor Information */}
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
                    <p className="text-sm font-medium text-gray-900">
                      {batch.submitter.firstName} {batch.submitter.lastName}
                    </p>
                  </div>
                </div>
                {batch.submitter.surconRegNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">SURCON Number</p>
                      <p className="text-sm font-medium text-gray-900">
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
                      <p className="text-sm font-medium text-gray-900">
                        {batch.submitter.companyName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plan Summaries */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
              Plans in this Batch
            </div>
            <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
               {batch.plans.map(p => (
                 <li key={p.id} className="p-3 text-sm hover:bg-gray-50 flex justify-between items-center bg-white">
                    <div>
                      <span className="font-medium text-gray-900">{p.planNumber}</span>
                      <span className="text-gray-500 ml-2">{p.surveyTitle}</span>
                    </div>
                    {isHistory && p.intakeStatus && (
                       <Badge variant={p.intakeStatus === "APPROVED" ? "outline" : "destructive"} className="text-[10px] h-5">
                          {p.intakeStatus}
                       </Badge>
                    )}
                 </li>
               ))}
            </ul>
          </div>

          {/* Action Buttons (for pending only) */}
          {!isHistory && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => handleActionClick(batch, "approve")}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Entire Batch
              </Button>
              <Button
                onClick={() => handleActionClick(batch, "query")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
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

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Intake Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Review and approve physical document bundles (batches) sequentially
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                  <p className="text-gray-500 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No batches awaiting Intake review"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
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
                  <p className="text-gray-500 text-lg">
                    {searchQuery ? "No matching batches found" : "No history yet"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Processed batches will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredHistoryBatches.map((batch) => renderBatchCard(batch, true))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve Batch" : "Query Batch"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `Confirm that you have received and verified the physical bundle for Batch ${selectedBatch?.batchCode}`
                  : `Provide a query reason for Physical Batch ${selectedBatch?.batchCode}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === "approve" ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    By approving, you confirm that:
                  </p>
                  <ul className="text-sm text-green-700 list-disc list-inside mt-2">
                    <li>The physical copies of ALL plans ({selectedBatch?.plans.length}) in this batch align perfectly.</li>
                    <li>Records II will now be able to process this batch.</li>
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
                    placeholder="Specific issue with the physical plans..."
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The surveyor will be notified of this query across all associated plans.
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
    </>
  );
}
