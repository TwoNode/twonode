import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Calendar,
  Ruler,
  User,
} from "lucide-react";
import { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

interface SubmitConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  data: SurfboardPlanDTO;
  personCount: {
    manual: number;
    ai: number | null;
    isValid: boolean;
  };
  fileCounts: {
    cad: number;
    pdf: number;
    cert: number;
  };
}

export function SubmitConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  data,
  personCount,
  fileCounts,
}: SubmitConfirmationModalProps) {
  // Parsing survey title lines for display
  const titleLines = data.surveyTitle.split("\n").filter((line) => line.trim());
  const calculatedCount = titleLines.length;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="z-[400] max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">
            Confirm Plan Submission
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please review the details below before submitting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-6 py-4">
          {/* Plan Number & Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                Plan Number
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {data.planNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                Type
              </div>
              <div className="text-sm font-semibold text-blue-600">
                {data.planType}
              </div>
            </div>
          </div>

          {/* Survey Title & Person Count Validation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <User className="w-4 h-4" />
                Survey Title / Owners
              </div>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${personCount.isValid
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                  }`}
              >
                {personCount.isValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Count Verified: {calculatedCount}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Count Mismatch (AI: {personCount.ai || "?"}, Manual:{" "}
                    {personCount.manual})
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-surface border rounded-md p-3 max-h-40 overflow-y-auto shadow-sm">
              {titleLines.map((line, i) => (
                <div
                  key={i}
                  className="py-1 border-b last:border-0 border-gray-100 dark:border-white/10 flex gap-3 text-sm"
                >
                  <span className="text-gray-400 dark:text-gray-500 w-4 text-xs select-none">
                    {i + 1}.
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{line}</span>
                </div>
              ))}
            </div>
            {data.surveyTitle.includes("AND") &&
              !data.surveyTitle.includes("\n") && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Wait! Did you forget to separate multiple owners with new
                  lines?
                </p>
              )}
          </div>

          {/* Core Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Ruler className="w-3.5 h-3.5" /> Deeded Area
              </div>
              <div className="text-sm font-medium">{data.deededArea}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" /> Survey Date
              </div>
              <div className="text-sm font-medium">
                {data.dateOnSurveyPlan
                  ? new Date(data.dateOnSurveyPlan).toLocaleDateString()
                  : "-"}
              </div>
            </div>
            <div className="space-y-1 col-span-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5" /> Locality
              </div>
              <div className="text-sm font-medium truncate">
                {data.locality || "-"}
              </div>
            </div>
          </div>

          {/* Files Summary */}
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2 uppercase tracking-wide">
              Files to Upload
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center bg-white dark:bg-surface p-2 rounded border border-gray-100 dark:border-white/10">
                <span className="text-xs text-gray-500 dark:text-gray-400">CAD</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {fileCounts.cad}
                </span>
              </div>
              <div className="flex flex-col items-center bg-white dark:bg-surface p-2 rounded border border-gray-100 dark:border-white/10">
                <span className="text-xs text-gray-500 dark:text-gray-400">PDF</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {fileCounts.pdf}
                </span>
              </div>
              <div className="flex flex-col items-center bg-white dark:bg-surface p-2 rounded border border-gray-100 dark:border-white/10">
                <span className="text-xs text-gray-500 dark:text-gray-400">Cert</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {fileCounts.cert}
                </span>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Back to Edit</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirm & Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
