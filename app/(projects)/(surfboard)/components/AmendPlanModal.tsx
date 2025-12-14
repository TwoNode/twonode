"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, Edit3 } from "lucide-react";
import { resubmitQueriedPlan } from "../actions/codActions";
import { uploadSurfboardFileToS3 } from "../actions/awsActions";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  pillars: any;
  redCopyFileUrl: string | null;
}

interface AmendPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  onSuccess: () => void;
}

export function AmendPlanModal({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: AmendPlanModalProps) {
  const [pillarsJson, setPillarsJson] = useState<string>(
    JSON.stringify(plan.pillars, null, 2)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePillarsChange = (value: string) => {
    setPillarsJson(value);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const validatePillarsJson = (): boolean => {
    try {
      JSON.parse(pillarsJson);
      return true;
    } catch {
      toast.error("Invalid pillars JSON format");
      return false;
    }
  };

  const handleSubmit = async () => {
    // Validate pillars JSON if changed
    const pillarsChanged =
      pillarsJson !== JSON.stringify(plan.pillars, null, 2);
    if (pillarsChanged && !validatePillarsJson()) {
      return;
    }

    // Check if anything was changed
    if (!pillarsChanged && !selectedFile) {
      toast.error("Please make at least one change before resubmitting");
      return;
    }

    try {
      setSubmitting(true);

      let recordCopyUrl: string | undefined;

      // Upload new record copy if selected
      if (selectedFile) {
        setUploading(true);
        const uploadResult = await uploadSurfboardFileToS3(
          selectedFile,
          "redcopy",
          plan.planNumber
        );

        if (!uploadResult || !uploadResult.url) {
          throw new Error("Failed to upload record copy");
        }

        recordCopyUrl = uploadResult.url;
        setUploading(false);
      }

      // Parse and submit amendments
      const pillarsData = pillarsChanged ? JSON.parse(pillarsJson) : undefined;

      const result = await resubmitQueriedPlan(
        plan.id,
        pillarsData,
        recordCopyUrl
      );

      if (result.success) {
        toast.success(
          `Plan ${plan.planNumber} has been resubmitted for review`
        );
        onSuccess();
      } else {
        toast.error(result.error || "Failed to resubmit plan");
      }
    } catch (error) {
      console.error("Error resubmitting plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to resubmit plan"
      );
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-600" />
            Amend Plan - {plan.planNumber}
          </DialogTitle>
          <DialogDescription>
            Make corrections to the pillars and/or upload a new record copy,
            then resubmit for review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pillars Section */}
          <div className="space-y-3">
            <Label htmlFor="pillars" className="text-base font-semibold">
              Pillars (JSON Format)
            </Label>
            <p className="text-sm text-gray-600">
              Edit the pillar coordinates below. The data must be valid JSON.
            </p>
            <Textarea
              id="pillars"
              value={pillarsJson}
              onChange={(e) => handlePillarsChange(e.target.value)}
              className="font-mono text-sm min-h-[300px]"
              placeholder="Enter pillars JSON..."
            />
          </div>

          {/* Record Copy Section */}
          <div className="space-y-3">
            <Label htmlFor="record-copy" className="text-base font-semibold">
              Record Copy
            </Label>
            {plan.redCopyFileUrl && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">Current file:</p>
                <a
                  href={plan.redCopyFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  View current record copy
                </a>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Upload a new record copy (PDF or image) to replace the existing
                one
              </p>
              <div className="flex items-center gap-3">
                <input
                  id="record-copy"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50"
                />
                {selectedFile && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900 mb-2">
              What happens after resubmission?
            </p>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>
                Your plan will be sent back for re-review by the MDA role that
                queried it
              </li>
              <li>You'll receive a notification once it's reviewed</li>
              <li>Other approved roles (if any) will remain approved</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploading ? "Uploading..." : "Resubmitting..."}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Resubmit Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
