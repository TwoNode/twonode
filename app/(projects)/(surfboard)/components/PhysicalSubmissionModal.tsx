"use client";

import { useState } from "react";
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
import { Loader2, FileText, CheckCircle2, Circle } from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

export interface PhysicalSubmissionPlan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  status: string;
  redCopyStatus: string;
  physicalCopySubmitted: boolean;
  accountsStatus: string | null;
  chartingStatus: string | null;
  recordsIStatus: string | null;
  surconStatus: string | null;
}

interface PhysicalSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchCode: string;
  plans: PhysicalSubmissionPlan[];
  onSuccess: () => void;
}

export function PhysicalSubmissionModal({
  isOpen,
  onClose,
  batchCode,
  plans,
  onSuccess,
}: PhysicalSubmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEligible = (p: PhysicalSubmissionPlan) =>
    p.accountsStatus === "APPROVED" &&
    p.chartingStatus === "APPROVED" &&
    p.recordsIStatus === "APPROVED" &&
    p.surconStatus === "APPROVED";

  // We auto-select all eligible plans by default.
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    new Set(
      plans
        .filter(
          (p) =>
            p.redCopyStatus === "SUBMITTED" &&
            !p.physicalCopySubmitted &&
            isEligible(p)
        )
        .map((p) => p.id)
    )
  );

  const handleTogglePlan = (planId: string) => {
    setSelectedPlanIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (selectedPlanIds.size === 0) {
      toast.error("Please select at least one plan to submit");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await surfboardApi.plans.submitPhysicalCopies(
        Array.from(selectedPlanIds)
      );
      if (result.success) {
        toast.success(
          `Successfully submitted physical copies for ${result.data?.count} record(s)`
        );
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Failed to submit physical copies");
      }
    } catch (error) {
      console.error("Error submitting physical copies:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Physical Copies - {batchCode}</DialogTitle>
          <DialogDescription>
            Select the records that you have physically submitted to the MDA.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {plans.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              No records found in this batch.
            </p>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => {
                const isAlreadySubmitted = plan.physicalCopySubmitted;
                const isQueried = plan.redCopyStatus === "QUERIED";
                const eligible = isEligible(plan);
                const isAvailable =
                  plan.redCopyStatus === "SUBMITTED" &&
                  !isAlreadySubmitted &&
                  eligible;
                const isSelected = selectedPlanIds.has(plan.id);

                return (
                  <div
                    key={plan.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                      isAlreadySubmitted
                        ? "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-70"
                        : isQueried
                          ? "bg-red-50/50 border-red-100 opacity-60"
                          : !eligible
                            ? "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "border-blue-500 bg-blue-50 cursor-pointer"
                              : "border-gray-200 dark:border-white/10 hover:border-blue-300 cursor-pointer"
                    }`}
                    onClick={() => {
                      if (isAvailable) {
                        handleTogglePlan(plan.id);
                      }
                    }}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isAlreadySubmitted ? (
                        <CheckCircle2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      ) : isQueried || !eligible ? (
                        <Circle className="w-5 h-5 text-gray-300" />
                      ) : isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {plan.planNumber}
                        </span>
                        {isAlreadySubmitted && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-100 dark:bg-white/10"
                          >
                            Already Submitted
                          </Badge>
                        )}
                        {isQueried && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-100 text-red-700"
                          >
                            Queried
                          </Badge>
                        )}
                        {!eligible && !isAlreadySubmitted && !isQueried && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                          >
                            Awaiting Approvals
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {plan.surveyTitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {selectedPlanIds.size} out of {plans.length} records selected to be
            submitted
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedPlanIds.size === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm Submission"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
