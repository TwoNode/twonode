"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PillarData,
  PLAN_TYPES,
  PlanType,
  SurfboardPlanDTO,
  MAX_FILE_BYTES,
  PILLAR_TYPES,
  PILLAR_TYPE_ADJOINING_FILTERS,
  REFERENCE_FILTERS,
} from "../types/surfboardTypes";
import { surfboardApi } from "@/surfboard/apiClient";
import { Badge } from "@/components/ui/badge";
import MaplibreMap from "./maps/MaplibreMap";
import { File, X, FileText, FileCheck, Save, Loader2 } from "lucide-react";

interface OptimizedSurfboardPlanFormProps {
  mode: "create" | "edit";
  initialData?: SurfboardPlanDTO;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const VALID_CAD_EXTENSIONS = [".dwg", ".dxf"];

// Initialize form data from initial prop
const INITIALS = (initial: any): SurfboardPlanDTO => {
  return {
    planNumber: initial?.planNumber || "",
    surveyTitle: initial?.surveyTitle || "",
    planType: initial?.planType || ("" as PlanType),
    deededArea: initial?.deededArea || "",
    facilitator: initial?.facilitator || "",
    pillarType: initial?.pillarType || "",
    dateOnSurveyPlan:
      initial?.dateOnSurveyPlan || new Date().toISOString().split("T")[0],
    geometry: initial?.geometry || null,
    pillars: initial?.pillars || [],
    pdfFilePaths: initial?.pdfFilePaths || [],
    cadFilePaths: initial?.cadFilePaths || [],
    certificateFilePaths: initial?.certificateFilePaths || [],
    ward: initial?.ward || null,
    lcda: initial?.lcda || null,
    lga: initial?.lga || null,
    state: initial?.state || null,
    locality: initial?.locality || "",
    status: initial?.status || "PENDING",
    isLive: initial?.isLive || false,
    referencePlanNumber: initial?.referencePlanNumber || "",
    pillarTypeReferencePlanNumber: initial?.pillarTypeReferencePlanNumber || "",
    parcels: initial?.parcels || [],
    dateLodged: initial?.dateLodged || null,
    id: initial?.id,
    userId: initial?.userId,
    reasonForWithdrawalAndResubmission: initial?.reasonForWithdrawalAndResubmission || "",
  };
};

// Helper classes
const cn = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const labelCls = "block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1";
const reqBadge = (
  <span className="text-red-500" aria-hidden="true">
    *
  </span>
);
const inputBase =
  "w-full px-3 py-2 border rounded-md outline-none transition focus:ring-2 focus:ring-black focus:border-black/30 dark:focus:ring-white/40 dark:focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-surface text-gray-900 dark:text-white";
const inputBorder = "border-gray-300 dark:border-white/15";
const inputError = "border-red-500 focus:ring-red-600";
const errorCls = "mt-1 text-sm text-red-600 dark:text-red-400";

const sectionCardBase =
  "bg-white dark:bg-surface rounded-2xl shadow dark:shadow-none p-6 space-y-6 border border-gray-100 dark:border-white/10";
const sectionTitle = "text-base font-semibold text-gray-900 dark:text-white";
const subtle = "text-sm text-gray-600 dark:text-gray-400";

type SectionProps = {
  id: string;
  title: string;
  subtitle?: string;
  step: number | string;
  accent: "indigo" | "violet" | "sky" | "emerald" | "amber" | "rose" | "blue";
  children: React.ReactNode;
};

function Section({
  id,
  title,
  subtitle,
  step,
  accent,
  children,
}: SectionProps) {
  const accentMap: Record<SectionProps["accent"], string> = {
    indigo: "border-l-indigo-500",
    violet: "border-l-violet-500",
    sky: "border-l-sky-500",
    emerald: "border-l-emerald-500",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
    blue: "border-l-blue-500",
  };
  const badgeMap: Record<SectionProps["accent"], string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(sectionCardBase, "border-l-4", accentMap[accent])}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              badgeMap[accent]
            )}
          >
            Step {step}
          </div>
          <h2 id={`${id}-title`} className={cn(sectionTitle, "mt-2")}>
            {title}
          </h2>
          {subtitle && <p className={cn(subtle, "mt-0.5")}>{subtitle}</p>}
        </div>
        <a
          href={`#${id}`}
          className="text-xs text-gray-400 hover:text-gray-600"
          aria-label={`Anchor link to ${title}`}
        >
          #
        </a>
      </div>
      <hr className="border-dashed border-gray-200" />
      {children}
    </section>
  );
}

export default function OptimizedSurfboardPlanForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
}: OptimizedSurfboardPlanFormProps) {
  const [formData, setFormData] = useState<SurfboardPlanDTO>(() =>
    INITIALS(initialData)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [planNumberChecking, setPlanNumberChecking] = useState(false);

  // File state
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [cadFiles, setCadFiles] = useState<File[]>([]);
  const [certFiles, setCertFiles] = useState<File[]>([]);

  // Adjoining Pillar logic
  const adjoiningFilterConf = PILLAR_TYPE_ADJOINING_FILTERS[formData.pillarType];
  const showAdjoiningField = adjoiningFilterConf?.showReferenceField;
  const isAdjoiningRequired = adjoiningFilterConf?.required;

  // Adjoining Ref Plan search state
  const [adjOptions, setAdjOptions] = useState<string[]>([]);
  const [adjQuery, setAdjQuery] = useState("");
  const [adjOpen, setAdjOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await surfboardApi.plans.referenceNumbers(PLAN_TYPES.DEED);
        setAdjOptions((res.success ? res.data : []) || []);
      } catch (e) {
        console.error(e);
        setAdjOptions([]);
      }
    };
    if (showAdjoiningField) {
      load();
      setAdjQuery("");
    }
  }, [showAdjoiningField]);

  const filteredAdjOptions = useMemo(() => {
    if (!adjQuery.trim()) return adjOptions;
    const q = adjQuery.toLowerCase();
    return adjOptions.filter((o) => o.toLowerCase().includes(q));
  }, [adjOptions, adjQuery]);

  // Reference Plan Logic
  const refFilterConf = formData.planType ? REFERENCE_FILTERS[formData.planType] : null;
  const showReferenceField = refFilterConf?.showField;
  const isReferenceRequired = refFilterConf?.required;

  // Reference Plan search state
  const [refOptions, setRefOptions] = useState<string[]>([]);
  const [refQuery, setRefQuery] = useState("");
  const [refOpen, setRefOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!formData.planType) return;
      try {
        const res = await surfboardApi.plans.referenceNumbers(formData.planType);
        setRefOptions((res.success ? res.data : []) || []);
      } catch (e) {
        console.error(e);
        setRefOptions([]);
      }
    };
    if (showReferenceField) {
      load();
      setRefQuery("");
    }
  }, [formData.planType, showReferenceField]);

  const filteredRefOptions = useMemo(() => {
    if (!refQuery.trim()) return refOptions;
    const q = refQuery.toLowerCase();
    return refOptions.filter((o) => o.toLowerCase().includes(q));
  }, [refOptions, refQuery]);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(INITIALS(initialData));
    }
  }, [initialData]);

  const setField = <K extends keyof SurfboardPlanDTO>(
    key: K,
    val: SurfboardPlanDTO[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.planNumber?.trim()) {
      newErrors.planNumber = "Plan number is required";
    }
    if (!formData.surveyTitle?.trim()) {
      newErrors.surveyTitle = "Survey title is required";
    }
    if (!formData.deededArea?.trim()) {
      newErrors.deededArea = "Deeded area is required";
    }
    if (!formData.pillarType?.trim()) {
      newErrors.pillarType = "Pillar type is required";
    }
    if (!formData.planType) {
      newErrors.planType = "Plan type is required";
    }
    if (!formData.facilitator?.trim()) {
      newErrors.facilitator = "Facilitator is required";
    }
    if (!formData.dateOnSurveyPlan) {
      newErrors.dateOnSurveyPlan = "Date on survey plan is required";
    }

    if (showAdjoiningField && isAdjoiningRequired && !formData.pillarTypeReferencePlanNumber?.trim()) {
      newErrors.pillarTypeReferencePlanNumber = "Adjoining reference plan number is required";
    }

    if (showReferenceField) {
      if (!formData.referencePlanNumber?.trim()) {
        newErrors.referencePlanNumber = "Reference plan number is required";
      } else if (
        refFilterConf &&
        !refFilterConf.allowFreeText &&
        !refOptions.includes(formData.referencePlanNumber)
      ) {
        newErrors.referencePlanNumber = "Must select a valid plan number from the list";
      }
    }

    if (
      formData.planType === PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION &&
      !formData.reasonForWithdrawalAndResubmission?.trim()
    ) {
      newErrors.reasonForWithdrawalAndResubmission = "Reason for withdrawal is required";
    }

    // File validation for create mode
    if (mode === "create") {
      if (pdfFiles.length === 0 && formData.pdfFilePaths.length === 0) {
        newErrors.pdfFiles = "At least one PDF file is required";
      }
      if (cadFiles.length === 0 && formData.cadFilePaths.length === 0) {
        newErrors.cadFiles = "At least one CAD file is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFiles = async (
    kind: "cad" | "pdf" | "certificate",
    files: File[]
  ): Promise<string[]> => {
    const uploaded: string[] = [];

    for (const file of files) {
      try {
        const result = await surfboardApi.files.uploadSurfboardFileWithAuth(
          file,
          kind,
          formData.planNumber
        );
        if (result?.url) {
          uploaded.push(result.url);
        } else {
          throw new Error("Upload failed - no URL returned");
        }
      } catch (error) {
        console.error(`Error uploading ${kind} file:`, error);
        throw error;
      }
    }
    return uploaded;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setSubmitting(true);

    try {
      // Upload new files
      const [newPdfUrls, newCadUrls, newCertUrls] = await Promise.all([
        pdfFiles.length > 0 ? uploadFiles("pdf", pdfFiles) : [],
        cadFiles.length > 0 ? uploadFiles("cad", cadFiles) : [],
        certFiles.length > 0 ? uploadFiles("certificate", certFiles) : [],
      ]);

      // Combine with existing file paths
      const payload: SurfboardPlanDTO = {
        ...formData,
        pdfFilePaths: [...formData.pdfFilePaths, ...newPdfUrls],
        cadFilePaths: [...formData.cadFilePaths, ...newCadUrls],
        certificateFilePaths: [
          ...formData.certificateFilePaths,
          ...newCertUrls,
        ],
      };

      let result;
      if (mode === "edit" && formData.id) {
        result = await surfboardApi.plans.update(formData.id, payload as any);
      } else {
        result = await surfboardApi.plans.create(payload as any);
      }

      if (result.success) {
        toast.success(
          mode === "edit"
            ? "Plan updated successfully!"
            : "Plan created successfully!"
        );
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to save plan");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while saving the plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanNumberBlur = async () => {
    if (!formData.planNumber?.trim()) return;

    // Skip check if editing and plan number hasn't changed
    if (mode === "edit" && formData.planNumber === initialData?.planNumber) {
      return;
    }

    setPlanNumberChecking(true);
    try {
      const checkResult = await surfboardApi.plans.checkNumberExists(
        formData.planNumber,
        mode === "edit" ? formData.id : undefined
      );
      const exists = checkResult.success ? checkResult.data.exists : false;
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          planNumber: "This plan number is already in use",
        }));
      }
    } catch (error) {
      console.error("Error checking plan number:", error);
    } finally {
      setPlanNumberChecking(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "pdf" | "cad" | "cert"
  ) => {
    const files = Array.from(e.target.files || []);

    // Validate file extensions for CAD files
    if (type === "cad") {
      const invalidFiles = files.filter(
        (f) =>
          !VALID_CAD_EXTENSIONS.some((ext) =>
            f.name.toLowerCase().endsWith(ext)
          )
      );
      if (invalidFiles.length > 0) {
        toast.error(
          `Invalid CAD file format. Only ${VALID_CAD_EXTENSIONS.join(
            ", "
          )} files are allowed.`
        );
        return;
      }
    }

    // Validate file sizes
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(
        `Some files exceed the maximum size of ${
          MAX_FILE_BYTES / 1024 / 1024
        }MB`
      );
      return;
    }

    // Update state
    if (type === "pdf") {
      setPdfFiles((prev) => [...prev, ...files]);
    } else if (type === "cad") {
      setCadFiles((prev) => [...prev, ...files]);
    } else if (type === "cert") {
      setCertFiles((prev) => [...prev, ...files]);
    }

    // Clear errors
    if (errors[`${type}Files`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${type}Files`];
        return newErrors;
      });
    }
  };

  const removeFile = (
    type: "pdf" | "cad" | "cert",
    index: number,
    isExisting: boolean
  ) => {
    if (isExisting) {
      // Remove from existing file paths
      if (type === "pdf") {
        setField(
          "pdfFilePaths",
          formData.pdfFilePaths.filter((_, i) => i !== index)
        );
      } else if (type === "cad") {
        setField(
          "cadFilePaths",
          formData.cadFilePaths.filter((_, i) => i !== index)
        );
      } else if (type === "cert") {
        setField(
          "certificateFilePaths",
          formData.certificateFilePaths.filter((_, i) => i !== index)
        );
      }
    } else {
      // Remove from new files
      if (type === "pdf") {
        setPdfFiles((prev) => prev.filter((_, i) => i !== index));
      } else if (type === "cad") {
        setCadFiles((prev) => prev.filter((_, i) => i !== index));
      } else if (type === "cert") {
        setCertFiles((prev) => prev.filter((_, i) => i !== index));
      }
    }
  };

  return (
    <div className="mx-auto py-0 px-0">
      {/* Gradient Header */}
      <div className="bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-t-sm">
        <div className="mx-auto px-4 py-6">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            {mode === "edit" ? (
              <>
                Edit Survey Plan &nbsp;
                <span className="italic text-[#9ec8ff]">
                  {initialData?.surveyTitle}
                </span>
              </>
            ) : (
              "Create New Survey Plan"
            )}
          </h1>

          <p className="text-white/80 text-sm">
            {mode === "edit"
              ? "Update the details of your survey plan"
              : "Fill in the details to create a new survey plan"}
          </p>
        </div>
      </div>

      <div className="mx-auto py-6 px-4">
        <div className="grid grid-cols-1 xl:grid-cols-[5fr_5fr] gap-8">
          {/* Left — Form */}
          <div className="space-y-6">
            <Section
              id="plan-info"
              step={1}
              title="Plan Information"
              subtitle="Core identifiers and classification."
              accent="indigo"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Number */}
                <div>
                  <label className={labelCls} htmlFor="planNumber">
                    Plan Number {reqBadge}
                  </label>
                  <div className="relative">
                    <input
                      id="planNumber"
                      type="text"
                      value={formData.planNumber}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/\s+/g, "");
                        setField("planNumber", cleanValue);
                      }}
                      onBlur={handlePlanNumberBlur}
                      className={cn(
                        inputBase,
                        errors.planNumber ? inputError : inputBorder,
                        "pr-28"
                      )}
                      placeholder="Enter plan number"
                      disabled={planNumberChecking}
                      autoComplete="off"
                    />
                    {planNumberChecking && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        Checking…
                      </span>
                    )}
                  </div>
                  {errors.planNumber && (
                    <p className={errorCls}>{errors.planNumber}</p>
                  )}
                </div>

                {/* Survey Title */}
                <div>
                  <label className={labelCls} htmlFor="surveyTitle">
                    Survey Title {reqBadge}
                  </label>
                  <input
                    id="surveyTitle"
                    value={formData.surveyTitle}
                    onChange={(e) => setField("surveyTitle", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.surveyTitle ? inputError : inputBorder
                    )}
                    placeholder="e.g., Parcel Layout for…"
                  />
                  {errors.surveyTitle && (
                    <p className={errorCls}>{errors.surveyTitle}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan Type */}
                <div>
                  <label className={labelCls} htmlFor="planType">
                    Plan Type {reqBadge}
                  </label>
                  <select
                    id="planType"
                    value={formData.planType}
                    onChange={(e) =>
                      setField("planType", e.target.value as PlanType)
                    }
                    className={cn(inputBase, inputBorder)}
                  >
                    <option value="">-- Select Plan Type --</option>
                    {Object.values(PLAN_TYPES).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {errors.planType && (
                    <p className={errorCls}>{errors.planType}</p>
                  )}
                </div>

                {/* Pillar Type */}
                <div>
                  <label className={labelCls} htmlFor="pillarType">
                    Pillar Type {reqBadge}
                  </label>
                  <select
                    id="pillarType"
                    value={formData.pillarType}
                    onChange={(e) => setField("pillarType", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.pillarType ? inputError : inputBorder
                    )}
                  >
                    <option value="">-- Select Pillar Type --</option>
                    {Object.values(PILLAR_TYPES).map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                  {errors.pillarType && (
                    <p className={errorCls}>{errors.pillarType}</p>
                  )}
                </div>

                {showAdjoiningField && (
                  <div>
                    <label
                      className={labelCls}
                      htmlFor="pillarTypeReferencePlan"
                    >
                      Adjoining Reference Plan No.{" "}
                      {isAdjoiningRequired && reqBadge}
                    </label>
                    <div className="relative">
                      <input
                        id="pillarTypeReferencePlan"
                        type="text"
                        value={formData.pillarTypeReferencePlanNumber ?? ""}
                        onChange={(e) => {
                          setAdjQuery(e.target.value);
                          setField(
                            "pillarTypeReferencePlanNumber",
                            e.target.value
                          );
                        }}
                        onFocus={() => setAdjOpen(true)}
                        onBlur={() => setTimeout(() => setAdjOpen(false), 120)}
                        className={cn(
                          inputBase,
                          errors.pillarTypeReferencePlanNumber
                            ? inputError
                            : inputBorder,
                          "pr-8"
                        )}
                        placeholder="Search for reference plan..."
                        aria-invalid={!!errors.pillarTypeReferencePlanNumber}
                      />
                      {adjOpen && filteredAdjOptions.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          <ul className="py-1">
                            {filteredAdjOptions.map((pn, i) => (
                              <li
                                key={pn + i}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={() => {
                                  setField("pillarTypeReferencePlanNumber", pn);
                                  setAdjQuery("");
                                  setAdjOpen(false);
                                }}
                              >
                                {pn}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showReferenceField && (
                  <div>
                    <label className={labelCls} htmlFor="referencePlan">
                      Reference Plan No.{" "}
                      {isReferenceRequired && reqBadge}
                    </label>
                    <div className="relative">
                      <input
                        id="referencePlan"
                        type="text"
                        value={formData.referencePlanNumber ?? ""}
                        onChange={(e) => {
                          setRefQuery(e.target.value);
                          setField("referencePlanNumber", e.target.value);
                        }}
                        onFocus={() => setRefOpen(true)}
                        onBlur={() => setTimeout(() => setRefOpen(false), 120)}
                        className={cn(
                          inputBase,
                          errors.referencePlanNumber ? inputError : inputBorder,
                          "pr-8"
                        )}
                        placeholder="Search for reference plan..."
                        aria-invalid={!!errors.referencePlanNumber}
                      />
                      {refOpen && filteredRefOptions.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          <ul className="py-1">
                            {filteredRefOptions.map((pn, i) => (
                              <li
                                key={pn + i}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                onMouseDown={() => {
                                  setField("referencePlanNumber", pn);
                                  setRefQuery("");
                                  setRefOpen(false);
                                }}
                              >
                                {pn}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {errors.referencePlanNumber && (
                      <p className={errorCls}>{errors.referencePlanNumber}</p>
                    )}
                  </div>
                )}

                {formData.planType === PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor="reasonForWithdrawal">
                      Reason for Withdrawal {reqBadge}
                    </label>
                    <textarea
                      id="reasonForWithdrawal"
                      rows={3}
                      value={formData.reasonForWithdrawalAndResubmission ?? ""}
                      onChange={(e) =>
                        setField(
                          "reasonForWithdrawalAndResubmission",
                          e.target.value
                        )
                      }
                      className={cn(
                        inputBase,
                        errors.reasonForWithdrawalAndResubmission
                          ? inputError
                          : inputBorder,
                        "resize-none py-2"
                      )}
                      placeholder="Please specify the reason for withdrawal and resubmission..."
                      aria-invalid={!!errors.reasonForWithdrawalAndResubmission}
                    />
                    {errors.reasonForWithdrawalAndResubmission && (
                      <p className={errorCls}>
                        {errors.reasonForWithdrawalAndResubmission}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Section>

            <Section
              id="core-details"
              step={2}
              title="Core Details"
              subtitle="Project metadata and survey timing."
              accent="sky"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="deededArea">
                    Deeded Area {reqBadge}
                  </label>
                  <input
                    id="deededArea"
                    value={formData.deededArea}
                    onChange={(e) => setField("deededArea", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.deededArea ? inputError : inputBorder
                    )}
                    placeholder="e.g., 12,345.67 m²"
                  />
                  {errors.deededArea && (
                    <p className={errorCls}>{errors.deededArea}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls} htmlFor="facilitator">
                    Facilitator {reqBadge}
                  </label>
                  <input
                    id="facilitator"
                    type="text"
                    value={formData.facilitator}
                    onChange={(e) => setField("facilitator", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.facilitator ? inputError : inputBorder
                    )}
                    placeholder="Type or select a facilitator"
                  />
                  {errors.facilitator && (
                    <p className={errorCls}>{errors.facilitator}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls} htmlFor="dateOnSurveyPlan">
                    Date on Survey Plan {reqBadge}
                  </label>
                  <input
                    id="dateOnSurveyPlan"
                    type="date"
                    value={
                      formData.dateOnSurveyPlan &&
                      typeof formData.dateOnSurveyPlan == "object"
                        ? new Date(formData.dateOnSurveyPlan)
                            ?.toISOString()
                            .split("T")[0]
                        : formData.dateOnSurveyPlan
                    }
                    onChange={(e) =>
                      setField("dateOnSurveyPlan", e.target.value)
                    }
                    className={cn(
                      inputBase,
                      errors.dateOnSurveyPlan ? inputError : inputBorder
                    )}
                  />
                  {errors.dateOnSurveyPlan && (
                    <p className={errorCls}>{errors.dateOnSurveyPlan}</p>
                  )}
                </div>
              </div>
            </Section>

            <Section
              id="files"
              step={3}
              title="File Uploads"
              subtitle="Files upload on submit. Max 50MB per file."
              accent="amber"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CAD */}
                <div>
                  <label className={labelCls} htmlFor="cadFiles">
                    CAD Files {reqBadge}
                  </label>
                  <input
                    id="cadFiles"
                    type="file"
                    multiple
                    accept=".dwg,.dxf"
                    onChange={(e) => handleFileChange(e, "cad")}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {errors.cadFiles && (
                    <p className={errorCls}>{errors.cadFiles}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Allowed formats: {VALID_CAD_EXTENSIONS.join(", ")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {formData.cadFilePaths.map((path, idx) => (
                      <div
                        key={`existing-cad-${idx}`}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            {path.split("/").pop()}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Existing
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile("cad", idx, true)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {cadFiles.map((file, idx) => (
                      <div
                        key={`new-cad-${idx}`}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                      >
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">{file.name}</span>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100"
                          >
                            New
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile("cad", idx, false)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF */}
                <div>
                  <label className={labelCls} htmlFor="pdfFiles">
                    PDF Files {reqBadge}
                  </label>
                  <input
                    id="pdfFiles"
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(e, "pdf")}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {errors.pdfFiles && (
                    <p className={errorCls}>{errors.pdfFiles}</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {formData.pdfFilePaths.map((path, idx) => (
                      <div
                        key={`existing-pdf-${idx}`}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-500" />
                          <span className="text-sm">
                            {path.split("/").pop()}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Existing
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile("pdf", idx, true)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {pdfFiles.map((file, idx) => (
                      <div
                        key={`new-pdf-${idx}`}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">{file.name}</span>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100"
                          >
                            New
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile("pdf", idx, false)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certificate Files */}
                <div className="md:col-span-2">
                  <label className={labelCls} htmlFor="certFiles">
                    Certificate Files (Optional)
                  </label>
                  <input
                    id="certFiles"
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(e, "cert")}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  <div className="mt-3 space-y-2">
                    {formData.certificateFilePaths.map((path, idx) => (
                      <div
                        key={`existing-cert-${idx}`}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            {path.split("/").pop()}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Existing
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile("cert", idx, true)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {certFiles.map((file, idx) => (
                      <div
                        key={`new-cert-${idx}`}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{file.name}</span>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100"
                          >
                            New
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile("cert", idx, false)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Actions */}
            <Section
              id="actions"
              step={4}
              title="Save"
              subtitle="Validate and persist your changes."
              accent="blue"
            >
              <div className="flex gap-3 pt-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 w-full",
                    "bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-md font-medium",
                    "shadow hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {mode === "edit" ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {mode === "edit" ? "Update Plan" : "Create Plan"}
                    </>
                  )}
                </button>
              </div>
            </Section>
          </div>

          {/* Right — Map & Pillar Summary */}
          <div className="space-y-6">
            {formData.pillars.length > 0 && (
              <section
                id="pillar-summary"
                className={cn(
                  sectionCardBase,
                  "border-l-4 border-l-emerald-500"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                      Info
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-2">
                      Pillar Summary
                    </h3>
                  </div>
                </div>
                <hr className="border-dashed border-gray-200" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total Pillars:</span>
                    <span className="font-medium text-gray-900">
                      {formData.pillars.length}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <section
              id="map-preview"
              className={cn(sectionCardBase, "border-l-4 border-l-blue-500")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                    Visual
                  </div>
                  <h2 className="text-lg font-semibold mt-2 text-gray-900">
                    Map Preview
                  </h2>
                </div>
              </div>
              <hr className="border-dashed border-gray-200" />
              <div
                className={cn(
                  "h-160 w-full rounded-lg overflow-hidden",
                  formData.pillars?.length > 0
                    ? "border-4 border-blue-400"
                    : "border border-gray-200"
                )}
              >
                <MaplibreMap processedPillars={formData.pillars} state={formData.state} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
