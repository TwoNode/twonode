/**
 * Certificate of Deposit Batch Selection Component
 * Allows users to select multiple plans and submit them for Certificate of Deposit
 * Uses Remita RRR for payment
 */

import { useState, useEffect } from "react";
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
import { FileText, Loader2, CheckCircle, AlertCircle, X, XCircle } from "lucide-react";
import { RemitaPaymentModal } from "./RemitaPaymentModal";
import { submitRedCopyBatch } from "../actions/codActions";
import { getCodSubmissionSettings } from "../actions/settingsActions";
import { useRouter } from "next/navigation";
import { verifyPlanRecordCopy } from "../actions/verificationActions";
import { VerificationResultModal } from "./VerificationResultModal";
import { Checkbox } from "@/components/ui/checkbox";

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

  const [showPaymentView, setShowPaymentView] = useState(false);

  // New states for CoD policy
  const [acceptanceText, setAcceptanceText] = useState("Loading policy...");
  const [policyContent, setPolicyContent] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getCodSubmissionSettings().then((settings) => {
        setAcceptanceText(settings.codAcceptanceText);
        setPolicyContent(settings.codPolicyContent);
      });
      setIsAccepted(false);
      setVerificationData({});
    }
  }, [isOpen]);

  const [verificationData, setVerificationData] = useState<
    Record<
      string,
      {
        status: "VERIFIED" | "REVIEW" | "NOT_VERIFIED" | "ERROR";
        data: any;
        isLoading: boolean;
      }
    >
  >({});

  const [activeVerificationModal, setActiveVerificationModal] = useState<{
    isOpen: boolean;
    data: any;
    planNumber: string;
  }>({ isOpen: false, data: null, planNumber: "" });

  const handleVerifyPlan = async (plan: Plan) => {
    setVerificationData((prev) => ({
      ...prev,
      [plan.id]: { status: "ERROR", data: null, isLoading: true },
    }));

    const result = await verifyPlanRecordCopy(plan.id);
    if (result.success && result.data) {
      setVerificationData((prev) => ({
        ...prev,
        [plan.id]: {
          status: result.data.overallVerdict,
          data: result.data,
          isLoading: false,
        },
      }));
    } else {
      setVerificationData((prev) => ({
        ...prev,
        [plan.id]: {
          status: "ERROR",
          data: { overallVerdict: "ERROR", error: result.error },
          isLoading: false,
        },
      }));
      toast.error(`Verification failed for ${plan.planNumber}: ${result.error}`);
    }
  };

  const verifyAll = async () => {
    for (const plan of selectedPlans) {
      if (!verificationData[plan.id] || verificationData[plan.id].status === "ERROR") {
        await handleVerifyPlan(plan);
      }
    }
  };

  const allVerifiedOrReviewed = selectedPlans.every((plan) => {
    const vd = verificationData[plan.id];
    return vd && (vd.status === "VERIFIED" || vd.status === "REVIEW");
  });

  const hasFailingPlan = selectedPlans.some((plan) => {
    const vd = verificationData[plan.id];
    return vd && (vd.status === "NOT_VERIFIED" || vd.status === "ERROR");
  });

  const isVerifyingAny = selectedPlans.some((plan) => {
    return verificationData[plan.id]?.isLoading;
  });

  const handleSubmit = async () => {
    try {
      if (selectedPlans.length === 0) {
        toast.error("Please select at least one plan");
        onClose();
        return;
      }

      if (!isAccepted) {
        toast.error("You must accept the submission policy before proceeding.");
        return;
      }

      setIsSubmitting(true);

      const result = await submitRedCopyBatch(
        selectedPlans.map((p) => p.id),
        isAccepted
      );

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

  const handleClose = () => {
    setShowPaymentView(false);
    setBatchData(null);
    onClose();
  };

  // Payment & Verification View
  if (showPaymentView && batchData) {
    return (
      <RemitaPaymentModal
        isOpen={isOpen}
        onClose={handleClose}
        batchData={batchData}
        onSuccess={() => {
          if (onSuccess) onSuccess();
        }}
      />
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 gap-3"
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
                  
                  {/* Verification Status */}
                  <div className="flex items-center gap-2">
                    {verificationData[plan.id] ? (
                      verificationData[plan.id].isLoading ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" /> Verifying
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-xs ${
                              verificationData[plan.id].status === "VERIFIED"
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : verificationData[plan.id].status === "REVIEW"
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : "bg-red-100 text-red-800 hover:bg-red-100"
                            }`}
                          >
                            {verificationData[plan.id].status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-600 p-1"
                            onClick={() =>
                              setActiveVerificationModal({
                                isOpen: true,
                                data: verificationData[plan.id].data,
                                planNumber: plan.planNumber,
                              })
                            }
                          >
                            Results
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleVerifyPlan(plan)}
                      >
                        Verify Record Copy
                      </Button>
                    )}

                    <div className="h-4 w-px bg-gray-300 mx-1"></div>

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

          {hasFailingPlan && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex gap-2">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-900">
                    Verification Failed
                  </p>
                  <p className="text-xs text-red-800">
                    One or more plans failed verification. You must remove these plans from your batch to proceed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {allVerifiedOrReviewed ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="policy-acceptance"
                  checked={isAccepted}
                  onCheckedChange={(checked) => setIsAccepted(!!checked)}
                  className="mt-1"
                  disabled={hasFailingPlan}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="policy-acceptance"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {acceptanceText}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPolicyModal(true)}
                    className="text-xs text-blue-600 hover:underline text-left mt-1"
                  >
                    View full policy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 flex justify-between items-center">
              <p className="text-sm text-blue-800">
                You must verify all record copies before submitting.
              </p>
              <Button onClick={verifyAll} disabled={isVerifyingAny} size="sm">
                {isVerifyingAny ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify All"
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting || isVerifyingAny}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isAccepted || !allVerifiedOrReviewed || hasFailingPlan}>
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

      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Policy</DialogTitle>
          </DialogHeader>
          <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap">
            {policyContent}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPolicyModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VerificationResultModal
        isOpen={activeVerificationModal.isOpen}
        onClose={() =>
          setActiveVerificationModal({ isOpen: false, data: null, planNumber: "" })
        }
        resultData={activeVerificationModal.data}
        planNumber={activeVerificationModal.planNumber}
      />
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
