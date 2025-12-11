/**
 * Certificate of Deposit Batch Selection Component
 * Allows users to select multiple plans and submit them for Certificate of Deposit
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
import { FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { submitRedCopyBatch, verifyBatchPayment } from "../actions/codActions";
import { useRouter } from "next/navigation";
import PaystackPop from "@paystack/inline-js";

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

type TransactionObject = {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
  redirecturl: string;
};

export function BatchSubmissionModal({
  isOpen,
  onClose,
  selectedPlans,
  onSuccess,
  onRemovePlan,
}: BatchSubmissionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const publicKey = useMemo(
    () => process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    []
  );

  const handleSubmit = async () => {
    let error: any = "";

    try {
      if (selectedPlans.length === 0) {
        toast.error("Please select at least one plan");
        onClose();
        return;
      }

      if (!publicKey) {
        toast.error("Server Error: Misconfigured Payment setup");
        return;
      }

      setIsSubmitting(true);

      const result = await submitRedCopyBatch(selectedPlans.map((p) => p.id));

      if (result.success && result.data) {
        const { batchCode, totalAmount, paymentUrl, reference } = result.data;

        toast.success(
          `Batch ${batchCode} created successfully! Total: ₦${totalAmount?.toLocaleString()}`
        );

        // Check if we have a payment reference
        if (!reference) {
          toast.error("Payment reference not found");
          setIsSubmitting(false);
          return;
        }

        // Get user email from the batch submission
        const userEmail = result.data.email || "";

        if (!userEmail) {
          // Fallback to redirect if email not available
          return;
        }

        // Initialize Paystack popup
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: publicKey,
          reference,
          email: userEmail,
          // Convert from NAIRA (server response) to KOBO (Paystack requires kobo: 1 naira = 100 kobo)
          amount: Math.round(totalAmount * 100), // Convert to kobo
          currency: "NGN",
          metadata: {
            custom_fields: [
              {
                display_name: "Batch ID",
                variable_name: "batch_id",
                value: result.data.batchId,
              },
              {
                display_name: "Batch Reference",
                variable_name: "reference",
                value: reference,
              },
              {
                display_name: "Batch Code",
                variable_name: "batch_code",
                value: batchCode,
              },
              {
                display_name: "Plan Count",
                variable_name: "plan_count",
                value: selectedPlans.length,
              },
              {
                display_name: "Type",
                variable_name: "type",
                value: "certificate_of_deposit",
              },
              {
                display_name: "Platform",
                variable_name: "platform",
                value: "surfboard",
              },
            ],
          },
          onLoad: () => {
            onClose();
          },
          onSuccess: async (transaction: TransactionObject) => {
            try {
              console.log("Payment successful:", transaction);
              toast.loading("Verifying payment...", { id: "verify-payment" });

              const verification = await verifyBatchPayment(reference);

              toast.dismiss("verify-payment");

              if (verification?.success) {
                toast.success("Payment verified successfully!");
                onClose();
                if (onSuccess) onSuccess();

                // Refresh the page to show updated status
                router.refresh();
              } else {
                throw new Error(verification?.error || "Verification failed");
              }
            } catch (error: any) {
              console.error("Verification error:", error);
              toast.error(error.message || "Failed to verify payment");
            } finally {
              setIsSubmitting(false);
            }
          },
          onCancel: () => {
            toast.info("Payment cancelled");
            setIsSubmitting(false);
          },
          onError: (error: { message: string }) => {
            console.error("Payment error:", error);
            toast.error(error.message || "Payment failed");
            setIsSubmitting(false);
          },
        });
      } else {
        error = result.error || "Failed to submit batch";
        toast.error(result.error || "Failed to submit batch");
        setIsSubmitting(false);

        // onClose();
        // if (onSuccess) onSuccess();
        // setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting batch:", error);
      toast.error("An error occurred while submitting the batch");
      setIsSubmitting(false);
    }
  };

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
                    Fees will be calculated based on LGA rates and plan area
                  </li>
                  <li>You will be redirected to payment after submission</li>
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
