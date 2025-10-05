"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";

import {
  PillarData,
  PLAN_TYPES,
  PlanType,
  REFERENCE_FILTERS,
  SurfboardPlanDTO,
  MAX_FILE_BYTES,
  ApiResult,
} from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import {
  createPlan,
  updatePlan,
  searchReferencePlanNumbers,
  getAllFacilitatorsAndPlanNumbers,
  checkPlanNumberExists,
} from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import {
  completeSurfboardUpload,
  getSurfboardUploadTargetsMulti,
} from "@/app/(projects)/(surfboard)/actions/awsActions";
import {
  generatePolygonFromPillars,
  parseCSVContent,
} from "../utils/surfboardUtils";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useRouter } from "next/navigation";

const ArcGISMap = dynamic(
  () =>
    import(
      "@/app/(projects)/(surfboard)/surfboard/dashboard/newplan/ArcGISMap"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[70vh] max-h-[1200px] rounded-xl border grid place-items-center">
        <div className="text-sm text-gray-600">Loading map…</div>
      </div>
    ),
  }
);

export type Mode = "create" | "edit";

export type SurfboardPlanFormProps = {
  mode: Mode;
  initial?: SurfboardPlanDTO;
  isSuperAdmin?: boolean;
};

export default function SurfboardPlanForm({
  mode,
  initial,
  isSuperAdmin,
}: SurfboardPlanFormProps) {
  const router = useRouter();

  // --- Form state ---
  const [form, setForm] = useState<SurfboardPlanDTO>(() => ({
    planNumber: initial?.planNumber ?? "",
    surveyTitle: initial?.surveyTitle ?? "",
    planType: (initial?.planType as PlanType) ?? PLAN_TYPES.DEED,
    referencePlanNumber: initial?.referencePlanNumber ?? "",
    deededArea: initial?.deededArea ?? "",
    facilitator: initial?.facilitator ?? "",
    pillarType: initial?.pillarType ?? "",
    geometry: initial?.geometry ?? null,
    pdfFilePaths: initial?.pdfFilePaths ?? [],
    cadFilePaths: initial?.cadFilePaths ?? [],
    certificateFilePaths: initial?.certificateFilePaths ?? [],
    dateOnSurveyPlan: initial?.dateOnSurveyPlan ?? "",
    dateLodged: initial?.dateLodged ?? null,
    ward: initial?.ward ?? null,
    lcda: initial?.lcda ?? null,
    lga: initial?.lga ?? null,
    isLive: initial?.isLive ?? false,
    id: initial?.id,
    createdAt: initial?.createdAt,
  }));

  // Certificate logic
  const [certificateReady, setCertificateReady] = useState<boolean | undefined>(
    initial?.certificateFilePaths?.length ? true : undefined
  );
  const [lockNonCert, setLockNonCert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingPlanNumber, setIsCheckingPlanNumber] = useState(false);

  // 24h lock after mount only (avoid hydration mismatch)
  useEffect(() => {
    // if (mode !== "edit" || isSuperAdmin) return setLockNonCert(false);
    // const created = initial?.createdAt
    //   ? new Date(initial.createdAt).getTime()
    //   : 0;
    // if (!created) return setLockNonCert(false);
    // setLockNonCert(Date.now() - created > 24 * 60 * 60 * 1000);
  }, [mode, isSuperAdmin, initial?.createdAt]);

  // Facilitators dropdown
  const [facilitators, setFacilitators] = useState<string[]>([]);
  const [showFacilitatorList, setShowFacilitatorList] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const result = await getAllFacilitatorsAndPlanNumbers();
        if (result.success && result.data) {
          // Only use facilitators here; plan numbers are no longer used for a dropdown.
          setFacilitators(result.data.facilitators);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Pillars
  const [pillars, setPillars] = useState<PillarData[]>([
    ...(initial?.pillars || []),
  ]);

  // --- Reference Plan Combo (dropdown + optional free input) ---
  const [refOptions, setRefOptions] = useState<string[]>([]);
  const [refQuery, setRefQuery] = useState("");
  const [refOpen, setRefOpen] = useState(false);
  const refTimeoutRef = useRef<NodeJS.Timeout>();
  const refFilterConf = REFERENCE_FILTERS[form.planType];
  const showReferenceField = refFilterConf.showField;
  const isReferenceRequired = refFilterConf.required;

  // Load reference plan numbers when plan type changes
  useEffect(() => {
    const load = async () => {
      try {
        const list = await searchReferencePlanNumbers(form.planType);
        setRefOptions(list || []);
      } catch (e) {
        console.error(e);
        setRefOptions([]);
      }
    };

    if (showReferenceField) {
      load();
      setRefQuery("");
    }
  }, [form.planType, showReferenceField]);

  const filteredRefOptions = useMemo(() => {
    if (refFilterConf && (!refFilterConf.allowFreeText || !refQuery.trim()))
      return refOptions;
    const q = refQuery.toLowerCase();
    return refOptions.filter((o) => o.toLowerCase().includes(q));
  }, [refOptions, refQuery, refFilterConf]);

  // --- Defer uploads until submit ---
  const [selectedCadFiles, setSelectedCadFiles] = useState<File[]>([]);
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<File[]>([]);
  const [selectedCertFiles, setSelectedCertFiles] = useState<File[]>([]);

  function setField<K extends keyof SurfboardPlanDTO>(
    key: K,
    val: SurfboardPlanDTO[K]
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Map callback
  const handleAdminData = (data: {
    geometry?: any;
    attributes?: any;
    pillars?: PillarData[];
  }) => {
    if (!lockNonCert || mode === "create") {
      setForm((prev) => ({
        ...prev,
        ...(data.geometry !== undefined && { geometry: data.geometry }),
        ...(data.attributes?.ward !== undefined && {
          ward: data.attributes?.ward,
        }),
        ...(data.attributes?.lcda !== undefined && {
          lcda: data.attributes?.lcda,
        }),
        ...(data.attributes?.lga !== undefined && {
          lga: data.attributes?.lga,
        }),
        ...(data.pillars !== undefined && { pillars: data.pillars }),
      }));
    }
  };

  // CSV upload (local parsing only)
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("CSV exceeds 50MB");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCSVContent(text);
      if (parsed.length < 3) {
        toast.error("Need at least 3 pillars");
        return;
      }
      setPillars(parsed);
      const geom = await generatePolygonFromPillars(parsed);

      if (geom) {
        setField("geometry", geom as any);

        // Query GIS service for administrative data
        try {
          const adminLayer = new FeatureLayer({
            url: "https://services8.arcgis.com/u07MVBpj9TT3farW/arcgis/rest/services/LagosStateHealthFacilities/FeatureServer/2",
            outFields: ["WARD", "LCDA", "LGA"],
          });

          const query = adminLayer.createQuery();
          query.geometry = geom as any;
          query.spatialRelationship = "intersects";
          query.returnGeometry = false;

          const result = await adminLayer.queryFeatures(query);
          if (result.features.length > 0) {
            const attrs = result.features[0].attributes;
            setForm((prev) => ({
              ...prev,
              ward: attrs.WARD || null,
              lcda: attrs.LCDA || null,
              lga: attrs.LGA || null,
            }));
          }

          console.log(result)
        } catch (error) {
          console.error("Error fetching administrative data:", error);
          // Don't fail the upload if admin data fetch fails
          toast.warning(
            "Could not fetch administrative boundaries. Please enter them manually."
          );
        }
      }

      toast.success(`Parsed ${parsed.length} pillars and generated geometry`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse CSV");
    }
  }

  // Validation respects deferred uploads (checks either existing URLs or selected files)
  function ___validateReq() {
    const errs: Record<string, string> = {};
    if (!form.planNumber?.trim()) errs.planNumber = "Required";
    if (!form.surveyTitle?.trim()) errs.surveyTitle = "Required";
    if (!form.deededArea?.trim()) errs.deededArea = "Required";
    if (!form.facilitator?.trim()) errs.facilitator = "Required";
    if (!form.pillarType?.trim()) errs.pillarType = "Required";
    if (!form.dateOnSurveyPlan?.trim()) errs.dateOnSurveyPlan = "Required";

    const cadCount = (form.cadFilePaths?.length || 0) + selectedCadFiles.length;
    const pdfCount = (form.pdfFilePaths?.length || 0) + selectedPdfFiles.length;
    if (cadCount < 1) errs.cad = "At least one CAD file is required";
    if (pdfCount < 1) errs.pdf = "At least one PDF file is required";

    if (certificateReady) {
      const certCount =
        (form.certificateFilePaths?.length || 0) + selectedCertFiles.length;
      if (certCount < 1) errs.cert = "Certificate file required";
      if (!form.dateLodged?.toString()) errs.dateLodged = "Required";
    }

    if (showReferenceField && !form.referencePlanNumber?.trim()) {
      errs.referencePlanNumber = "Required";
    }

    // Basic per-file size check now (uploads run later)
    const overs = [
      ...selectedCadFiles,
      ...selectedPdfFiles,
      ...selectedCertFiles,
    ].filter((f) => f.size > MAX_FILE_BYTES);
    if (overs.length) errs.files = "Some selected files exceed 50MB";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Upload helper (runs on submit)
  async function uploadSelected(
    kind: "cad" | "pdf" | "certificate",
    files: File[]
  ): Promise<string[]> {
    if (!files.length) return [];

    // Create FormData and append files and metadata
    const formData = new FormData();

    // Add plan and category info
    formData.append("planNumber", form.planNumber);
    formData.append("category", kind);

    // Add files with their metadata
    files.forEach((file, index) => {
      formData.append(`file-${index}`, file);
      // Encode the filename to handle special characters
      formData.append(`filename-${index}`, encodeURIComponent(file.name));
      formData.append(
        `filetype-${index}`,
        file.type || "application/octet-stream"
      );
    });

    try {
      // This will handle the upload and return the public URLs
      const targets = await getSurfboardUploadTargetsMulti(formData);

      // Return the public URLs of the uploaded files
      return targets.map((target) => target.publicUrl);
    } catch (error) {
      console.error("Error uploading files:", error);
      throw new Error(
        `Failed to upload ${kind} files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async function onSubmit() {
    if (!validateReq()) return;
    setBusy(true);
    try {
      // Upload all selected files now (deferred uploads)
      const [newCadUrls, newPdfUrls, newCertUrls] = await Promise.all([
        uploadSelected("cad", selectedCadFiles),
        uploadSelected("pdf", selectedPdfFiles),
        uploadSelected(
          "certificate",
          certificateReady ? selectedCertFiles : []
        ),
      ]);

      const payload: SurfboardPlanDTO = {
        ...form,
        cadFilePaths: [...(form.cadFilePaths || []), ...newCadUrls],
        pdfFilePaths: [...(form.pdfFilePaths || []), ...newPdfUrls],
        certificateFilePaths: [
          ...(form.certificateFilePaths || []),
          ...newCertUrls,
        ],
        status:
          mode === "edit" &&
          (form.certificateFilePaths?.length || 0) + newCertUrls.length > 0
            ? "LODGED"
            : form.status,
      };

      let res: ApiResult<{ id: string; planNumber: string }>;

      if (mode === "create") {
        res = await createPlan(payload);
        if (res.success) {
          toast.success("Plan created");
          // reset selected files after a successful create
          setSelectedCadFiles([]);
          setSelectedPdfFiles([]);
          setSelectedCertFiles([]);
        } else {
          toast.error(res.error || "Create failed");
        }
      } else {
        res = await updatePlan(payload);
        if (res.success) toast.success("Plan updated");
        else toast.error(res.error || "Update failed");
      }

      console.log("res", res);

      if (res.success && res?.data?.planNumber) {
        router.push(`/surfboard/dashboard/plan?plan=${res?.data?.id}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Check if plan number is unique
  const handlePlanNumberBlur = async () => {
    if (!form.planNumber.trim()) return;

    setIsCheckingPlanNumber(true);
    try {
      const exists = await checkPlanNumberExists(
        form.planNumber,
        form.id // This will be undefined for new plans
      );

      if (exists) {
        setErrors((prev) => ({
          ...prev,
          planNumber:
            "This plan number already exists. Please choose a different one.",
        }));
      } else {
        // Clear any existing error if the plan number is now unique
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.planNumber;
          return newErrors;
        });
      }
    } catch (error) {
      console.error("Error checking plan number:", error);
      // Don't block the user if there's an error checking uniqueness
    } finally {
      setIsCheckingPlanNumber(false);
    }
  };

  // Validation respects deferred uploads (checks either existing URLs or selected files)
  function validateReq() {
    const errs: Record<string, string> = {};
    if (!form.planNumber?.trim()) errs.planNumber = "Required";
    if (!form.surveyTitle?.trim()) errs.surveyTitle = "Required";
    if (!form.deededArea?.trim()) errs.deededArea = "Required";
    if (!form.facilitator?.trim()) errs.facilitator = "Required";
    if (!form.pillarType?.trim()) errs.pillarType = "Required";
    if (!form.dateOnSurveyPlan?.trim()) errs.dateOnSurveyPlan = "Required";

    const cadCount = (form.cadFilePaths?.length || 0) + selectedCadFiles.length;
    const pdfCount = (form.pdfFilePaths?.length || 0) + selectedPdfFiles.length;
    if (cadCount < 1) errs.cad = "At least one CAD file is required";
    if (pdfCount < 1) errs.pdf = "At least one PDF file is required";

    if (certificateReady === undefined) {
      errs.certificateReady = "Please select if certificate is ready";
    } else if (certificateReady) {
      const certCount =
        (form.certificateFilePaths?.length || 0) + selectedCertFiles.length;
      if (certCount < 1) errs.cert = "Certificate file required";
      if (!form.dateLodged?.toString()) errs.dateLodged = "Required";
    }

    if (showReferenceField && !form.referencePlanNumber?.trim()) {
      errs.referencePlanNumber = "Required";
    }

    // Basic per-file size check now (uploads run later)
    const overs = [
      ...selectedCadFiles,
      ...selectedPdfFiles,
      ...selectedCertFiles,
    ].filter((f) => f.size > MAX_FILE_BYTES);
    if (overs.length) errs.files = "Some selected files exceed 50MB";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  return (
    <div className="mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {mode === "create" ? "Create New Survey Plan" : "Edit Survey Plan"}
        </h1>
        <p className="text-gray-600 text-sm">
          Upload files on submit, fill plan details, and preview geometry
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[5fr_5fr] gap-8">
        {/* Left — Form */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          {/* Plan Number: plain input (no dropdown) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Number *
            </label>
            <input
              type="text"
              value={form.planNumber}
              onChange={(e) => setField("planNumber", e.target.value)}
              onBlur={handlePlanNumberBlur}
              className={`flex-1 w-full px-3 py-2 border ${
                errors.planNumber ? "border-red-500" : "border-gray-300"
              } rounded-md focus:outline-none focus:ring-2 focus:ring-black`}
              placeholder="Enter plan number"
              disabled={
                (lockNonCert && mode === "edit") || isCheckingPlanNumber
              }
            />
            {isCheckingPlanNumber && (
              <p className="text-sm text-gray-500 mt-1">
                Checking availability...
              </p>
            )}
            {errors.planNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.planNumber}</p>
            )}
          </div>

          {/* Survey Title & Plan Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Survey Title *
              </label>
              <input
                value={form.surveyTitle}
                onChange={(e) => setField("surveyTitle", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                disabled={lockNonCert && mode === "edit"}
              />
              {errors.surveyTitle && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.surveyTitle}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Type *
              </label>
              <select
                value={form.planType}
                onChange={(e) =>
                  setField("planType", e.target.value as PlanType)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                disabled={lockNonCert && mode === "edit"}
              >
                {Object.values(PLAN_TYPES).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference Plan Number */}
          {showReferenceField && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Plan Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.referencePlanNumber ?? ""}
                  onChange={(e) => {
                    // When free text allowed, track both field & query for filtering.
                    if (refFilterConf.allowFreeText) {
                      setRefQuery(e.target.value);
                      setField("referencePlanNumber", e.target.value);
                    }
                  }}
                  onFocus={() => setRefOpen(true)}
                  onBlur={() => {
                    // Give time for click selection before closing
                    setTimeout(() => setRefOpen(false), 120);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black pr-8"
                  placeholder={
                    refFilterConf.allowFreeText
                      ? "Type or select…"
                      : "Select from list"
                  }
                  readOnly={!refFilterConf.allowFreeText}
                />
                {/* Dropdown */}
                {refOpen && (filteredRefOptions?.length || 0) > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    <ul className="py-1">
                      {filteredRefOptions.map((pn) => (
                        <li
                          key={pn}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={() => {
                            // BUGFIX: ensure we write into referencePlanNumber, not planNumber
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
                <p className="text-sm text-red-600 mt-1">
                  {errors.referencePlanNumber}
                </p>
              )}
            </div>
          )}
          {/* Core fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deeded Area *
              </label>
              <input
                value={form.deededArea}
                onChange={(e) => setField("deededArea", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                disabled={lockNonCert && mode === "edit"}
              />
              {errors.deededArea && (
                <p className="text-sm text-red-600 mt-1">{errors.deededArea}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facilitator *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.facilitator}
                  onChange={(e) => setField("facilitator", e.target.value)}
                  onFocus={() => setShowFacilitatorList(true)}
                  onBlur={() =>
                    setTimeout(() => setShowFacilitatorList(false), 200)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  disabled={lockNonCert && mode === "edit"}
                  placeholder="Type or select a facilitator"
                />
                {showFacilitatorList && facilitators.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {facilitators
                      .filter((f) =>
                        f.toLowerCase().includes(form.facilitator.toLowerCase())
                      )
                      .map((f) => (
                        <div
                          key={f}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={() => {
                            setField("facilitator", f);
                            setShowFacilitatorList(false);
                          }}
                        >
                          {f}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {errors.facilitator && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.facilitator}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pillar Type *
              </label>
              <select
                value={form.pillarType}
                onChange={(e) => setField("pillarType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                disabled={lockNonCert && mode === "edit"}
              >
                <option value="">-- Select Pillar Type --</option>
                <option value="REGULAR">REGULAR</option>
                <option value="SPECIAL">SPECIAL</option>
              </select>
              {errors.pillarType && (
                <p className="text-sm text-red-600 mt-1">{errors.pillarType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date on Survey Plan *
              </label>
              <input
                type="date"
                value={form.dateOnSurveyPlan}
                onChange={(e) => setField("dateOnSurveyPlan", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                disabled={lockNonCert && mode === "edit"}
              />
              {errors.dateOnSurveyPlan && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.dateOnSurveyPlan}
                </p>
              )}
            </div>
          </div>

          {/* Certificate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certificate Ready? *
              </label>
              <select
                value={
                  certificateReady === undefined
                    ? ""
                    : certificateReady
                    ? "yes"
                    : "no"
                }
                onChange={(e) => {
                  if (e.target.value === "") {
                    setCertificateReady(undefined);
                  } else {
                    setCertificateReady(e.target.value === "yes");
                  }
                }}
                className={`w-full px-3 py-2 border ${
                  errors.certificateReady ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-black`}
                required
              >
                <option value="">Select Yes or No</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              {errors.certificateReady && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.certificateReady}
                </p>
              )}
            </div>

            {certificateReady && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Lodged *
                </label>
                <input
                  type="date"
                  value={form.dateLodged ?? ""}
                  onChange={(e) => setField("dateLodged", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                {errors.dateLodged && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.dateLodged}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Files (deferred uploads) */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-800">File Uploads</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Pillars CSV File
                </label>
                <input type="file" accept=".csv" onChange={handleCsvUpload} />
                <p className="text-xs text-gray-500 mt-1">
                  Format: PillarNumber,Easting,Northing
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  CAD Files *
                </label>
                <input
                  type="file"
                  multiple
                  disabled={lockNonCert && mode === "edit"}
                  onChange={(e) =>
                    setSelectedCadFiles(Array.from(e.target.files || []))
                  }
                />
                {errors.cad && (
                  <p className="text-sm text-red-600 mt-1">{errors.cad}</p>
                )}
                {/* Existing plus newly selected preview */}
                <ul className="mt-2 text-xs list-disc pl-4">
                  {(form.cadFilePaths || []).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {selectedCadFiles.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  PDF Files *
                </label>
                <input
                  type="file"
                  multiple
                  disabled={lockNonCert && mode === "edit"}
                  onChange={(e) =>
                    setSelectedPdfFiles(Array.from(e.target.files || []))
                  }
                />
                {errors.pdf && (
                  <p className="text-sm text-red-600 mt-1">{errors.pdf}</p>
                )}
                <ul className="mt-2 text-xs list-disc pl-4">
                  {(form.pdfFilePaths || []).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {selectedPdfFiles.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              </div>

              {certificateReady && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Certificate Files *
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setSelectedCertFiles(Array.from(e.target.files || []))
                    }
                  />
                  {errors.cert && (
                    <p className="text-sm text-red-600 mt-1">{errors.cert}</p>
                  )}
                  <ul className="mt-2 text-xs list-disc pl-4">
                    {(form.certificateFilePaths || []).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                    {selectedCertFiles.map((f) => (
                      <li key={f.name}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {errors.files && (
              <p className="text-sm text-red-600">{errors.files}</p>
            )}
          </div>

          {/* Admin Layer */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-800">
              Administrative Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LGA
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.lga || ""}
                  className="w-full p-2 border rounded bg-gray-50"
                  placeholder="Will be set from map"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LCDA
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.lcda || ""}
                  className="w-full p-2 border rounded bg-gray-50"
                  placeholder="Will be set from map"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ward
                </label>
                <input
                  type="text"
                  readOnly
                  value={form.ward || ""}
                  className="w-full p-2 border rounded bg-gray-50"
                  placeholder="Will be set from map"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={onSubmit}
              className="flex-1 bg-black text-white py-3 px-6 rounded-md font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              {busy
                ? "Saving..."
                : mode === "create"
                ? "Create Plan"
                : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Right — Map & Pillar Summary */}
        <div className="space-y-6">
          {pillars.length > 0 && (
            <div className="mt-6 bg-gray-50 border rounded p-4">
              <h3 className="font-medium text-gray-800 mb-2">Pillar Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Total Pillars:</span>
                  <span className="ml-2 font-medium">{pillars.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Geometry:</span>
                  <span className="ml-2 font-medium">
                    {form.geometry ? "Polygon" : "—"}
                  </span>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto mt-2 text-sm">
                {pillars.slice(0, 10).map((p, i) => (
                  <div key={i} className="text-gray-700 py-0.5">
                    {String(p.pillarNumber)}: ({p.easting.toFixed(2)},{" "}
                    {p.northing.toFixed(2)})
                  </div>
                ))}
                {pillars.length > 10 && (
                  <div className="text-sm text-gray-500 italic">
                    …and {pillars.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Map Preview
            </h2>

            <div
              className={`h-[40rem] w-full rounded overflow-auto ${
                pillars?.length > 0 ? "border-4 border-red-700" : "border"
              }`}
            >
              {/* {pillars?.length > 0 ? (
                <ArcGISMap
                  planInfo={{
                    title: "Plan Preview",
                    polygon: {
                      rings: form.geometry?.coordinates,
                      spatialReference: { wkid: 4326 },
                    },
                    color: [255, 0, 0, 0.5],
                  }}
                  pillars={pillars}
                  // onSubmit={handleAdminData}
                  initialCenter={form.geometry?.coordinates?.[0]?.[0]}
                />
              ) : (
                <p className="text-gray-500 text-sm">
                  Please add pillars to the plan to view the map.
                </p>
              )} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
