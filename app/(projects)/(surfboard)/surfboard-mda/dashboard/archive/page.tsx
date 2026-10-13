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
  Archive,
  CheckCircle,
  Clock,
  History,
  Loader2,
  FolderCheck,
  Search,
  FileText,
  ExternalLink,
  User,
  Hash,
  Briefcase,
  Mail,
  Phone,
  Package,
  StickyNote,
  Image as ImageIcon,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  planType?: string;
  referencePlanNumber?: string | null;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  locality?: string | null;
  deededArea: string;
  chartingRemarks?: string | null;
  redCopyFileUrl: string | null;
  recordsIIApprovedAt?: Date | null;
  // History fields
  archiveReceivedAt?: Date | null;
  archiveNotes?: string | null;
}

interface Batch {
  id: string;
  batchCode: string;
  createdAt: Date;
  submitter: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    surconRegNumber: string | null;
    companyName: string | null;
  } | null;
  plans: Plan[];
  _count?: { plans: number };
}

export default function ArchiveDashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [historyBatches, setHistoryBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state — supports both batch-level and plan-level actions
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"batch" | "plan">("plan");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [archiveNotes, setArchiveNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // Image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Filter batches based on search query
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const query = searchQuery.toLowerCase();
    return batches.filter((b) => {
      const matchesBatchCode = b.batchCode.toLowerCase().includes(query);
      const matchesUser =
        b.submitter &&
        (`${b.submitter.firstName} ${b.submitter.lastName}`
          .toLowerCase()
          .includes(query) ||
          b.submitter.surconRegNumber?.toLowerCase().includes(query) ||
          b.submitter.companyName?.toLowerCase().includes(query));
      const matchesPlan = b.plans.some(
        (p) =>
          p.planNumber.toLowerCase().includes(query) ||
          p.surveyTitle.toLowerCase().includes(query) ||
          p.lga?.toLowerCase().includes(query) ||
          p.ward?.toLowerCase().includes(query)
      );
      return matchesBatchCode || matchesUser || matchesPlan;
    });
  }, [batches, searchQuery]);

  const filteredHistoryBatches = useMemo(() => {
    if (!searchQuery.trim()) return historyBatches;
    const query = searchQuery.toLowerCase();
    return historyBatches.filter((b) => {
      const matchesBatchCode = b.batchCode.toLowerCase().includes(query);
      const matchesUser =
        b.submitter &&
        (`${b.submitter.firstName} ${b.submitter.lastName}`
          .toLowerCase()
          .includes(query) ||
          b.submitter.surconRegNumber?.toLowerCase().includes(query) ||
          b.submitter.companyName?.toLowerCase().includes(query));
      const matchesPlan = b.plans.some(
        (p) =>
          p.planNumber.toLowerCase().includes(query) ||
          p.surveyTitle.toLowerCase().includes(query)
      );
      return matchesBatchCode || matchesUser || matchesPlan;
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
      const result = await surfboardApi.mda.archive.batches();
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
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await surfboardApi.mda.archive.batches("history");
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

  // Plan-level archive action
  const handlePlanArchiveClick = (plan: Plan, batch: Batch) => {
    setSelectedPlan(plan);
    setSelectedBatch(batch);
    setDialogMode("plan");
    setArchiveNotes("");
    setShowDialog(true);
  };

  // Batch-level archive action
  const handleBatchArchiveClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setSelectedPlan(null);
    setDialogMode("batch");
    setArchiveNotes("");
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (dialogMode === "batch") {
      await handleBatchSubmit();
    } else {
      await handlePlanSubmit();
    }
  };

  const handlePlanSubmit = async () => {
    if (!selectedPlan) return;

    try {
      setProcessing(true);
      setProcessingPlanId(selectedPlan.id);
      const result = await surfboardApi.mda.archive.markArchived(
        selectedPlan.id,
        archiveNotes.trim() || undefined
      );

      if (result.success) {
        toast.success(`Plan ${selectedPlan.planNumber} archived successfully`);
        setShowDialog(false);
        fetchBatches();
        if (activeTab === "history") {
          fetchHistory();
        }
      } else {
        toast.error(result.error || "Failed to archive plan");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setProcessing(false);
      setProcessingPlanId(null);
    }
  };

  const handleBatchSubmit = async () => {
    if (!selectedBatch) return;

    try {
      setProcessing(true);

      let successCount = 0;
      let failedCount = 0;

      for (const plan of selectedBatch.plans) {
        const result = await surfboardApi.mda.archive.markArchived(
          plan.id,
          archiveNotes.trim() || undefined
        );
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      if (failedCount === 0) {
        toast.success(
          `All ${successCount} plans in Batch ${selectedBatch.batchCode} archived successfully!`
        );
      } else {
        toast.warning(
          `${successCount} archived, ${failedCount} failed in Batch ${selectedBatch.batchCode}`
        );
      }

      setShowDialog(false);
      fetchBatches();
      if (activeTab === "history") {
        fetchHistory();
      }
    } catch (error) {
      console.error("Error processing batch:", error);
      toast.error("An error occurred while processing batch");
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

  const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading archive batches...
          </p>
        </div>
      </div>
    );
  }

  // Count total pending plans across all batches
  const totalPendingPlans = filteredBatches.reduce(
    (sum, b) => sum + b.plans.length,
    0
  );

  const renderBatchCard = (batch: Batch, isHistory: boolean = false) => {
    const isAllArchived =
      isHistory && batch.plans.every((p) => p.archiveReceivedAt);

    return (
      <Card
        key={batch.id}
        className={`transition-all duration-200 ${
          isHistory
            ? "border-l-4 border-l-green-400"
            : "border-l-4 border-l-amber-400 hover:shadow-md"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-xl">
                  Batch {batch.batchCode}
                </CardTitle>
                {isHistory && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Archived
                  </Badge>
                )}
                {!isHistory && (
                  <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Awaiting Archive
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Submitted on {formatDate(batch.createdAt)} •{" "}
                {batch.plans.length} plan
                {batch.plans.length !== 1 ? "s" : ""} in batch
              </CardDescription>
              {!isHistory &&
                batch._count &&
                batch._count.plans > batch.plans.length && (
                  <div className="flex items-center gap-2 mt-2">
                    <Progress
                      value={(batch.plans.length / batch._count.plans) * 100}
                      className="w-32 h-2"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {batch.plans.length}/{batch._count.plans} ready for
                      archive
                    </span>
                  </div>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Surveyor Information */}
          {batch.submitter && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-4">
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
                      {batch.submitter.firstName} {batch.submitter.lastName}
                    </p>
                  </div>
                </div>
                {batch.submitter.surconRegNumber && (
                  <div className="flex items-start gap-3">
                    <Hash className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">SURCON Number</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {batch.submitter.companyName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-600">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {batch.submitter.email}
                    </p>
                  </div>
                </div>
                {batch.submitter.phoneNumber && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-emerald-600">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {batch.submitter.phoneNumber}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans in this Batch */}
          <div className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 border-b border-gray-200 dark:border-white/10 font-medium text-sm text-gray-700 dark:text-gray-300">
              Plans in this Batch
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {batch.plans.map((p) => {
                const isPlanProcessing = processingPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    className="p-4 bg-white dark:bg-surface hover:bg-gray-50 transition-colors"
                  >
                    {/* Plan header */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {p.planNumber}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {p.surveyTitle}
                        </span>
                        {p.planType && (
                          <Badge variant="secondary" className="text-xs">
                            {p.planType}
                          </Badge>
                        )}
                        {p.referencePlanNumber && (
                          <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10">
                            Ref: {p.referencePlanNumber}
                          </span>
                        )}
                      </div>
                      {isHistory && p.archiveReceivedAt && (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>

                    {/* Location info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-lg mb-3 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">LGA</p>
                        <p className="font-medium">{p.lga || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Ward</p>
                        <p className="font-medium">{p.ward || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">LCDA</p>
                        <p className="font-medium">{p.lcda || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">
                          Deeded Area
                        </p>
                        <p className="font-medium">{p.deededArea}</p>
                      </div>
                    </div>

                    {/* Charting Remarks */}
                    {p.chartingRemarks && (
                      <div className="bg-purple-50 dark:bg-purple-500/10 p-3 rounded-lg mb-3">
                        <p className="text-xs font-medium text-purple-800 mb-1">
                          Charting Remarks
                        </p>
                        <p className="text-xs text-purple-700">
                          {p.chartingRemarks}
                        </p>
                      </div>
                    )}

                    {/* Record Copy Document */}
                    <div className="border border-violet-200 rounded-lg p-3 bg-violet-50 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-violet-600" />
                        <p className="text-xs font-medium text-violet-800">
                          Record Copy
                        </p>
                      </div>
                      {p.redCopyFileUrl ? (
                        <div className="space-y-2">
                          {isImageUrl(p.redCopyFileUrl) && (
                            <div
                              className="cursor-pointer inline-block"
                              onClick={() => setViewingImage(p.redCopyFileUrl)}
                            >
                              <img
                                src={p.redCopyFileUrl}
                                alt={`Record Copy - ${p.planNumber}`}
                                className="max-h-32 rounded border shadow-sm hover:shadow-md transition-shadow"
                              />
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Click to view full size
                              </p>
                            </div>
                          )}
                          <MediaLink
                            href={surfboardApi.files.getViewUrl(p.redCopyFileUrl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-surface rounded border text-violet-600 hover:bg-violet-50 transition-colors text-xs"
                          >
                            {isImageUrl(p.redCopyFileUrl) ? (
                              <ImageIcon className="w-3.5 h-3.5" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            Open Record Copy
                            <ExternalLink className="w-3 h-3" />
                          </MediaLink>
                        </div>
                      ) : (
                        <p className="text-xs text-red-600">
                          No record copy uploaded
                        </p>
                      )}
                    </div>

                    {/* Archive details (history) */}
                    {isHistory && p.archiveReceivedAt && (
                      <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-3 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-green-900">
                            Archived on {formatDate(p.archiveReceivedAt)}
                          </p>
                          {p.archiveNotes && (
                            <div className="flex items-start gap-1.5">
                              <StickyNote className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                              <p className="text-xs text-green-700">
                                <span className="font-medium">Notes:</span>{" "}
                                {p.archiveNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Per-Plan Archive Button */}
                    {!isHistory && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handlePlanArchiveClick(p, batch)}
                          className="bg-amber-600 hover:bg-amber-700 text-xs h-8"
                          disabled={isPlanProcessing}
                        >
                          {isPlanProcessing ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <FolderCheck className="w-3 h-3 mr-1" />
                          )}
                          Archive Plan
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch-Level Archive Button (only if > 1 plan) */}
          {!isHistory && batch.plans.length > 1 && (
            <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
              <Button
                onClick={() => handleBatchArchiveClick(batch)}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                <FolderCheck className="w-4 h-4 mr-2" />
                Archive All ({batch.plans.length} plans)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Determine dialog labels based on mode
  const dialogTarget =
    dialogMode === "batch"
      ? `all ${selectedBatch?.plans.length} plans in Batch ${selectedBatch?.batchCode}`
      : `Plan ${selectedPlan?.planNumber}`;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="w-8 h-8 text-amber-600" />
            Archive Dashboard
          </h1>
          <p className="mt-2 text-slate-600 dark:text-gray-300">
            Log the physical handover of plans from Records II to the official
            archive. This is for internal tracking.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search by plan number, batch code, surveyor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger
              value="pending"
              className="flex items-center gap-2 overflow-hidden"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">
                  Pending ({filteredBatches.length})
                </span>
                <span className="hidden sm:inline">
                  Pending ({filteredBatches.length} batch
                  {filteredBatches.length !== 1 ? "es" : ""},{" "}
                  {totalPendingPlans} plan
                  {totalPendingPlans !== 1 ? "s" : ""})
                </span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 overflow-hidden"
            >
              <History className="w-4 h-4 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">History</span>
                <span className="hidden sm:inline">Archived History</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {filteredBatches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Archive className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No Batches Pending"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Batches fully approved by Records II will appear here for physical archiving."}
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
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              </div>
            ) : filteredHistoryBatches.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {searchQuery
                      ? "No matching batches found"
                      : "No History Found"}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Archived batches will appear here."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredHistoryBatches.map((batch) =>
                  renderBatchCard(batch, true)
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderCheck className="w-5 h-5 text-amber-600" />
              Acknowledge Receipt & Archive
            </DialogTitle>
            <DialogDescription>
              Confirm that you have securely received and archived the physical
              copies for{" "}
              <strong className="text-slate-900 dark:text-white">
                {dialogTarget}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                By archiving, you confirm that:
              </p>
              <ul className="text-sm text-amber-700 list-disc list-inside mt-2 space-y-1">
                <li>
                  The physical plan
                  {dialogMode === "batch" ? "s have" : " has"} been received
                  from Records II.
                </li>
                <li>
                  The plan
                  {dialogMode === "batch" ? "s have" : " has"} been securely
                  stored in the official archive.
                </li>
                <li>
                  This action is for internal tracking and does not change the
                  plan&apos;s status.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="archive-notes"
                className="text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                Archive Notes / Location (Optional)
              </label>
              <Textarea
                id="archive-notes"
                placeholder="e.g., Cabinet 4, Shelf B, Row 3"
                value={archiveNotes}
                onChange={(e) => setArchiveNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Record the physical storage location for future reference.
                {dialogMode === "batch" &&
                  " This note will be applied to all plans in the batch."}
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
              disabled={processing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <FolderCheck className="w-4 h-4 mr-2" />
                  Confirm & Archive
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
    </>
  );
}
