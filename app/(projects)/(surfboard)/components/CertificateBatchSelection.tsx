/**
 * Certificate of Deposit Batch Selection Component
 * Allows users to select multiple plans and submit them for Certificate of Deposit
 * Uses Remita RRR for payment
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Copy,
  ExternalLink,
  RefreshCcw,
  CreditCard,
  User,
  Building,
  Calendar,
  Link,
  Info,
} from "lucide-react";
import {
  submitRedCopyBatch,
  verifyBatchPaymentWithPdf,
  verifyLASGReceiptLink,
} from "../actions/codActions";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga?: string;
  status: string;
  redCopyStatus?: string;
  redCopyFileUrl?: string;
}

interface BatchSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlans: Plan[];
  onSuccess?: () => void;
  onRemovePlan?: (planId: string) => void;
}

export function BatchSubmissionModal({
  isOpen,
  onClose,
  selectedPlans,
  onSuccess,
  onRemovePlan,
}: BatchSubmissionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // State for the new flow
  const [batchData, setBatchData] = useState<{
    id: string;
    batchCode: string;
    totalAmount: number;
    planCount: number;
    submitter: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string | null;
      payerID?: number | null;
      payerIDType?: string | null;
    } | null;
  } | null>(null);

  const [manualRRR, setManualRRR] = useState("");
  const [manualEbsUrl, setManualEbsUrl] = useState("");
  const [showManualEbs, setShowManualEbs] = useState(false);
  const [isVerifyingRRR, setIsVerifyingRRR] = useState(false);
  const [showPaymentView, setShowPaymentView] = useState(false);

  const handleCopyAmount = () => {
    if (batchData?.totalAmount) {
      navigator.clipboard.writeText(batchData.totalAmount.toString());
      toast.success("Amount copied to clipboard");
    }
  };

  const handleSubmit = async () => {
    try {
      if (selectedPlans.length === 0) {
        toast.error("Please select at least one plan");
        onClose();
        return;
      }

      setIsSubmitting(true);

      const result = await submitRedCopyBatch(selectedPlans.map((p) => p.id));

      if (result.success && result.data) {
        const { batchId, batchCode, totalAmount, planCount, submitter } =
          result.data;

        setBatchData({
          id: batchId,
          batchCode,
          totalAmount,
          planCount,
          submitter,
        });

        setShowPaymentView(true);

        toast.success(
          `Batch ${batchCode} created! Please make payment via the Remita portal.`,
        );
      } else {
        toast.error(result.error || "Failed to submit batch");
      }
    } catch (error) {
      console.error("Error submitting batch:", error);
      toast.error("An error occurred while submitting the batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRRR = async () => {
    if (!manualRRR || manualRRR.length < 5) {
      toast.error("Please enter a valid Remita RRR");
      return;
    }

    if (!batchData) return;

    if (showManualEbs && !manualEbsUrl) {
      toast.error("Please enter the EBS Receipt URL");
      return;
    }

    try {
      setIsVerifyingRRR(true);

      const result = await verifyBatchPaymentWithPdf(
        batchData.id,
        manualRRR,
        showManualEbs ? manualEbsUrl : undefined,
      );

      if (result.success && result.data) {
        if (result.data.status === "LASG_PAID") {
          toast.success(
            "Payment verified! Receipt captured and plans submitted.",
          );
          setShowPaymentView(false);
          setBatchData(null);
          onClose();
          if (onSuccess) onSuccess();
          router.refresh();
        } else {
          // Should not happen for LASG_PAID
          toast.success("Payment status updated: " + result.data.status);
        }
      } else {
        toast.error(result.error || "Failed to verify RRR");
        if (
          result.error?.includes("Manual Input") ||
          result.error?.includes("extract")
        ) {
          setShowManualEbs(true); // Show fallback if PDF parsing fails
        }
      }
    } catch (error) {
      console.error("RRR Verification error:", error);
      toast.error("Failed to verify RRR");
    } finally {
      setIsVerifyingRRR(false);
    }
  };

  const handleClose = () => {
    if (
      showPaymentView &&
      !confirm(
        "You have an active batch submission. Are you sure you want to close? You will need to provide the RRR later to verify payment.",
      )
    ) {
      return;
    }
    setShowPaymentView(false);
    setBatchData(null);
    setManualRRR("");
    onClose();
  };

  // Payment & Verification View
  if (showPaymentView && batchData) {
    const today = new Date().toLocaleDateString("en-GB"); // dd/mm/yyyy

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden bg-gray-50">
          <DialogHeader className="p-6 pb-2 border-b bg-white">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Complete Payment for Batch {batchData.batchCode}
                </DialogTitle>
                <DialogDescription>
                  Generate your RRR, make payment, and verify to complete
                  submission.
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Total Amount
                </p>
                <div className="flex items-center gap-2 justify-end group">
                  <p className="text-2xl font-bold text-green-700">
                    ₦{batchData.totalAmount.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={handleCopyAmount}
                    title="Copy Amount"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel: Payer Info & Instruction */}
            <div className="w-1/3 p-6 overflow-y-auto border-r bg-white space-y-6">
              {/* Payer Info Card */}
              <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4" /> Payer Information
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Payer ID
                    </span>
                    <span className="font-mono font-medium">
                      {batchData.submitter?.payerID || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Payer ID Type
                    </span>
                    <span className="font-medium">
                      {batchData.submitter?.payerIDType || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Name</span>
                    <span className="font-medium">
                      {batchData.submitter?.firstName}{" "}
                      {batchData.submitter?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Email</span>
                    <span
                      className="font-medium truncate"
                      title={batchData.submitter?.email}
                    >
                      {batchData.submitter?.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Phone</span>
                    <span className="font-medium">
                      {batchData.submitter?.phoneNumber || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info Card */}
              <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                  <Building className="w-4 h-4" /> Payment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Agency Name
                    </span>
                    <span className="font-medium">
                      4830000 — 61004 — Office of the State Surveyor General
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Revenue Name
                    </span>
                    <span className="font-medium">
                      4020002 — 32202 — Lands Registry Transactions
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Period</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {today}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verify Payment</label>
                  <p className="text-xs text-gray-500">
                    Enter the RRR used for payment. The system will extract
                    receipt details automatically.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter RRR (e.g. 1913-9281-9355)"
                    className="w-full h-10 px-3 rounded-md border border-gray-300 focus:border-blue-500 outline-none font-mono tracking-wider"
                    value={manualRRR}
                    onChange={(e) => setManualRRR(e.target.value)}
                  />
                </div>

                {showManualEbs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2 p-3 bg-amber-50 rounded border border-amber-200"
                  >
                    <div className="flex items-start gap-2 text-amber-800">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-xs">
                        Automatic receipt extraction failed. Please check your
                        email for the Lagos EBS Receipt URL and paste it below.
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="https://printreceipt.ebs-rcm.com/..."
                      className="w-full h-10 px-3 rounded-md border border-amber-300 focus:border-amber-500 outline-none text-xs"
                      value={manualEbsUrl}
                      onChange={(e) => setManualEbsUrl(e.target.value)}
                    />
                  </motion.div>
                )}

                <Button
                  onClick={handleVerifyRRR}
                  disabled={isVerifyingRRR || !manualRRR}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold"
                >
                  {isVerifyingRRR ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying & Capturing Receipt...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify & Complete
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Panel: Remita Iframe */}
            <div className="w-2/3 bg-gray-100 relative border-l">
              <div className="absolute top-0 left-0 right-0 bg-white border-b px-4 py-2 flex items-center justify-between z-10">
                <span className="text-xs font-semibold text-gray-500">
                  REMITA PAYMENT PORTAL
                </span>
                <a
                  href="https://login.remita.net/remita/lirs/internal/pay.reg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 flex items-center hover:underline"
                >
                  Open in new tab <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
              <iframe
                src="https://login.remita.net/remita/lirs/internal/pay.reg"
                className="w-full h-full pt-8 border-none"
                title="Remita Payment Portal"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Initial Plan Selection View
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Submit Batch for Certificate of Deposit
          </DialogTitle>
          <DialogDescription>
            Review the selected plans before submitting for certificate
            processing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Total Plans Selected
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedPlans.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Plans List */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">
              Selected Plans:
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {plan.planNumber}
                    </p>
                    <p className="text-xs text-gray-600">{plan.surveyTitle}</p>
                    {plan.lga && (
                      <p className="text-xs text-gray-500 mt-1">
                        LGA: {plan.lga}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {onRemovePlan && (
                      <button
                        onClick={() => onRemovePlan(plan.id)}
                        className="p-1 hover:bg-red-50 rounded-full transition-colors group"
                        title="Remove from selection"
                      >
                        <X className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  Important Information
                </p>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                  <li>
                    Fees will be calculated based on zone rates and plan area
                  </li>
                  <li>You will receive a Remita RRR for payment</li>
                  <li>All plans must have record copy attached</li>
                  <li>Plans must be in PENDING status</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Submit Batch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BatchSelectionBarProps {
  selectedCount: number;
  onSubmit: () => void;
  onClear: () => void;
}

export function BatchSelectionBar({
  selectedCount,
  onSubmit,
  onClear,
}: BatchSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] sm:w-auto max-w-lg sm:max-w-none"
      >
        <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <Badge className="bg-blue-600 text-nowrap text-white px-3 py-1 text-sm w-full sm:w-auto flex justify-center">
              {selectedCount} selected
            </Badge>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="border-gray-300 flex-1 sm:flex-none"
            >
              Clear
            </Button>

            <Button
              size="sm"
              onClick={onSubmit}
              className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none whitespace-nowrap"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Submit for Certificate</span>
              <span className="sm:hidden">Submit Batch</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Check if a plan is eligible for Certificate of Deposit submission
 */
export function isPlanEligibleForCertificate(plan: Plan): boolean {
  return (
    plan.status === "PENDING" &&
    (plan.redCopyStatus === "NOT_SUBMITTED" || !plan.redCopyStatus) &&
    !!plan.redCopyFileUrl
  );
}

/**
 * Get eligibility message for a plan
 */
export function getPlanEligibilityMessage(plan: Plan): {
  code: string;
  message: string;
} | null {
  if (plan.status !== "PENDING") {
    return {
      code: "not_pending_plan",
      message: `Plan status must be PENDING (current: ${plan.status})`,
    };
  }
  if (!plan.redCopyFileUrl) {
    return {
      code: "no_record_copy",
      message: "Record copy must be uploaded",
    };
  }

  if (plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED") {
    return {
      code: "record_copy_submitted",
      message: `Plan already submitted (status: ${plan.redCopyStatus})`,
    };
  }
  return null;
}
