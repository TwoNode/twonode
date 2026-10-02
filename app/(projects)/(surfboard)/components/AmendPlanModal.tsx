"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  Loader2,
  Edit3,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  MapPin,
  CreditCard,
  User,
  Building,
  Calendar,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { parseCSVContent } from "../utils/surfboardUtils";
import type { PillarData } from "../types/surfboardTypes";
import MaplibreMap from "./maps/MaplibreMap";

interface Plan {
  id: string;
  planNumber: string;
  surveyTitle: string;
  pillars: any;
  redCopyFileUrl: string | null;
  lga: string | null;
  lcda: string | null;
  ward: string | null;
  state: string | null;
  codFee?: number | null;
}

interface AmendPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  onSuccess: () => void;
}

// Convert various pillar formats to consistent array
function normalizePillars(pillars: any): PillarData[] {
  if (!pillars) return [];
  try {
    const arr = Array.isArray(pillars) ? pillars : JSON.parse(pillars);
    return arr.map((p: any, idx: number) => ({
      pillarNumber: p.pillarNumber || p.name || `P${idx + 1}`,
      easting: Number(p.easting ?? p.lng ?? 0),
      northing: Number(p.northing ?? p.lat ?? 0),
      pointIndex: p.pointIndex ?? idx,
    }));
  } catch {
    return [];
  }
}

export function AmendPlanModal({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: AmendPlanModalProps) {
  const [pillars, setPillars] = useState<PillarData[]>(() =>
    normalizePillars(plan.pillars)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Location fields state
  const [lga, setLga] = useState(plan.lga || "");
  const [lcda, setLcda] = useState(plan.lcda || "");
  const [ward, setWard] = useState(plan.ward || "");
  const [state, setState] = useState(plan.state || "");

  // Payment fields state
  const [feePercent, setFeePercent] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [lasgReceiptUrl, setLasgReceiptUrl] = useState("");
  const [remitaReceiptUrl, setRemitaReceiptUrl] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [payer, setPayer] = useState<any>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsResult = await surfboardApi.settings.codSubmission();
        if (settingsResult.success) {
          setFeePercent(settingsResult.data.queryResponseFeePercent || 0);
        }
        const profileRes = await surfboardApi.cod.payerProfile();
        if (profileRes.success && profileRes.data) {
          setPayer(profileRes.data);
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();
  }, []);

  const handleCopyAmount = () => {
    if (plan.codFee) {
      const amt = (plan.codFee * feePercent) / 100;
      navigator.clipboard.writeText(amt.toString());
      toast.success("Amount copied to clipboard");
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const feeAmount = plan.codFee ? (plan.codFee * feePercent) / 100 : 0;
  const today = new Date().toLocaleDateString("en-GB");

  // Reset state when plan changes
  useEffect(() => {
    setPillars(normalizePillars(plan.pillars));
    setLga(plan.lga || "");
    setLcda(plan.lcda || "");
    setWard(plan.ward || "");
    setState(plan.state || "");
  }, [plan]);

  const originalPillarsJson = JSON.stringify(normalizePillars(plan.pillars));
  const pillarsChanged = JSON.stringify(pillars) !== originalPillarsJson;
  const locationChanged =
    lga !== (plan.lga || "") ||
    lcda !== (plan.lcda || "") ||
    ward !== (plan.ward || "") ||
    state !== (plan.state || "");

  // Handle CSV file upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSVContent(text);
        setPillars(parsed);
        toast.success(`Loaded ${parsed.length} pillars from CSV`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to parse CSV"
        );
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-uploaded
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  // Handle pillar field change
  const handlePillarChange = (
    index: number,
    field: keyof PillarData,
    value: string | number
  ) => {
    setPillars((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              [field]:
                field === "pillarNumber"
                  ? value
                  : parseFloat(value as string) || 0,
            }
          : p
      )
    );
  };

  // Move row up
  const moveRowUp = (index: number) => {
    if (index === 0) return;
    setPillars((prev) => {
      const newArr = [...prev];
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
      return newArr.map((p, i) => ({ ...p, pointIndex: i }));
    });
  };

  // Move row down
  const moveRowDown = (index: number) => {
    if (index >= pillars.length - 1) return;
    setPillars((prev) => {
      const newArr = [...prev];
      [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
      return newArr.map((p, i) => ({ ...p, pointIndex: i }));
    });
  };

  // Add new row
  const addRow = () => {
    setPillars((prev) => [
      ...prev,
      {
        pillarNumber: `P${prev.length + 1}`,
        easting: 0,
        northing: 0,
        pointIndex: prev.length,
      },
    ]);
  };

  // Remove row
  const removeRow = (index: number) => {
    if (pillars.length <= 3) {
      toast.error("Minimum 3 pillars required");
      return;
    }
    setPillars((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, pointIndex: i }))
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    // Validate minimum pillars
    if (pillars.length < 3) {
      toast.error("At least 3 pillars are required");
      return;
    }

    // Check if anything was changed
    if (!pillarsChanged && !selectedFile && !locationChanged) {
      toast.error("Please make at least one change before resubmitting");
      return;
    }

    // Handle payment step
    if (feeAmount > 0 && !showPayment) {
      setShowPayment(true);
      return;
    }

    // If payment is shown but links are incomplete
    if (showPayment) {
      if (!lasgReceiptUrl.trim() || !remitaReceiptUrl.trim()) {
        toast.error("Please provide both LASG and Remita receipt links.");
        return;
      }
      if (!lasgReceiptUrl.includes("printreceipt.ebs-rcm.com")) {
        toast.error("Invalid LASG receipt URL.");
        return;
      }
      if (!remitaReceiptUrl.includes("login.remita.net")) {
        toast.error("Invalid Remita receipt URL.");
        return;
      }
    }

    try {
      setSubmitting(true);

      let recordCopyUrl: string | undefined;

      // Upload new record copy if selected
      if (selectedFile) {
        setUploading(true);
        const uploadResult = await surfboardApi.files.uploadSurfboardFile(
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

      // Submit amendments
      const pillarsData = pillarsChanged ? pillars : undefined;
      const locationData = locationChanged
        ? {
            lga: lga || undefined,
            lcda: lcda || undefined,
            ward: ward || undefined,
            state: state || undefined,
          }
        : undefined;

      const result = await surfboardApi.plans.resubmit(plan.id, {
        pillars: pillarsData,
        recordCopyUrl,
        location: locationData,
        lasgReceiptUrl: showPayment ? lasgReceiptUrl : undefined,
        remitaReceiptUrl: showPayment ? remitaReceiptUrl : undefined,
      });

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
      <DialogContent
        className={
          showPayment
            ? "w-[95vw] lg:max-w-[1400px] h-[95vh] lg:h-[90vh] flex flex-col p-0 overflow-hidden bg-gray-50 dark:bg-white/5"
            : "w-[95vw] lg:max-w-7xl max-h-[95vh] lg:max-h-[90vh] overflow-y-auto"
        }
      >
        <DialogHeader
          className={
            showPayment
              ? "p-4 lg:p-6 pb-2 border-b bg-white dark:bg-surface"
              : ""
          }
        >
          {!showPayment ? (
            <>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                Amend Plan - {plan.planNumber}
              </DialogTitle>
              <DialogDescription>
                Make corrections to the pillars, location, and/or upload a new
                record copy, then resubmit for review
              </DialogDescription>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Complete Payment for Query Response
                </DialogTitle>
                <DialogDescription className="space-y-1">
                  <p>
                    Paste both receipt links from your email to verify payment.
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-700 bg-blue-50/50 px-2 py-1 rounded border border-blue-100">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> Agency: Office of
                      Surveyor General
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Period: {today}
                    </span>
                  </div>
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                  Total Amount
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-2xl font-bold text-green-700">
                    ₦{feeAmount.toLocaleString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={handleCopyAmount}
                    title="Copy Amount"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {!showPayment ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Column - Form Fields */}
            <div className="space-y-6">
              {/* Pillars Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <Label className="text-base font-semibold">
                    Pillar Coordinates
                  </Label>

                  <div className="flex items-center gap-2">
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => csvInputRef.current?.click()}
                      className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Upload CSV
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRow}
                      className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Row
                    </Button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">
                      {pillars.length} pillars
                    </span>
                  </div>
                </div>

                {/* Pillars Table */}
                <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-linear-to-b from-blue-50 to-white shadow-sm">
                  <div className="px-4 py-2 bg-linear-to-r from-blue-600 to-blue-500 border-b border-blue-200">
                    <span className="text-lg font-bold text-white">PL</span>
                  </div>
                  <div className="overflow-x-auto max-h-[280px]">
                    <table className="min-w-full divide-y divide-blue-100">
                      <thead className="bg-blue-50/80 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider w-8 sm:w-10">
                            #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                            <span className="inline">Pillar No.</span>
                            {/* <span className="sm:hidden">Pillar</span> */}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                            <span className="inline">Easting</span>
                            {/* <span className="sm:hidden">E</span> */}
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                            <span className="inline">Northing</span>
                            {/* <span className="sm:hidden">N</span> */}
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider w-24">
                            <span className="inline">Actions</span>
                            {/* <span className="sm:hidden">Act</span> */}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-surface divide-y divide-blue-50">
                        {pillars.map((pillar, index) => (
                          <tr
                            key={index}
                            className="hover:bg-blue-50/50 transition-colors group"
                          >
                            <td className="px-3 py-1.5 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                              {index + 1}
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <Input
                                value={pillar.pillarNumber}
                                onChange={(e) =>
                                  handlePillarChange(
                                    index,
                                    "pillarNumber",
                                    e.target.value
                                  )
                                }
                                className="h-7 w-auto min-w-[60px] text-sm font-medium border-gray-200 dark:border-white/10 focus:border-blue-400 focus:ring-blue-400"
                                placeholder="P1"
                              />
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <Input
                                type="number"
                                step="any"
                                value={pillar.easting}
                                onChange={(e) =>
                                  handlePillarChange(
                                    index,
                                    "easting",
                                    e.target.value
                                  )
                                }
                                className="h-7 w-auto min-w-[70px] text-sm font-mono border-gray-200 dark:border-white/10 focus:border-blue-400 focus:ring-blue-400"
                                placeholder="0.000"
                              />
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <Input
                                type="number"
                                step="any"
                                value={pillar.northing}
                                onChange={(e) =>
                                  handlePillarChange(
                                    index,
                                    "northing",
                                    e.target.value
                                  )
                                }
                                className="h-7 w-auto min-w-[70px] text-sm font-mono border-gray-200 dark:border-white/10 focus:border-blue-400 focus:ring-blue-400"
                                placeholder="0.000"
                              />
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveRowUp(index)}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-30"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveRowDown(index)}
                                  disabled={index === pillars.length - 1}
                                  className="h-6 w-6 p-0 hover:bg-blue-100 disabled:opacity-30"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRow(index)}
                                  className="h-6 w-6 p-0 hover:bg-red-100 text-red-500 hover:text-red-600"
                                  title="Remove row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pillars.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <FileSpreadsheet className="w-6 h-6 text-gray-300" />
                                <p className="text-sm">
                                  No pillars yet. Upload a CSV or add rows
                                  manually.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {pillars.length > 0 && pillars.length < 3 && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
                      <p className="text-sm text-amber-700">
                        ⚠️ At least 3 pillars required
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Fields Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Location Details
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      LGA
                    </label>
                    <Input
                      value={lga}
                      onChange={(e) => setLga(e.target.value)}
                      placeholder="Local Government Area"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      LCDA
                    </label>
                    <Input
                      value={lcda}
                      onChange={(e) => setLcda(e.target.value)}
                      placeholder="LCDA"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ward
                    </label>
                    <Input
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      placeholder="Ward"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State
                    </label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Record Copy Section */}
              <div className="space-y-3">
                <Label
                  htmlFor="record-copy"
                  className="text-base font-semibold"
                >
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a new record copy (PDF or image)
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      id="record-copy"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="flex-1 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50"
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
                  <li>Plan sent for re-review by querying MDA role</li>
                  <li>You'll be notified once reviewed</li>
                  <li>Other approved roles remain approved</li>
                </ul>
              </div>
            </div>

            {/* Right Column - Map View */}
            <div className="hidden lg:block sticky top-0">
              <div className="h-[calc(90vh-140px)] min-h-[500px] rounded-xl overflow-hidden border-2 border-slate-200 dark:border-white/10 shadow-inner bg-slate-50 dark:bg-surface relative group">
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
                  <p className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Pillar Preview
                  </p>
                </div>
                <MaplibreMap processedPillars={pillars} state={state} />
              </div>

              {/* Map Instructions */}
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Map Preview:</strong> The map automatically updates as
                  you edit pillar coordinates. Ensure the pillars form a closed
                  polygon that matches your physical record copy.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden border-y lg:border rounded-none lg:rounded-lg mx-0 lg:-mx-4 lg:my-2">
            {/* Left Panel: Payer Info & Receipt Links */}
            <div className="w-full lg:w-1/3 p-4 lg:p-6 lg:overflow-y-auto lg:border-r bg-white dark:bg-surface space-y-6">
              {/* Payer ID Match Warning */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Important:</strong> Please ensure your Payer ID and
                  Payer Type match the LASG receipt before making payment.
                </p>
              </div>

              {/* Payer Info Card */}
              <div className="border rounded-lg p-4 bg-slate-50 dark:bg-surface space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700 dark:text-gray-300">
                  <User className="w-4 h-4" /> Payer Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Payer ID
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {payer?.payerID || "Not Set"}
                      </p>
                      {payer?.payerID && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-blue-600"
                          onClick={() =>
                            handleCopyText(payer.payerID.toString(), "Payer ID")
                          }
                          title="Copy Payer ID"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Payer Type
                    </label>
                    <p className="font-medium">
                      {payer?.payerIDType || "Not Set"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Name
                    </label>
                    <p className="font-medium">
                      {payer
                        ? `${payer.firstName} ${payer.lastName}`
                        : "Loading..."}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Email
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {payer?.email || "N/A"}
                      </p>
                      {payer?.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-blue-600"
                          onClick={() => handleCopyText(payer.email, "Email")}
                          title="Copy Email"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Phone
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {payer?.phoneNumber || "N/A"}
                      </p>
                      {payer?.phoneNumber && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-blue-600"
                          onClick={() =>
                            handleCopyText(payer.phoneNumber, "Phone")
                          }
                          title="Copy Phone"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info Card */}
              <div className="border rounded-lg p-4 bg-slate-50 dark:bg-surface space-y-3 shadow-xs">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700 dark:text-gray-300">
                  <Building className="w-4 h-4 text-blue-500" /> Payment Details
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">
                      Agency Name
                    </span>
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        4830000 -- 61004 -- Office of Surveyor General
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-blue-600"
                        onClick={() =>
                          handleCopyText(
                            "4830000 -- 61004 -- Office of Surveyor General",
                            "Agency Name"
                          )
                        }
                        title="Copy Agency Name"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">
                      Revenue Name
                    </span>
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        4020002 -- 32202 -- Lands Registry Transactions
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-blue-600"
                        onClick={() =>
                          handleCopyText(
                            "4020002 -- 32202 -- Lands Registry Transactions",
                            "Revenue Name"
                          )
                        }
                        title="Copy Revenue Name"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">
                      Period
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />{" "}
                        {today}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-blue-600"
                        onClick={() => handleCopyText(today, "Period")}
                        title="Copy Period"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Links Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-slate-700 dark:text-gray-300">
                  Verify Payment Links
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex justify-between">
                      LASG Receipt URL
                    </Label>
                    <Input
                      placeholder="https://printreceipt.ebs-rcm.com/..."
                      value={lasgReceiptUrl}
                      onChange={(e) => setLasgReceiptUrl(e.target.value)}
                      className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm flex justify-between">
                      Remita Receipt URL
                    </Label>
                    <Input
                      placeholder="https://login.remita.net/remita/rrr/..."
                      value={remitaReceiptUrl}
                      onChange={(e) => setRemitaReceiptUrl(e.target.value)}
                      className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:bg-white text-sm focus:border-blue-400 focus:ring-blue-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Embedded Remita Portal */}
            <div className="w-full lg:w-2/3 bg-gray-100 dark:bg-white/10 flex flex-col relative min-h-[400px] lg:min-h-0 border-t lg:border-t-0">
              <div className="bg-yellow-50 text-yellow-800 text-xs px-4 py-2 border-b flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>
                    Use <strong>{payer?.payerID || "YOUR_PAYER_ID"}</strong>{" "}
                    when requested on the payment portal.
                  </span>
                  {payer?.payerID && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-900"
                      onClick={() =>
                        handleCopyText(payer.payerID.toString(), "Payer ID")
                      }
                      title="Copy Payer ID"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="h-7 text-xs bg-white dark:bg-surface"
                >
                  Refresh Portal
                </Button>
              </div>
              <div className="flex-1 relative overflow-hidden bg-white dark:bg-surface shadow-inner">
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                  <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                </div>
                <iframe
                  key={iframeKey}
                  src="https://login.remita.net/remita/lirs/internal/pay.reg"
                  className="w-full h-full border-0 absolute inset-0 z-0 bg-white dark:bg-surface"
                  title="Remita Payment Portal"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="my-4 flex justify-center items-center">
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
                {uploading ? "Uploading..." : "Processing..."}
              </>
            ) : showPayment ? (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Verify & Resubmit
              </>
            ) : feeAmount > 0 ? (
              <>Pay Query Fee (₦{feeAmount.toLocaleString()})</>
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
