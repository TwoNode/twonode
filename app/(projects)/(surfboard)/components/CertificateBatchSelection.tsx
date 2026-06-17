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
import { FileText, Loader2, CheckCircle, AlertCircle, X, XCircle, Eye, UploadCloud } from "lucide-react";
import { RemitaPaymentModal } from "./RemitaPaymentModal";
import { submitRedCopyBatch } from "../actions/codActions";
import { getCodSubmissionSettings, getCurrentSettings } from "../actions/settingsActions";
import { useRouter } from "next/navigation";
import {
  verifyPlanRecordCopy,
  downloadPlanPdfAsBase64,
  savePlanVerificationResult,
} from "../actions/verificationActions";
import { VerificationResultModal } from "./VerificationResultModal";
import { Checkbox } from "@/components/ui/checkbox";
import {
  extractFromPDFText,
  identifyAnchor,
  reconstructTraverse,
  scoreResults,
  shoelaceArea,
} from "../utils/recordCopyVerification";
import { uploadSurfboardFileToS3, deleteSurfboardFileFromS3 } from "../actions/awsActions";
import { updatePlanRecordCopy } from "../actions/surfboardActions";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  lga?: string;
  status: string;
  redCopyStatus?: string;
  redCopyFileUrl?: string;
  pillars?: any;
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

  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingPdfPlanNumber, setViewingPdfPlanNumber] = useState<string>("");
  const [uploadingPlanId, setUploadingPlanId] = useState<string | null>(null);

  const handleVerifyPlan = async (plan: Plan) => {
    setVerificationData((prev) => ({
      ...prev,
      [plan.id]: { status: "ERROR", data: null, isLoading: true },
    }));

    try {
      // 1. Download S3 PDF as Base64 to bypass CORS
      const dlRes = await downloadPlanPdfAsBase64(plan.id);
      if (!dlRes.success || !dlRes.data) {
        throw new Error(dlRes.error || "Failed to download PDF from server.");
      }

      // 2. Load PDF.js client-side from CDNJS
      const loadPdfJS = async () => {
        if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
        return new Promise<any>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          script.onload = () => {
            const pdfjsLib = (window as any).pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            resolve(pdfjsLib);
          };
          script.onerror = () => reject(new Error("Failed to load PDF.js engine."));
          document.head.appendChild(script);
        });
      };

      const pdfjsLib = await loadPdfJS();

      // 3. Convert Base64 string to Uint8Array
      const binaryString = window.atob(dlRes.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 4. Parse PDF text & items
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;

      let allText = "";
      const allItems: string[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent({ includeMarkedContent: false });
        tc.items.forEach((it: any) => {
          if ((it.str || "").trim()) {
            allItems.push(it.str.trim());
          }
        });
        allText += tc.items.map((it: any) => it.str).join(" ") + " ";
      }

      // 5. Run verification logic
      const extraction = extractFromPDFText(allText, allItems);
      
      const settings = await getCurrentSettings();
      const rawTol = ((settings.success && settings.data?.recordCopyTolerances) || {}) as any;
      const tolerances = {
        tolAnchor: Number(rawTol.tolAnchor ?? 0.05),
        tolWCB: Number(rawTol.tolWCB ?? 0.05),
        tolDist: Number(rawTol.tolDist ?? 0.05),
        tolArea: Number(rawTol.tolArea ?? 0.01),
        tolPass: Number(rawTol.tolPass ?? 95),
        tolWarn: Number(rawTol.tolWarn ?? 80),
      };

      // Map plan.pillars to include id
      const csvVertices = (Array.isArray(plan.pillars) ? plan.pillars : []).map((v: any) => ({
        ...v,
        id: v.id || v.pillarNumber || v.pillar || v.point || v.no || "",
      }));

      if (csvVertices.length === 0) {
        throw new Error("No CSV coordinates (pillars) found for this plan.");
      }

      // Group vertices by polygonIndex
      const groups: Record<number, any[]> = {};
      for (const v of csvVertices) {
        if (!v || typeof v !== 'object') continue;
        const idx = (v as any).polygonIndex ?? 0;
        if (!groups[idx]) groups[idx] = [];
        groups[idx].push(v);
      }

      const parcels = Object.values(groups);
      const parcelResults = [];

      let overallSum = 0;
      let allHasError = false;
      let allHasAreaFail = false;

      const usedRefCoords = new Set<string>();

      for (let i = 0; i < parcels.length; i++) {
        const vertices = parcels[i];
        
        // Filter out ref coordinates already used by another parcel
        const availableCoords = extraction.refCoords.filter(
          r => !usedRefCoords.has(`${r.easting}|${r.northing}`)
        );

        const anchor = identifyAnchor(
          availableCoords.length > 0 ? availableCoords : extraction.refCoords,
          vertices,
          tolerances.tolAnchor
        );
        
        if (!anchor) {
          parcelResults.push({
            parcelIndex: i + 1,
            status: "NOT_VERIFIED",
            error: "Could not identify an Anchor coordinate within tolerance.",
          });
          allHasError = true;
          continue;
        }

        // Mark this anchor's ref coordinate as used
        usedRefCoords.add(`${anchor.ref.easting}|${anchor.ref.northing}`);

        const traverse = reconstructTraverse(
          anchor,
          extraction.bearings,
          extraction.distances,
          vertices,
          tolerances.tolWCB,
          tolerances.tolDist
        );

        // Area validation
        const csvArea = shoelaceArea(vertices);
        let matchedPdfArea = null;
        if (extraction.pdfAreas.length > 0) {
          matchedPdfArea = extraction.pdfAreas.reduce((best: any, a: any) =>
            Math.abs(a.sqm - csvArea) < Math.abs(best.sqm - csvArea) ? a : best
          );
        }
        const pdfAreaSqm = matchedPdfArea ? matchedPdfArea.sqm : null;
        const areaDiff = pdfAreaSqm != null ? Math.abs(csvArea - pdfAreaSqm) : null;
        const areaMatch = areaDiff != null && areaDiff <= tolerances.tolArea;

        const score = scoreResults(traverse, tolerances, areaMatch, pdfAreaSqm);
        
        if (score.hasLegErrors) allHasError = true;
        if (score.hasAreaFail) allHasAreaFail = true;
        
        overallSum += score.overall;

        parcelResults.push({
          parcelIndex: i + 1,
          anchor: anchor,
          traverse: traverse,
          score: score,
          status: score.status,
          csvArea,
          pdfArea: pdfAreaSqm,
          areaDiff,
          areaMatch,
        });
      }

      const finalOverall = parcels.length > 0 ? overallSum / parcels.length : 0;
      let finalStatus: "VERIFIED" | "REVIEW" | "NOT_VERIFIED" = "NOT_VERIFIED";
      
      if (allHasError || allHasAreaFail) {
        finalStatus = "NOT_VERIFIED";
      } else if (finalOverall >= tolerances.tolPass) {
        finalStatus = "VERIFIED";
      } else if (finalOverall >= tolerances.tolWarn) {
        finalStatus = "REVIEW";
      }

      const verificationDataPayload = {
        overallVerdict: finalStatus,
        overallScore: finalOverall,
        extraction: {
          bearingsCount: extraction.bearings.length,
          distancesCount: extraction.distances.length,
          refCoordsCount: extraction.refCoords.length,
          pdfAreas: extraction.pdfAreas,
        },
        parcelResults: parcelResults,
      };

      // 6. Save verification results to DB
      const saveRes = await savePlanVerificationResult(
        plan.id,
        finalStatus,
        finalOverall,
        verificationDataPayload
      );

      if (!saveRes.success) {
        throw new Error(saveRes.error || "Failed to save verification result to database.");
      }

      setVerificationData((prev) => ({
        ...prev,
        [plan.id]: {
          status: finalStatus,
          data: verificationDataPayload,
          isLoading: false,
        },
      }));
      toast.success(`Verification complete for ${plan.planNumber}: ${finalStatus}`);
    } catch (err: any) {
      setVerificationData((prev) => ({
        ...prev,
        [plan.id]: {
          status: "ERROR",
          data: { overallVerdict: "ERROR", error: err.message },
          isLoading: false,
        },
      }));
      toast.error(`Verification failed for ${plan.planNumber}: ${err.message}`);
    }
  };

  const handleReuploadPdf = async (planId: string, file: File) => {
    try {
      setUploadingPlanId(planId);
      toast.loading("Uploading new record copy...", { id: "reupload" });

      const plan = selectedPlans.find((p) => p.id === planId);
      if (!plan) throw new Error("Plan not found");

      // Delete the old file from S3 if it existed to save space
      if (plan.redCopyFileUrl) {
        try {
          await deleteSurfboardFileFromS3({ url: plan.redCopyFileUrl });
        } catch (e) {
          console.error("Failed to delete old file:", e);
        }
      }

      // Upload new file to S3
      const result = await uploadSurfboardFileToS3(file, "redcopy", plan.planNumber);
      if (!result || !result.url) {
        throw new Error("Upload to S3 failed");
      }

      // Update DB
      const updateRes = await updatePlanRecordCopy(planId, result.url);
      if (!updateRes.success) {
        throw new Error(updateRes.error || "Failed to update plan record copy in database");
      }

      // Update the plan object inside selectedPlans locally so that next verification runs on the new URL
      plan.redCopyFileUrl = result.url;

      // Clear old verification status so they can click "Verify" again
      setVerificationData((prev) => {
        const copy = { ...prev };
        delete copy[planId];
        return copy;
      });

      toast.success("New record copy uploaded successfully!", { id: "reupload" });
      
      // Automatically run verification on the new upload!
      await handleVerifyPlan(plan);
    } catch (error: any) {
      console.error("Reupload error:", error);
      toast.error(`Reupload failed: ${error.message || "Unknown error"}`, { id: "reupload" });
    } finally {
      setUploadingPlanId(null);
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        {plan.planNumber}
                      </p>
                      {plan.redCopyFileUrl && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                          <button
                            onClick={() => {
                              setViewingPdfUrl(plan.redCopyFileUrl || null);
                              setViewingPdfPlanNumber(plan.planNumber);
                            }}
                            className="flex items-center gap-1 hover:text-blue-800 transition-colors cursor-pointer"
                            title="View PDF record copy in popup"
                          >
                            <Eye className="w-3.5 h-3.5" /> View PDF
                          </button>
                          <span className="text-gray-300">|</span>
                          <input
                            type="file"
                            id={`reupload-${plan.id}`}
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleReuploadPdf(plan.id, file);
                              }
                            }}
                            disabled={uploadingPlanId === plan.id}
                          />
                          <button
                            onClick={() => document.getElementById(`reupload-${plan.id}`)?.click()}
                            className="flex items-center gap-1 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                            title="Upload new record copy"
                            disabled={uploadingPlanId === plan.id}
                          >
                            {uploadingPlanId === plan.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UploadCloud className="w-3.5 h-3.5" />
                            )}
                            Change PDF
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{plan.surveyTitle}</p>
                    {plan.lga && (
                      <p className="text-xs text-gray-500 mt-1">
                        LGA: {plan.lga}
                      </p>
                    )}
                  </div>
                  
                  {/* Verification Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {verificationData[plan.id] ? (
                      verificationData[plan.id].isLoading ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border">
                          <Loader2 className="w-3 h-3 animate-spin text-gray-500" /> Verifying
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-xs ${
                              verificationData[plan.id].status === "VERIFIED"
                                ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
                                : verificationData[plan.id].status === "REVIEW"
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200"
                                : "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
                            }`}
                          >
                            {verificationData[plan.id].status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-600 p-1 font-semibold hover:bg-blue-50"
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
                        className="h-7 text-xs font-semibold hover:bg-blue-50"
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

      <Dialog open={!!viewingPdfUrl} onOpenChange={() => setViewingPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-4">
          <DialogHeader className="pb-2">
            <DialogTitle>View Record Copy - {viewingPdfPlanNumber}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full border rounded overflow-hidden bg-gray-100">
            {viewingPdfUrl && (
              <iframe
                src={viewingPdfUrl}
                className="w-full h-full"
                title={`Record Copy PDF ${viewingPdfPlanNumber}`}
              />
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={() => setViewingPdfUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
