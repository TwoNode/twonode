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
} from "lucide-react";
import { submitRedCopyBatch, verifyBatchPayment } from "../actions/codActions";
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

  // RRR state - when set, shows RRR display instead of plan list
  const [rrrData, setRrrData] = useState<{
    rrr: string;
    batchCode: string;
    totalAmount: number;
    paymentUrl?: string;
  } | null>(null);

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
        const { batchCode, totalAmount, rrr, paymentUrl } = result.data;

        if (rrr) {
          // Show RRR display
          setRrrData({
            rrr,
            batchCode,
            totalAmount,
            paymentUrl,
          });

          toast.success(
            `Batch ${batchCode} created! Use the RRR below to make payment.`
          );
        } else {
          toast.error("Failed to generate payment reference (RRR)");
        }
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

  const handleCopyRRR = () => {
    if (rrrData?.rrr) {
      navigator.clipboard.writeText(rrrData.rrr);
      toast.success("RRR copied to clipboard!");
    }
  };

  const handleCheckPayment = async () => {
    if (!rrrData?.rrr) return;

    try {
      setIsVerifying(true);
      const result = await verifyBatchPayment(rrrData.rrr);

      if (result.success && result.data) {
        if (result.data.status === "USER_PAID") {
          toast.success("Payment verified successfully!");
          setRrrData(null);
          onClose();
          if (onSuccess) onSuccess();
          router.refresh();
        } else if (result.data.status === "PENDING") {
          toast.info(
            "Payment is still pending. Please complete your payment using the RRR."
          );
        } else {
          toast.warning(`Payment status: ${result.data.status}`);
        }
      } else {
        toast.error(result.error || "Failed to verify payment");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      toast.error("Failed to check payment status");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setRrrData(null);
    onClose();
    if (rrrData) {
      // If we had RRR data, refresh to show updated batch
      if (onSuccess) onSuccess();
    }
  };

  // RRR Display View
  if (rrrData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Batch Submitted Successfully!
            </DialogTitle>
            <DialogDescription>
              Use the Remita Retrieval Reference (RRR) below to complete your
              payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* RRR Display */}
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Your RRR Number</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold text-blue-700 tracking-wider font-mono">
                  {rrrData.rrr}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRRR}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Batch Code:</span>
                <span className="font-medium">{rrrData.batchCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount to Pay:</span>
                <span className="font-bold text-lg text-green-700">
                  ₦{rrrData.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900">
                    How to Pay
                  </p>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                    <li>Visit any bank branch and quote the RRR above</li>
                    <li>Pay via internet/mobile banking using Remita</li>
                    <li>Use Remita payment points or agents</li>
                    <li>Click the payment link below to pay online</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {rrrData.paymentUrl && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => window.open(rrrData.paymentUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Pay Online via Remita
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCheckPayment}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Payment...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    I've Paid - Check Status
                  </>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>
              Close
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
