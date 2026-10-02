"use client";

import { useState } from "react";
import { toast } from "sonner";
import RedCopyModal from "./RedCopyModal";
import { surfboardApi } from "@/surfboard/apiClient";

type RedCopyButtonProps = {
  plan: {
    id: string;
    planNumber: string;
    surveyTitle: string;
    deededArea: string;
    calculatedArea?: number;
    lga: string;
    geometry: any;
    pillars: any[];
    status: string;
    planType: string;
    certificateFilePath?: string | null;
  };
  variant?: "button" | "menu";
};

export default function RedCopyButton({
  plan,
  variant = "button",
}: RedCopyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if the plan is eligible for Red Copy submission
  const isEligible =
    plan.status === "PENDING" &&
    !["PROVISIONAL", "PROVISIONAL LAYOUT"].includes(plan.planType) &&
    !plan.certificateFilePath;

  const handleSubmit = async (file: File) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await surfboardApi.plans.submitRedCopy(plan.id, formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to submit Red Copy");
      }

      return { success: true };
    } catch (error) {
      console.error("Error submitting Red Copy:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEligible) return null;

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        >
          Submit Red Copy
        </button>

        <RedCopyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          plan={plan}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isEligible || isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Red Copy"}
      </button>

      <RedCopyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={plan}
        onSubmit={handleSubmit}
      />
    </>
  );
}
