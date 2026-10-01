/**
 * Submitted Batches Modal Component
 * Displays all submitted red copy batches for the current user
 * Allows retrying failed/pending payments
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import {
  FileText,
  Loader2,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Package,
  Trash2,
  ChevronDown,
  Copy,
  Download,
  Search,
  History,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { RemitaPaymentModal, type SubmitterInfo } from "./RemitaPaymentModal";
import { surfboardApi } from "@/surfboard/apiClient";
import type {
  RedCopyBatchPDFData,
} from "./RedCopySubmissionPDF";
import { PhysicalSubmissionModal } from "./PhysicalSubmissionModal";
import { useConfirm } from "@/hooks/useConfirm";

// Dynamically import DownloadSubmissionLetterBtn to avoid SSR issues
const DownloadSubmissionLetterBtn = dynamic(
  () => import("./DownloadSubmissionLetterBtn"),
  { ssr: false, loading: () => <Loader2 className="w-4 h-4 animate-spin" /> },
);

interface Batch {
  id: string;
  batchCode: string;
  planCount: number;
  totalFees: number;
  systemCharges: number;
  totalAmount: number;
  paymentStatus: string;
  userPaymentRef: string | null;
  userPaymentDate: Date | null;
  createdAt: Date;
  lasgReceiptUrl?: string | null;
  remitaReceiptUrl?: string | null;
  plans: Array<{
    id: string;
    planNumber: string;
    surveyTitle: string;
    facilitator?: string | null;
    status: string;
    redCopyStatus: string;
    physicalCopySubmitted: boolean;
    physicalCopySubmittedAt: Date | null;
    accountsStatus: string | null;
    chartingStatus: string | null;
    recordsIStatus: string | null;
    surconStatus: string | null;
  }>;
  submitter: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    payerID?: number | null;
    payerIDType?: string | null;
  } | null;
}

interface SubmittedBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubmittedBatchesModal({
  isOpen,
  onClose,
  onSuccess,
}: SubmittedBatchesModalProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [payingBatchId, setPayingBatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [physicalSubmittingBatchId, setPhysicalSubmittingBatchId] = useState<string | null>(null);

  // Active/History split: a batch moves to History once every plan in it
  // has reached LODGED — nothing further to do on it. Each tab is its own
  // paginated, server-filtered query (not a client-side slice of
  // everything), since history accumulates indefinitely.
  const [scope, setScope] = useState<"active" | "history">("active");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  // PDF generation state: stores fetched PDF data keyed by batchId
  const [pdfDataMap, setPdfDataMap] = useState<Record<string, RedCopyBatchPDFData>>({});
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  // No longer using Paystack
  /*
  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    []
  );
  */

  // Debounce search, same pattern as the admin list pages.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // A scope switch or new search query invalidates the current page.
  useEffect(() => {
    setPage(1);
  }, [scope, debouncedSearch]);

  const loadBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await surfboardApi.cod.batches.listPaginated({
        page,
        pageSize,
        scope,
        search: debouncedSearch || undefined,
      });
      if (result.success) {
        setBatches(result.data.data);
        setTotal(result.data.pagination.total);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        toast.error(result.error || "Failed to load batches");
      }
    } catch (error) {
      console.error("Error loading batches:", error);
      toast.error("An error occurred while loading batches");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, scope, debouncedSearch]);

  const loadCounts = useCallback(async () => {
    const [activeRes, historyRes] = await Promise.all([
      surfboardApi.cod.batches.listPaginated({ page: 1, pageSize: 1, scope: "active" }),
      surfboardApi.cod.batches.listPaginated({ page: 1, pageSize: 1, scope: "history" }),
    ]);
    if (activeRes.success) setActiveCount(activeRes.data.pagination.total);
    if (historyRes.success) setHistoryCount(historyRes.data.pagination.total);
  }, []);

  // Fetch batches whenever the modal is open and the query changes; counts
  // only need refreshing on open or after something that could move a
  // batch between tabs (payment/physical-submission success, delete-all).
  useEffect(() => {
    if (isOpen) loadBatches();
  }, [isOpen, loadBatches]);

  useEffect(() => {
    if (isOpen) loadCounts();
  }, [isOpen, loadCounts]);

  const [paymentBatch, setPaymentBatch] = useState<{
    id: string;
    batchCode: string;
    totalAmount: number;
    submitter: SubmitterInfo | null;
  } | null>(null);
  const [showPaymentView, setShowPaymentView] = useState(false);

  const handlePayNow = async (batchId: string) => {
    setPayingBatchId(batchId);
    try {
      const result = await surfboardApi.cod.batches.retryPayment(batchId);

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      const { amount, batchCode, submitter } = result.data;

      setPaymentBatch({
        id: batchId,
        batchCode,
        totalAmount: amount,
        submitter,
      });

      setShowPaymentView(true);
      toast.success(
        "Please generate and pay your Remita RRR in the window below.",
      );
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast.error(error?.message || "Failed to initialize payment");
    } finally {
      setPayingBatchId(null);
    }
  };

  const handleClosePayment = () => {
    setShowPaymentView(false);
    setPaymentBatch(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_USER_PAYMENT":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            <Clock className="w-3 h-3 mr-1" />
            Payment Pending
          </Badge>
        );
      case "LASG_PAID":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300"
          >
            <Package className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case "ACCOUNTS_APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/15"
          >
            {status}
          </Badge>
        );
    }
  };

  const canPayBatch = (status: string) => {
    return status === "PENDING_USER_PAYMENT";
  };

  const canDownloadLetter = (status: string) => {
    return [
      "LASG_PAID",
      "ACCOUNTS_APPROVED",
      "COMPLETED",
    ].includes(status);
  };

  /** Matches RECEIPT_ELIGIBLE_STATUSES in surfboard/services/receiptPdfService.ts. */
  const canDownloadReceipt = (status: string) => {
    return ["ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"].includes(status);
  };

  const handleFetchPdfData = useCallback(async (batchId: string) => {
    // If we already have data for this batch, do nothing
    if (pdfDataMap[batchId]) return;

    setLoadingPdfId(batchId);
    try {
      const result = await surfboardApi.cod.batches.get(batchId);
      if (result.success) {
        setPdfDataMap((prev) => ({
          ...prev,
          [batchId]: result.data as RedCopyBatchPDFData,
        }));
      } else {
        toast.error(result.error || "Failed to load batch data for PDF");
      }
    } catch (error) {
      console.error("Error fetching PDF data:", error);
      toast.error("An error occurred while loading PDF data");
    } finally {
      setLoadingPdfId(null);
    }
  }, [pdfDataMap]);

  const handleDeleteAll = async () => {
    if (
      !(await confirm({
        title: "Delete ALL batches?",
        description:
          "DEVELOPMENT ONLY: this will reset all related plans and cannot be undone.",
        confirmLabel: "Delete all",
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await surfboardApi.cod.batches.reset();
      if (result.success) {
        toast.success(
          `Successfully deleted ${result.data.deletedCount} batch(es)`,
        );
        await Promise.all([loadBatches(), loadCounts()]);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete batches");
      }
    } catch (error) {
      console.error("Error deleting batches:", error);
      toast.error("An error occurred while deleting batches");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {ConfirmDialog}
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  My Submitted Batches
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  View all your submitted red copy batches and manage payments
                </DialogDescription>
              </div>
            </div>
            {process.env.NODE_ENV !== "production" && (activeCount || 0) + (historyCount || 0) > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={isDeleting || isLoading}
                className="bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-md transition-all duration-200 hover:shadow-lg"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All (DEV)
                  </>
                )}
              </Button>
            )}
          </div>

          {((activeCount || 0) + (historyCount || 0) > 0) && (
            <>
              {/* Active/History tabs — a batch moves to History once every
                  plan in it has reached LODGED. */}
              <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1 w-fit">
                {([
                  { id: "active" as const, label: "Active", count: activeCount },
                  { id: "history" as const, label: "History", count: historyCount },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setScope(opt.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                      scope === opt.id
                        ? "bg-white dark:bg-surface text-blue-700 dark:text-blue-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {opt.id === "history" && <History className="w-3.5 h-3.5" />}
                    {opt.label}
                    {opt.count != null && opt.count > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">({opt.count})</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by batch number, plan number, title, or facilitator..."
                  className="pl-9"
                />
              </div>
            </>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                <Loader2 className="w-16 h-16 animate-spin text-blue-600 absolute top-0 left-0" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-4 font-medium">
                Loading batches...
              </p>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-6 bg-linear-to-br from-gray-50 to-gray-100 rounded-full mb-6">
                {debouncedSearch ? (
                  <Search className="w-20 h-20 text-gray-300" />
                ) : scope === "history" ? (
                  <History className="w-20 h-20 text-gray-300" />
                ) : (
                  <FileText className="w-20 h-20 text-gray-300" />
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-xl font-semibold mb-2">
                {debouncedSearch
                  ? `No batches match "${debouncedSearch}"`
                  : scope === "history"
                    ? "No batches in history yet"
                    : (activeCount || 0) + (historyCount || 0) === 0
                      ? "No batches submitted yet"
                      : "No active batches"}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
                {debouncedSearch
                  ? "Try a different batch number, plan number, title, or facilitator."
                  : scope === "history"
                    ? "Batches move here once every plan in them has been lodged."
                    : (activeCount || 0) + (historyCount || 0) === 0
                      ? "Submit plans for Certificate of Deposit to see them displayed here with full details"
                      : "Every submitted batch has been fully lodged — check the History tab."}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {batches.map((batch, index) => (
                <AccordionItem
                  key={batch.id}
                  value={batch.id}
                  className="group border-2 border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:border-blue-300 bg-linear-to-br from-white to-gray-50"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-5 hover:bg-linear-to-br hover:from-blue-50/50 hover:to-transparent transition-all duration-300">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <AccordionTrigger className="hover:no-underline p-0 flex-1 group/trigger">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-linear-to-br from-blue-100 to-blue-200 rounded-lg group-hover/trigger:from-blue-200 group-hover/trigger:to-blue-300 transition-all duration-200">
                                <Package className="w-4 h-4 text-blue-700" />
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover/trigger:text-blue-700 transition-colors duration-200">
                                {batch.batchCode}
                              </h3>
                            </div>
                          </AccordionTrigger>
                          {getStatusBadge(batch.paymentStatus)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="p-1 bg-white dark:bg-surface rounded">
                              <Package className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <span className="font-medium">
                              {batch.planCount} plan
                              {batch.planCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="p-1 bg-white dark:bg-surface rounded">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                            <span className="font-medium">
                              {format(new Date(batch.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-gray-900 dark:text-white bg-linear-to-br from-green-50 to-emerald-50 px-3 py-2 rounded-lg border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all duration-200">
                            <div className="p-1 bg-white dark:bg-surface rounded shadow-sm">
                              <CreditCard className="w-3.5 h-3.5 text-green-700" />
                            </div>
                            <span className="font-bold text-green-900">
                              ₦{batch.totalAmount.toLocaleString()}
                            </span>
                          </div>

                          {batch.userPaymentDate && (
                            <div className="flex items-center gap-2.5 text-green-700 bg-linear-to-br from-green-50 to-emerald-50 px-3 py-2 rounded-lg border border-green-200">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              <span className="font-medium text-sm">
                                Paid{" "}
                                {format(
                                  new Date(batch.userPaymentDate),
                                  "MMM d",
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {canPayBatch(batch.paymentStatus) && (
                          <Button
                            size="sm"
                            onClick={() => handlePayNow(batch.id)}
                            disabled={payingBatchId === batch.id}
                            className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                          >
                            {payingBatchId === batch.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Pay Now
                              </>
                            )}
                          </Button>
                        )}

                        {/* Download Submission Letter PDF */}
                        {canDownloadLetter(batch.paymentStatus) && (
                          <>
                            {pdfDataMap[batch.id] ? (
                              <DownloadSubmissionLetterBtn
                                batchCode={batch.batchCode}
                                pdfData={pdfDataMap[batch.id]}
                              />
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFetchPdfData(batch.id)}
                                disabled={loadingPdfId === batch.id}
                                className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
                              >
                                {loadingPdfId === batch.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Letter
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        )}

                        {canDownloadReceipt(batch.paymentStatus) && (
                          // Lets the user choose which receipt they need
                          // instead of always linking to whichever one
                          // happened to be on file — the real LASG receipt
                          // and the real Remita receipt are two different
                          // documents, plus twonode's own self-generated
                          // batch-summary PDF as a fallback (always
                          // available, never the actual government receipt).
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Receipt
                                <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {batch.lasgReceiptUrl ? (
                                <DropdownMenuItem asChild>
                                  <a href={batch.lasgReceiptUrl} target="_blank" rel="noopener noreferrer">
                                    LASG Receipt
                                  </a>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>LASG Receipt (not available)</DropdownMenuItem>
                              )}
                              {batch.remitaReceiptUrl ? (
                                <DropdownMenuItem asChild>
                                  <a href={batch.remitaReceiptUrl} target="_blank" rel="noopener noreferrer">
                                    Remita Receipt
                                  </a>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled>Remita Receipt (not available)</DropdownMenuItem>
                              )}
                              {/* <DropdownMenuItem asChild>
                                <a href={`/api/v1/surfboard/cod/batches/${batch.id}/receipt-pdf`}>
                                  Payment Summary (PDF)
                                </a>
                              </DropdownMenuItem> */}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <AccordionContent className="pt-1">
                      <div className="mt-5 pt-5 border-t-2 border-dashed border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                              Survey Plans in this Batch
                            </h4>
                            <div className="h-px flex-1 bg-linear-to-r from-gray-200 to-transparent"></div>
                          </div>
                          
                          {/* Physical Copies Submitted Button */}
                          {canDownloadLetter(batch.paymentStatus) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPhysicalSubmittingBatchId(batch.id)}
                              disabled={
                                !batch.plans.some(
                                  (p) => p.redCopyStatus === "SUBMITTED" && !p.physicalCopySubmitted && p.accountsStatus === "APPROVED" && p.chartingStatus === "APPROVED" && p.recordsIStatus === "APPROVED" && p.surconStatus === "APPROVED"
                                )
                              }
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm transition-all duration-200 font-semibold"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Physical copies submitted
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2.5">
                          {batch.plans.map((plan, planIndex) => (
                            <div
                              key={plan.id}
                              className="group/plan bg-white dark:bg-surface border-2 border-gray-100 dark:border-white/10 rounded-lg p-4 flex items-start justify-between gap-3 hover:border-blue-200 hover:shadow-md transition-all duration-200 hover:translate-x-1"
                              style={{ animationDelay: `${planIndex * 30}ms` }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-2">
                                  <div className="p-1.5 bg-linear-to-br from-blue-100 to-blue-200 rounded-md group-hover/plan:from-blue-200 group-hover/plan:to-blue-300 transition-all duration-200">
                                    <FileText className="w-4 h-4 text-blue-700" />
                                  </div>
                                  <span className="font-bold text-sm text-gray-900 dark:text-white group-hover/plan:text-blue-700 transition-colors duration-200">
                                    {plan.planNumber}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 ml-8 line-clamp-1">
                                  {plan.surveyTitle}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-semibold bg-linear-to-br from-gray-50 to-gray-100 border-gray-300 dark:border-white/15 hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
                                >
                                  {plan.status}
                                </Badge>
                                {plan.redCopyStatus !== "NOT_SUBMITTED" && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-semibold bg-linear-to-br from-blue-50 to-blue-100 text-blue-800 border-blue-300 hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
                                  >
                                    {plan.redCopyStatus}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {totalPages > 1 && (
          <div className="shrink-0 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} batch{total === 1 ? "" : "es"}
            </p>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DialogContent>

      {/* Manual Remita Payment Iframe Dialog */}
      {showPaymentView && paymentBatch && (
        <RemitaPaymentModal
          isOpen={showPaymentView}
          onClose={handleClosePayment}
          batchData={paymentBatch}
          onSuccess={async () => {
            await Promise.all([loadBatches(), loadCounts()]);
            if (onSuccess) onSuccess();
          }}
        />
      )}

      {/* Physical Submission Modal */}
      {physicalSubmittingBatchId && (
        <PhysicalSubmissionModal
          isOpen={true}
          onClose={() => setPhysicalSubmittingBatchId(null)}
          batchCode={batches.find((b) => b.id === physicalSubmittingBatchId)?.batchCode || ""}
          plans={batches.find((b) => b.id === physicalSubmittingBatchId)?.plans || []}
          onSuccess={async () => {
            await Promise.all([loadBatches(), loadCounts()]);
            if (onSuccess) onSuccess();
          }}
        />
      )}
      </Dialog>
    </>
  );
}
