/**
 * Submitted Batches Modal Component
 * Displays all submitted red copy batches for the current user
 * Allows retrying failed/pending payments
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  getUserBatches,
  retryBatchPayment,
  verifyBatchPayment,
  deleteAllBatches,
  payWithRemitaRRR,
  verifyLASGReceiptLink,
} from "../actions/codActions";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

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
  plans: Array<{
    id: string;
    planNumber: string;
    surveyTitle: string;
    status: string;
    redCopyStatus: string;
  }>;
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
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingBatchId, setPayingBatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // No longer using Paystack
  /*
  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    []
  );
  */

  // Fetch batches when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBatches();
    }
  }, [isOpen]);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const result = await getUserBatches();
      if (result.success && result.data) {
        setBatches(result.data.batches);
      } else {
        toast.error(result.error || "Failed to load batches");
      }
    } catch (error) {
      console.error("Error loading batches:", error);
      toast.error("An error occurred while loading batches");
    } finally {
      setIsLoading(false);
    }
  };

  const [paymentBatch, setPaymentBatch] = useState<{
    id: string;
    batchCode: string;
    totalAmount: number;
  } | null>(null);
  const [manualRRR, setManualRRR] = useState("");
  const [isVerifyingRRR, setIsVerifyingRRR] = useState(false);
  const [showPaymentView, setShowPaymentView] = useState(false);

  const handlePayNow = async (batchId: string) => {
    setPayingBatchId(batchId);
    try {
      const result = await retryBatchPayment(batchId);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      const { amount, batchCode } = result.data;

      setPaymentBatch({
        id: batchId,
        batchCode,
        totalAmount: amount,
      });

      setShowPaymentView(true);
      toast.success("Please generate and pay your Remita RRR in the window below.");

    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast.error(error?.message || "Failed to initialize payment");
    } finally {
      setPayingBatchId(null);
    }
  };

  const [manualReceiptUrl, setManualReceiptUrl] = useState("");
  const [showManualLinkInput, setShowManualLinkInput] = useState(false);

  const handleCopyAmount = () => {
    if (paymentBatch) {
      navigator.clipboard.writeText(paymentBatch.totalAmount.toString());
      toast.success("Amount copied to clipboard");
    }
  };

  const handleVerifyManualRRR = async () => {
    if (!manualRRR || manualRRR.length < 5) {
      toast.error("Please enter a valid Remita RRR");
      return;
    }

    if (!paymentBatch) return;

    try {
      setIsVerifyingRRR(true);
      const result = await payWithRemitaRRR(paymentBatch.id, manualRRR);

      if (result.success && result.data) {
        if (result.data.status === "LASG_PAID") {
          toast.success("Payment verified successfully!");
          setShowPaymentView(false);
          setPaymentBatch(null);
          setManualRRR("");
          setManualReceiptUrl("");
          setShowManualLinkInput(false);
          // Reload batches to show updated status
          await loadBatches();
          if (onSuccess) onSuccess();
          router.refresh();
        } else if (result.data.status === "PENDING") {
          toast.info("Payment is still pending verification.");
        }
      } else if (result.error === "VERIFICATION_FAILED_NEED_RECEIPT") {
        toast.warning("Automatic verification failed. Please provide your receipt link.");
        setShowManualLinkInput(true);
      } else {
        toast.error(result.error || "Failed to verify RRR");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Failed to verify payment");
    } finally {
      setIsVerifyingRRR(false);
    }
  };

  const handleVerifyReceiptLink = async () => {
    if (!manualReceiptUrl || !manualReceiptUrl.startsWith("http")) {
      toast.error("Please enter a valid receipt URL");
      return;
    }

    if (!paymentBatch) return;

    try {
      setIsVerifyingRRR(true);
      const result = await verifyLASGReceiptLink(paymentBatch.id, manualReceiptUrl);

      if (result.success && result.data?.status === "LASG_PAID") {
        toast.success("Receipt verified successfully via link!");
        setShowPaymentView(false);
        setPaymentBatch(null);
        setManualReceiptUrl("");
        setManualRRR("");
        setShowManualLinkInput(false);
        await loadBatches();
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        toast.error(result.error || "Receipt verification failed");
      }
    } catch (error: any) {
      console.error("Link verification error:", error);
      toast.error(error.message || "Failed to verify receipt link");
    } finally {
      setIsVerifyingRRR(false);
    }
  };

  const handleClosePayment = () => {
    if (showPaymentView && !confirm("Are you sure you want to close the payment window?")) {
      return;
    }
    setShowPaymentView(false);
    setPaymentBatch(null);
    setManualRRR("");
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
      case "USER_PAID":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
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
            className="bg-gray-50 text-gray-700 border-gray-300"
          >
            {status}
          </Badge>
        );
    }
  };

  const canPayBatch = (status: string) => {
    return status === "PENDING_USER_PAYMENT";
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "⚠️ DEVELOPMENT ONLY: Are you sure you want to delete ALL batches? This will reset all related plans and cannot be undone!"
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAllBatches();
      if (result.success && result.data) {
        toast.success(
          `Successfully deleted ${result.data.deletedCount} batch(es)`
        );
        await loadBatches();
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
            {process.env.NODE_ENV !== "production" && batches.length > 0 && (
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                <Loader2 className="w-16 h-16 animate-spin text-blue-600 absolute top-0 left-0" />
              </div>
              <p className="text-gray-500 mt-4 font-medium">
                Loading batches...
              </p>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-6 bg-linear-to-br from-gray-50 to-gray-100 rounded-full mb-6">
                <FileText className="w-20 h-20 text-gray-300" />
              </div>
              <p className="text-gray-700 text-xl font-semibold mb-2">
                No batches submitted yet
              </p>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Submit plans for Certificate of Deposit to see them displayed
                here with full details
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {batches.map((batch, index) => (
                <AccordionItem
                  key={batch.id}
                  value={batch.id}
                  className="group border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:border-blue-300 bg-linear-to-br from-white to-gray-50"
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
                              <h3 className="text-lg font-bold text-gray-900 group-hover/trigger:text-blue-700 transition-colors duration-200">
                                {batch.batchCode}
                              </h3>
                            </div>
                          </AccordionTrigger>
                          {getStatusBadge(batch.paymentStatus)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2.5 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="p-1 bg-white rounded">
                              <Package className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <span className="font-medium">
                              {batch.planCount} plan
                              {batch.planCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                            <div className="p-1 bg-white rounded">
                              <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            </div>
                            <span className="font-medium">
                              {format(new Date(batch.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-gray-900 bg-linear-to-br from-green-50 to-emerald-50 px-3 py-2 rounded-lg border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all duration-200">
                            <div className="p-1 bg-white rounded shadow-sm">
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
                                  "MMM d"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
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
                      </div>
                    </div>

                    <AccordionContent className="pt-1">
                      <div className="mt-5 pt-5 border-t-2 border-dashed border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                            Survey Plans in this Batch
                          </h4>
                          <div className="h-px flex-1 bg-linear-to-r from-gray-200 to-transparent"></div>
                        </div>
                        <div className="space-y-2.5">
                          {batch.plans.map((plan, planIndex) => (
                            <div
                              key={plan.id}
                              className="group/plan bg-white border-2 border-gray-100 rounded-lg p-4 flex items-start justify-between gap-3 hover:border-blue-200 hover:shadow-md transition-all duration-200 hover:translate-x-1"
                              style={{ animationDelay: `${planIndex * 30}ms` }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-2">
                                  <div className="p-1.5 bg-linear-to-br from-blue-100 to-blue-200 rounded-md group-hover/plan:from-blue-200 group-hover/plan:to-blue-300 transition-all duration-200">
                                    <FileText className="w-4 h-4 text-blue-700" />
                                  </div>
                                  <span className="font-bold text-sm text-gray-900 group-hover/plan:text-blue-700 transition-colors duration-200">
                                    {plan.planNumber}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 ml-8 line-clamp-1">
                                  {plan.surveyTitle}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-semibold bg-linear-to-br from-gray-50 to-gray-100 border-gray-300 hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
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
      </DialogContent>

      {/* Manual Remita Payment Iframe Dialog */}
      <Dialog open={showPaymentView} onOpenChange={handleClosePayment}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Complete Payment for Batch {paymentBatch?.batchCode}
                </DialogTitle>
                <DialogDescription>
                  Generate your RRR in the window below, pay, then paste the RRR to verify.
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Amount</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-2xl font-bold text-green-700">
                    ₦{paymentBatch?.totalAmount.toLocaleString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 ml-2 text-xs font-medium text-gray-600"
                    onClick={handleCopyAmount}
                    title="Copy Amount"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Verification Bar */}
          <div className="bg-blue-50 p-4 border-b flex flex-col items-center gap-4 z-10 shadow-sm">
            <div className="w-full flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="manual-rrr" className="text-xs font-bold text-blue-800 uppercase mb-1 block">
                  1. Generate RRR below & Pay
                  <span className="ml-2 font-normal text-gray-500 normal-case">(Use "Lagos State Surveyor General" biller)</span>
                </label>
                <label htmlFor="manual-rrr" className="text-xs font-bold text-blue-800 uppercase mb-1 block mt-2">
                  2. Enter RRR to Verify
                </label>
                <div className="flex gap-2">
                  <input
                    id="manual-rrr"
                    type="text"
                    placeholder="e.g. 1234-5678-9012"
                    className="flex-1 h-10 px-3 rounded-md border-2 border-blue-200 focus:border-blue-500 outline-none font-mono text-lg tracking-wider"
                    value={manualRRR}
                    onChange={(e) => setManualRRR(e.target.value)}
                  />
                  <Button
                    onClick={handleVerifyManualRRR}
                    disabled={isVerifyingRRR || !manualRRR}
                    className="bg-blue-600 hover:bg-blue-700 h-10 px-6 font-bold"
                  >
                    {isVerifyingRRR ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Manual Link Fallback Input */}
            {showManualLinkInput && (
              <div className="w-full border-t border-blue-200 pt-3 mt-1 animate-in slide-in-from-top-2 fade-in">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-2 text-sm text-amber-800">
                  <p className="font-semibold flex items-center gap-2">
                    <Loader2 className="h-3 w-3" /> Automatic verification incomplete.
                  </p>
                  <p className="mt-1">
                    Please copy the <strong>Receipt Download Link</strong> from the Remita receipt page (below) and paste it here for verification.
                  </p>
                </div>
                <label htmlFor="manual-link" className="text-xs font-bold text-blue-800 uppercase mb-1 block">
                  3. Paste Receipt PDF Link (Fallback)
                </label>
                <div className="flex gap-2">
                  <input
                    id="manual-link"
                    type="tex"
                    placeholder="https://login.remita.net/remita/.../printrecieptRequest.pdf"
                    className="flex-1 h-10 px-3 rounded-md border-2 border-amber-200 focus:border-amber-500 outline-none text-sm"
                    value={manualReceiptUrl}
                    onChange={(e) => setManualReceiptUrl(e.target.value)}
                  />
                  <Button
                    onClick={handleVerifyReceiptLink}
                    disabled={isVerifyingRRR || !manualReceiptUrl}
                    className="bg-amber-600 hover:bg-amber-700 h-10 px-6 font-bold text-white"
                  >
                    Verify Link
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Remita Iframe Area */}
          <div className="flex-1 bg-gray-100 relative">
            <iframe
              src="https://login.remita.net/remita/lirs/internal/pay.reg"
              className="w-full h-full border-none"
              title="Remita Payment Portal"
            />
            <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
              <div className="bg-amber-100/90 backdrop-blur-sm border border-amber-200 p-2 rounded text-[10px] text-amber-900 shadow-sm max-w-sm">
                <strong>Tip:</strong> Search for "Lagos State Surveyor General" to generate your RRR.
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-gray-50">
            <Button variant="ghost" onClick={handleClosePayment} className="text-gray-500">
              Close & Pay Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
