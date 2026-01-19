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
} from "lucide-react";
import { submitRedCopyBatch, verifyBatchPayment, payWithRemitaRRR } from "../actions/codActions";
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
  } | null>(null);

  const [manualRRR, setManualRRR] = useState("");
  const [isVerifyingRRR, setIsVerifyingRRR] = useState(false);
  const [showPaymentView, setShowPaymentView] = useState(false);

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
        const { batchId, batchCode, totalAmount } = result.data;

        setBatchData({
          id: batchId,
          batchCode,
          totalAmount,
        });

        setShowPaymentView(true);

        toast.success(
          `Batch ${batchCode} created! Please make payment via the Remita portal below.`
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

    try {
      setIsVerifyingRRR(true);
      const result = await payWithRemitaRRR(batchData.id, manualRRR);

      if (result.success && result.data) {
        if (result.data.status === "LASG_PAID") {
          toast.success("Payment verified! Your plans are now with MDA for review.");
          setShowPaymentView(false);
          setBatchData(null);
          onClose();
          if (onSuccess) onSuccess();
          router.refresh();
        } else if (result.data.status === "PENDING") {
          toast.info(
            "Payment is still pending on Remita. Please ensure you have completed the payment."
          );
        }
      } else {
        toast.error(result.error || "Failed to verify RRR");
      }
    } catch (error) {
      console.error("RRR Verification error:", error);
      toast.error("Failed to verify RRR");
    } finally {
      setIsVerifyingRRR(false);
    }
  };

  const handleClose = () => {
    if (showPaymentView && !confirm("You have an active batch submission. Are you sure you want to close? You will need to provide the RRR later to verify payment.")) {
      return;
    }
    setShowPaymentView(false);
    setBatchData(null);
    setManualRRR("");
    onClose();
  };

  // Payment & Verification View
  if (showPaymentView && batchData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Complete Payment for Batch {batchData.batchCode}
                </DialogTitle>
                <DialogDescription>
                  Generate your RRR in the window below, pay, then paste the RRR to verify.
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Amount</p>
                <p className="text-2xl font-bold text-green-700">₦{batchData.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </DialogHeader>

          {/* Verification Bar - "On top of iframe" */}
          <div className="bg-blue-50 p-4 border-b flex flex-col sm:flex-row items-center gap-4 z-10 shadow-sm">
            <div className="flex-1 w-full">
              <label htmlFor="manual-rrr" className="text-xs font-bold text-blue-800 uppercase mb-1 block">
                Enter your generated RRR here to verify payment
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
                  onClick={handleVerifyRRR}
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
                      Verify & Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Remita Iframe Area */}
          <div className="flex-1 bg-gray-100 relative p-4">
            <iframe
              src="https://login.remita.net/remita/lirs/internal/pay.reg"
              className="w-full h-full border-none"
              title="Remita Payment Portal"
            />
            <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
              <div className="bg-amber-100/90 backdrop-blur-sm border border-amber-200 p-2 rounded text-[10px] text-amber-900 shadow-sm max-w-sm">
                <strong>Tip:</strong> Search for "Lagos State Surveyor General" or use the relevant service type to generate your RRR.
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-gray-50">
            <Button variant="ghost" onClick={handleClose} className="text-gray-500">
              Close & Pay Later
            </Button>
          </DialogFooter>
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
