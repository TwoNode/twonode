"use client";

import { MediaLink } from "@/components/media";
import { planFileDisplayName } from "@/surfboard/utils/planFileName";

import { useState } from "react";
import { motion } from "framer-motion";
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
import { Upload, CheckCircle, AlertCircle, X, Eye } from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  redCopyFileUrl?: string;
  pdfFilePaths?: string[];
}

interface RecordCopyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlans: Plan[];
  onUploadComplete: () => void;
  onRemovePlan?: (planId: string) => void;
}

export function RecordCopyUploadModal({
  isOpen,
  onClose,
  selectedPlans,
  onUploadComplete,
  onRemovePlan,
}: RecordCopyUploadModalProps) {
  const [uploadStatus, setUploadStatus] = useState<
    Record<string, { uploading: boolean; url?: string; error?: string }>
  >({});
  const [files, setFiles] = useState<Record<string, File>>({});

  const handleFileSelect = (planId: string, file: File | null) => {
    if (file) {
      setFiles((prev) => ({ ...prev, [planId]: file }));
      setUploadStatus((prev) => ({
        ...prev,
        [planId]: { uploading: false },
      }));
    } else {
      const newFiles = { ...files };
      delete newFiles[planId];
      setFiles(newFiles);
    }
  };

  const handleUpload = async (planId: string, file: File) => {
    let uploadedUrl: string | undefined;
    let uploadedKey: string | undefined;

    if (selectedPlans.length === 0) {
      toast.error("Please select at least one plan");
      onClose();
      return;
    }

    try {
      setUploadStatus((prev) => ({
        ...prev,
        [planId]: { uploading: true },
      }));

      // Find the plan to get its plan number
      const plan = selectedPlans.find((p) => p.id === planId);
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Upload to AWS S3 using the existing function
      const result = await surfboardApi.files.uploadSurfboardFile(
        file,
        "redcopy",
        plan.planNumber
      );

      if (result && result.url) {
        uploadedUrl = result.url;
        uploadedKey = result.key;

        // Update plan with record copy URL using server action
        const updateResult = await surfboardApi.plans.updateRecordCopy(
          planId,
          result.url
        );

        if (updateResult.success) {
          setUploadStatus((prev) => ({
            ...prev,
            [planId]: { uploading: false, url: result.url },
          }));
          toast.success(`Record copy uploaded for ${plan.planNumber}`);
        } else {
          // Database update failed - clean up the uploaded file
          if (uploadedUrl) {
            try {
              await surfboardApi.files.deleteSurfboardFile({
                url: uploadedUrl,
              });
              console.log("Cleaned up uploaded file after DB update failure");
            } catch (cleanupError) {
              console.error("Failed to clean up uploaded file:", cleanupError);
            }
          }
          throw new Error(updateResult.error || "Failed to update plan");
        }
      } else {
        throw new Error("Upload failed - no URL returned");
      }
    } catch (error) {
      console.error("Upload error:", error);

      // Clean up S3 file if it was uploaded but something failed
      if (uploadedUrl) {
        try {
          await surfboardApi.files.deleteSurfboardFile({ url: uploadedUrl });
          console.log("Cleaned up uploaded file after error");
        } catch (cleanupError) {
          console.error("Failed to clean up uploaded file:", cleanupError);
        }
      }

      setUploadStatus((prev) => ({
        ...prev,
        [planId]: {
          uploading: false,
          error: error instanceof Error ? error.message : "Upload failed",
        },
      }));
      toast.error(
        `Failed to upload record copy: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleUploadAll = async () => {
    // Check if all files are selected
    if (selectedPlans.length == 0) {
      toast.error("Please select at least one plan");
      return;
    }

    // Only upload files that haven't been uploaded yet
    const uploadPromises = Object.entries(files)
      .filter(([planId, file]) => {
        const plan = selectedPlans.find((p) => p.id === planId);
        const hasExistingFile = plan?.redCopyFileUrl;
        const hasUploadedFile = uploadStatus[planId]?.url;
        // Skip if already has a file uploaded or already uploaded
        return !hasExistingFile && !hasUploadedFile;
      })
      .map(([planId, file]) => handleUpload(planId, file));

    await Promise.all(uploadPromises);

    // Check if all uploads were successful
    const allSuccess = Object.values(uploadStatus).every(
      (status) => status.url && !status.error
    );

    if (allSuccess) {
      toast.success("All record copies uploaded successfully!");
      toast.success("Proceed to submit the batch");
      onUploadComplete();
      onClose();
    }
  };

  const allPlansHaveFiles = selectedPlans.every(
    (plan) =>
      files[plan.id] || plan.redCopyFileUrl || uploadStatus[plan.id]?.url
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload Record Copies
          </DialogTitle>
          <DialogDescription>
            Upload a record copy (PDF or image) for each selected plan before
            submitting the batch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Upload Progress
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    selectedPlans.filter(
                      (p) =>
                        p.redCopyFileUrl ||
                        uploadStatus[p.id]?.url ||
                        files[p.id]
                    ).length
                  }{" "}
                  / {selectedPlans.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Plans List with Upload */}
          <div className="space-y-3">
            {selectedPlans.map((plan) => {
              const status = uploadStatus[plan.id];
              const file = files[plan.id];
              const hasExistingFile = plan.redCopyFileUrl;
              const hasUploadedFile = status?.url;

              return (
                <div
                  key={plan.id}
                  className="border border-gray-200 dark:border-white/10 rounded-lg p-4 space-y-3"
                >
                  {/* Plan Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {plan.planNumber}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {plan.surveyTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(hasExistingFile || hasUploadedFile) && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {onRemovePlan && (
                        <button
                          onClick={() => onRemovePlan(plan.id)}
                          className="p-1 hover:bg-red-50 rounded-full transition-colors group"
                          title="Remove from selection"
                        >
                          <X className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Section */}
                  {hasExistingFile || hasUploadedFile ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 p-2.5 rounded">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                        <span>Record copy attached</span>
                      </div>
                      <MediaLink
                        href={surfboardApi.files.getViewUrl(
                          hasExistingFile || hasUploadedFile!
                        )}
                        name={planFileDisplayName({
                          planNumber: plan.planNumber,
                          filePath: (hasExistingFile || hasUploadedFile)!,
                        })}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View PDF
                      </MediaLink>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) =>
                            handleFileSelect(
                              plan.id,
                              e.target.files?.[0] || null
                            )
                          }
                          className="flex-1 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          disabled={status?.uploading}
                        />
                        {file && !status?.uploading && (
                          <Button
                            size="sm"
                            onClick={() => handleUpload(plan.id, file)}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Upload
                          </Button>
                        )}
                      </div>

                      {status?.uploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700" />
                          <span>Processing...</span>
                        </div>
                      )}

                      {status?.error && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                          <AlertCircle className="w-4 h-4" />
                          <span>{status.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
                  <li>All plans must have a record copy before submission</li>
                  <li>Accepted formats: PDF, JPG, PNG</li>
                  <li>Maximum file size: 10MB per file</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUploadAll}
            disabled={!allPlansHaveFiles || Object.keys(files).length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload All & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
