"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  getAdminBoundaries,
} from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import {
  getSurfboardUploadTargetsMulti,
  deleteSurfboardFileFromS3,
} from "@/app/(projects)/(surfboard)/actions/awsActions";
import {
  generatePolygonFromPillars,
  parseCSVContent,
} from "../utils/surfboardUtils";
import { useRouter } from "next/navigation";
import MaplibreMap from "./maps/MaplibreMap";
import Link from "next/link";
import {
  ChevronLeft,
  File,
  X,
  FileText,
  FileCheck,
  AlertTriangle,
} from "lucide-react";

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
            onClick={onConfirm}
          >
            Delete
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// File list component with delete functionality
interface FileListProps {
  files: Array<string | File>;
  onDelete: (index: number) => void;
  type: "cad" | "pdf" | "cert";
}

const FileList = ({ files, onDelete, type }: FileListProps) => {
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null
  );

  const getFileIcon = (fileName: string) => {
    if (type === "cad") return <File className="w-4 h-4 text-blue-500" />;
    if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
    return <FileCheck className="w-4 h-4 text-green-500" />;
  };

  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteIndex(index);
    setShowConfirmModal(true);
  };

  const confirmDelete = () => {
    if (pendingDeleteIndex !== null) {
      onDelete(pendingDeleteIndex);
      setDeletingIndex(null);
      setShowConfirmModal(false);
      setPendingDeleteIndex(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setPendingDeleteIndex(null);
  };

  const formatFileName = (
    fileName: string
  ): { displayText: string; isUrl: boolean; href?: string } => {
    // Check if it's an S3 URL
    const s3Match = fileName.match(/surfboard\/([^/]+)\/(.+)$/);
    if (s3Match) {
      return {
        displayText: s3Match[2], // Path after user_id
        isUrl: true,
        href: fileName,
      };
    }
    return { displayText: fileName, isUrl: false };
  };

  if (files.length === 0) return null;

  return (
    <>
      <ul className="mt-2 space-y-1">
        {files.map((file, index) => {
          const fileName = typeof file === "string" ? file : file.name;
          const { displayText, isUrl, href } = formatFileName(fileName);

          return (
            <li
              key={fileName + index}
              className="flex items-center justify-between group px-2 py-1 rounded hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {getFileIcon(fileName)}
                {isUrl ? (
                  <Link
                    href={href || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate max-w-xs"
                    title={fileName}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {displayText}
                  </Link>
                ) : (
                  <span
                    className="text-xs text-gray-700 truncate max-w-xs"
                    title={fileName}
                  >
                    {displayText}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => handleDeleteClick(index, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                title="Delete file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Delete File"
        message="Are you sure you want to delete this file? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
};

// ------------------------
// UI helpers (style only)
// ------------------------

const cn = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const labelCls = "block text-sm font-medium text-gray-800 mb-1";
const reqBadge = (
  <span className="text-red-500" aria-hidden="true">
    *
  </span>
);
const helpCls = "mt-1 text-xs text-gray-500";
const errorCls = "mt-1 text-sm text-red-600";

const inputBase =
  "w-full px-3 py-2 border rounded-md outline-none transition focus:ring-2 focus:ring-black focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed bg-white";
const inputBorder = "border-gray-300";
const inputError = "border-red-500 focus:ring-red-600";

const sectionCardBase =
  "bg-white rounded-2xl shadow p-6 space-y-6 border border-gray-100";
const sectionTitle = "text-base font-semibold text-gray-900";
const subtle = "text-sm text-gray-600";

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

// ------------------------

export type Mode = "create" | "edit";

export type SurfboardPlanFormProps = {
  mode: Mode;
  initial?: SurfboardPlanDTO;
  isSuperAdmin?: boolean;
};

const VALID_CAD_EXTENSIONS = [".dwg", ".dxf"];

const INITIALS = (initial: any) => ({
  planNumber: initial?.planNumber ?? "",
  surveyTitle: initial?.surveyTitle ?? "",
  planType: (initial?.planType as PlanType) ?? PLAN_TYPES.DEED,
  referencePlanNumber: initial?.referencePlanNumber ?? "",
  deededArea: initial?.deededArea ?? "",
  facilitator: initial?.facilitator ?? "",
  pillarType: initial?.pillarType ?? "",
  geometry: initial?.geometry ?? null,
  // pillars: initial?.pillars ?? [],
  pdfFilePaths: initial?.pdfFilePaths ?? [],
  cadFilePaths: initial?.cadFilePaths ?? [],
  certificateFilePaths: initial?.certificateFilePaths ?? [],
  dateOnSurveyPlan: initial?.dateOnSurveyPlan ?? "",
  dateLodged: initial?.dateLodged ?? null,
  ward: initial?.ward ?? null,
  lcda: initial?.lcda ?? null,
  lga: initial?.lga ?? null,
  state: initial?.state ?? null,
  isLive: initial?.isLive ?? false,
  id: initial?.id,
  createdAt: initial?.createdAt,
});

export default function SurfboardPlanForm({
  mode,
  initial,
  isSuperAdmin,
}: SurfboardPlanFormProps) {
  const router = useRouter();

  // --- Form state (unchanged) ---
  const [form, setForm] = useState<SurfboardPlanDTO>(() => INITIALS(initial));

  // Certificate logic (unchanged)
  const [certificateReady, setCertificateReady] = useState<boolean | undefined>(
    initial?.certificateFilePaths?.length
      ? true
      : mode === "edit"
      ? false
      : undefined
  );
  const [lockNonCert, setLockNonCert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingPlanNumber, setIsCheckingPlanNumber] = useState(false);

  // 24h lock after mount only (unchanged/commented as provided)
  useEffect(() => {
    // if (mode !== "edit" || isSuperAdmin) return setLockNonCert(false);
    // const created = initial?.createdAt ? new Date(initial.createdAt).getTime() : 0;
    // if (!created) return setLockNonCert(false);
    // setLockNonCert(Date.now() - created > 24 * 60 * 60 * 1000);
  }, [mode, isSuperAdmin, initial?.createdAt]);

  // Facilitators dropdown (unchanged behavior)
  const [facilitators, setFacilitators] = useState<string[]>([]);
  const [showFacilitatorList, setShowFacilitatorList] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await getAllFacilitatorsAndPlanNumbers();
        if (result.success && result.data) {
          setFacilitators(result.data.facilitators);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Pillars (unchanged)
  const [pillars, setPillars] = useState<PillarData[]>([
    ...(initial?.pillars || []),
  ]);

  // Reference Plan Combo (unchanged logic)
  const [refOptions, setRefOptions] = useState<string[]>([]);
  const [refQuery, setRefQuery] = useState("");
  const [refOpen, setRefOpen] = useState(false);
  const refTimeoutRef = useRef<NodeJS.Timeout>();
  const refFilterConf = REFERENCE_FILTERS[form.planType];
  const showReferenceField = refFilterConf.showField;
  const isReferenceRequired = refFilterConf.required;

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

  // Deferred uploads (unchanged)
  const [selectedCadFiles, setSelectedCadFiles] = useState<File[]>([]);
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<File[]>([]);
  const [selectedCertFiles, setSelectedCertFiles] = useState<File[]>([]);

  function setField<K extends keyof SurfboardPlanDTO>(
    key: K,
    val: SurfboardPlanDTO[K]
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Map callback (unchanged)
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

  // CSV upload (unchanged logic)
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
      setPillars(() => parsed);
      const geom = await generatePolygonFromPillars(parsed);

      if (geom) {
        setField("geometry", geom as any);
        try {
          const adminData = await getAdminBoundaries(geom as any);
          if (adminData?.success && adminData.data) {
            setForm((prev) => ({
              ...prev,
              ward: adminData.data.wardname,
              lcda: adminData.data.lcdaname,
              lga: adminData.data.lganame,
              state: adminData.data.statename,
            }));
          }
          console.log(adminData);
        } catch (error) {
          console.error("Error fetching administrative data:", error);
          // why: do not block user if admin lookup fails
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

  // --- Duplicate validator kept as-is to avoid any behavior risk ---
  function ___validateReq() {
    const errs: Record<string, string> = {};
    if (!form.planNumber?.trim()) errs.planNumber = "Required";
    if (!form.surveyTitle?.trim()) errs.surveyTitle = "Required";
    if (!form.deededArea?.trim()) errs.deededArea = "Required";
    if (!form.facilitator?.trim()) errs.facilitator = "Required";
    if (!form.pillarType?.trim()) errs.pillarType = "Required";
    if (!form.dateOnSurveyPlan) errs.dateOnSurveyPlan = "Required";

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

    const overs = [
      ...selectedCadFiles,
      ...selectedPdfFiles,
      ...selectedCertFiles,
    ].filter((f) => f.size > MAX_FILE_BYTES);
    if (overs.length) errs.files = "Some selected files exceed 50MB";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Upload helper (unchanged)
  async function uploadSelected(
    kind: "cad" | "pdf" | "certificate",
    files: File[]
  ): Promise<string[]> {
    if (!files.length) return [];
    const formData = new FormData();
    formData.append("planNumber", form.planNumber);
    formData.append("category", kind);
    files.forEach((file, index) => {
      formData.append(`file-${index}`, file);
      formData.append(`filename-${index}`, encodeURIComponent(file.name));
      formData.append(
        `filetype-${index}`,
        file.type || "application/octet-stream"
      );
    });
    try {
      const targets = await getSurfboardUploadTargetsMulti(formData);
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
    if (mode === "edit") {
      toast.info("Editing plan...");
    } else {
      toast.info("Creating plan...");
    }

    setBusy(true);
    try {
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
        pillars,
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

      if (res.success && res?.data?.id) {
        router.push(`/surfboard/dashboard/plan?planId=${res?.data?.id}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Plan number uniqueness (unchanged)
  const handlePlanNumberBlur = async () => {
    if (!form.planNumber.trim()) return;
    setIsCheckingPlanNumber(true);
    try {
      const exists = await checkPlanNumberExists(form.planNumber, form.id);
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          planNumber:
            "This plan number already exists. Please choose a different one.",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.planNumber;
          return newErrors;
        });
      }
    } catch (error) {
      console.error("Error checking plan number:", error);
    } finally {
      setIsCheckingPlanNumber(false);
    }
  };

  // Primary validator (unchanged behavior)
  function validateReq() {
    const errs: Record<string, string> = {};
    if (!form.planNumber?.trim()) errs.planNumber = "Required";
    if (!form.surveyTitle?.trim()) errs.surveyTitle = "Required";
    if (!form.deededArea?.trim()) errs.deededArea = "Required";
    if (!form.facilitator?.trim()) errs.facilitator = "Required";
    if (!form.pillarType?.trim()) errs.pillarType = "Required";
    console.log(form);
    if (!form.dateOnSurveyPlan) errs.dateOnSurveyPlan = "Required";

    // Add validation for CSV upload (pillars)
    if (pillars.length === 0) {
      errs.pillars = "CSV file with pillar data is required";
    }

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

    const overs = [
      ...selectedCadFiles,
      ...selectedPdfFiles,
      ...selectedCertFiles,
    ].filter((f) => f.size > MAX_FILE_BYTES);
    if (overs.length) errs.files = "Some selected files exceed 50MB";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleGeometryDisplay = () => {
    if (form.geometry && typeof form.geometry === "string") {
      try {
        const geometry = JSON.parse(form.geometry);
        if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
          return geometry;
        }
        return { type: "Polygon", coordinates: [] };
      } catch (error) {
        console.error("Error parsing geometry:", error);
      }
    }

    if (form.geometry && typeof form.geometry === "object") {
      return form.geometry;
    }

    return { type: "Polygon", coordinates: [] };
  };

  const handleDeleteFile = async (
    file: string | File,
    fileType: "cad" | "pdf" | "cert"
  ) => {
    try {
      const field = `${fileType}FilePaths` as
        | "cadFilePaths"
        | "pdfFilePaths"
        | "certificateFilePaths";

      if (typeof file === "string") {
        // It's an existing file URL, delete from S3
        await deleteSurfboardFileFromS3({ url: file });
        await updatePlan({
          ...INITIALS(initial),
          [field]: form[field].filter((f) => f !== file),
        } as any);
      }
      // No need to delete newly selected files from S3 as they haven't been uploaded yet
      toast.success(`Deleted ${fileType} file from storage`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${fileType} file:`, error);
      toast.error(`Failed to delete ${fileType} file from storage`);
      return false;
    }
  };

  return (
    <div className="mx-auto py-0 px-0">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-sm">
        <div className="mx-auto px-4 py-6">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            {mode !== "create" && (
              <Link href={`/surfboard/dashboard/plan?planId=${initial?.id}`}>
                <button className="flex items-center rounded-full p-2 bg-white/10 hover:bg-white/20 focus:bg-white/30">
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
              </Link>
            )}

            {mode === "create" ? (
              "Create New Survey Plan"
            ) : (
              <>
                Edit Survey Plan &nbsp;
                <span className="italic text-[#9ec8ff]">
                  {initial?.surveyTitle}
                </span>
              </>
            )}
          </h1>

          <p className="text-white/80 text-sm">
            Upload files on submit, fill plan details, and preview geometry
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
              {/* Plan Number */}
              <div>
                <label className={labelCls} htmlFor="planNumber">
                  Plan Number {reqBadge}
                </label>
                <div className="relative">
                  <input
                    id="planNumber"
                    type="text"
                    value={form.planNumber}
                    onChange={(e) => {
                      // Remove all spaces from the input
                      const cleanValue = e.target.value.replace(/\s+/g, "");
                      setField("planNumber", cleanValue);
                    }}
                    onBlur={handlePlanNumberBlur}
                    aria-invalid={!!errors.planNumber}
                    aria-describedby={
                      errors.planNumber ? "planNumber-error" : undefined
                    }
                    className={cn(
                      inputBase,
                      errors.planNumber ? inputError : inputBorder,
                      "pr-28"
                    )}
                    placeholder="Enter plan number"
                    disabled={
                      (lockNonCert && mode === "edit") || isCheckingPlanNumber
                    }
                    autoComplete="off"
                    autoFocus
                  />
                  {isCheckingPlanNumber && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      Checking…
                    </span>
                  )}
                </div>
                {errors.planNumber && (
                  <p id="planNumber-error" className={errorCls}>
                    {errors.planNumber}
                  </p>
                )}
              </div>

              {/* Survey Title & Plan Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="surveyTitle">
                    Survey Title {reqBadge}
                  </label>

                  <input
                    id="surveyTitle"
                    value={form.surveyTitle}
                    onChange={(e) => setField("surveyTitle", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.surveyTitle ? inputError : inputBorder
                    )}
                    disabled={lockNonCert && mode === "edit"}
                    placeholder="e.g., Parcel Layout for…"
                  />

                  {errors.surveyTitle && (
                    <p className={errorCls}>{errors.surveyTitle}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls} htmlFor="planType">
                    Plan Type {reqBadge}
                  </label>
                  <select
                    id="planType"
                    value={form.planType}
                    onChange={(e) =>
                      setField("planType", e.target.value as PlanType)
                    }
                    className={cn(inputBase, inputBorder)}
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
            </Section>

            {showReferenceField && (
              <Section
                id="reference-plan"
                step={2}
                title="Reference Plan Number"
                subtitle="Link to an existing plan when required."
                accent="violet"
              >
                <div className="relative">
                  <label className={labelCls} htmlFor="referencePlan">
                    Reference Plan Number {isReferenceRequired && reqBadge}
                  </label>
                  <div className="relative">
                    <input
                      id="referencePlan"
                      type="text"
                      value={form.referencePlanNumber ?? ""}
                      onChange={(e) => {
                        if (refFilterConf.allowFreeText) {
                          setRefQuery(e.target.value);
                          setField("referencePlanNumber", e.target.value);
                        }
                      }}
                      onFocus={() => setRefOpen(true)}
                      onBlur={() => setTimeout(() => setRefOpen(false), 120)}
                      className={cn(inputBase, inputBorder, "pr-8")}
                      placeholder={
                        refFilterConf.allowFreeText
                          ? "Type or select…"
                          : "Select from list"
                      }
                      readOnly={!refFilterConf.allowFreeText}
                      aria-invalid={!!errors.referencePlanNumber}
                      aria-describedby={
                        errors.referencePlanNumber
                          ? "referencePlan-error"
                          : undefined
                      }
                    />
                    {refOpen && (filteredRefOptions?.length || 0) > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        <ul className="py-1">
                          {filteredRefOptions.map((pn, i) => (
                            <li
                              key={pn + i}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              onMouseDown={() => {
                                // why: ensure we set the correct field
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
                    <p id="referencePlan-error" className={errorCls}>
                      {errors.referencePlanNumber}
                    </p>
                  )}
                </div>
              </Section>
            )}

            <Section
              id="core-details"
              step={showReferenceField ? 3 : 2}
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
                    value={form.deededArea}
                    onChange={(e) => setField("deededArea", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.deededArea ? inputError : inputBorder
                    )}
                    disabled={lockNonCert && mode === "edit"}
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
                  <div className="relative">
                    <input
                      id="facilitator"
                      type="text"
                      value={form.facilitator}
                      onChange={(e) => setField("facilitator", e.target.value)}
                      onFocus={() => setShowFacilitatorList(true)}
                      onBlur={() =>
                        setTimeout(() => setShowFacilitatorList(false), 200)
                      }
                      className={cn(
                        inputBase,
                        errors.facilitator ? inputError : inputBorder
                      )}
                      disabled={lockNonCert && mode === "edit"}
                      placeholder="Type or select a facilitator"
                      aria-invalid={!!errors.facilitator}
                    />
                    {showFacilitatorList && facilitators.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {facilitators
                          .filter((f) =>
                            f
                              .toLowerCase()
                              .includes(form.facilitator.toLowerCase())
                          )
                          .map((f) => (
                            <div
                              key={f}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
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
                    <p className={errorCls}>{errors.facilitator}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls} htmlFor="pillarType">
                    Pillar Type {reqBadge}
                  </label>
                  <select
                    id="pillarType"
                    value={form.pillarType}
                    onChange={(e) => setField("pillarType", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.pillarType ? inputError : inputBorder
                    )}
                    disabled={lockNonCert && mode === "edit"}
                  >
                    <option value="">-- Select Pillar Type --</option>
                    <option value="REGULAR">REGULAR</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                  {errors.pillarType && (
                    <p className={errorCls}>{errors.pillarType}</p>
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
                      form.dateOnSurveyPlan &&
                      typeof form.dateOnSurveyPlan == "object"
                        ? new Date(form.dateOnSurveyPlan)
                            ?.toISOString()
                            .split("T")[0]
                        : form.dateOnSurveyPlan
                    }
                    onChange={(e) =>
                      setField("dateOnSurveyPlan", e.target.value)
                    }
                    className={cn(
                      inputBase,
                      errors.dateOnSurveyPlan ? inputError : inputBorder
                    )}
                    disabled={lockNonCert && mode === "edit"}
                  />
                  {errors.dateOnSurveyPlan && (
                    <p className={errorCls}>{errors.dateOnSurveyPlan}</p>
                  )}
                </div>
              </div>
            </Section>

            <Section
              id="certificate"
              step={showReferenceField ? 4 : 3}
              title="Certificate"
              subtitle="Specify if available and attach when ready."
              accent="emerald"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="certificateReady">
                    Certificate Ready? {reqBadge}
                  </label>
                  <select
                    id="certificateReady"
                    value={
                      certificateReady === undefined
                        ? ""
                        : certificateReady
                        ? "yes"
                        : "no"
                    }
                    onChange={(e) => {
                      if (e.target.value === "") setCertificateReady(undefined);
                      else setCertificateReady(e.target.value === "yes");
                    }}
                    className={cn(
                      inputBase,
                      errors.certificateReady ? inputError : inputBorder
                    )}
                    required
                  >
                    <option value="">Select Yes or No</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {errors.certificateReady && (
                    <p className={errorCls}>{errors.certificateReady}</p>
                  )}
                </div>

                {certificateReady && (
                  <div>
                    <label className={labelCls} htmlFor="dateLodged">
                      Date Lodged {reqBadge}
                    </label>

                    <input
                      id="dateLodged"
                      type="date"
                      value={
                        form?.dateLodged && typeof form.dateLodged == "object"
                          ? new Date(form.dateLodged)
                              ?.toISOString()
                              .split("T")[0]
                          : form?.dateLodged ?? ""
                      }
                      onChange={(e) => setField("dateLodged", e.target.value)}
                      className={cn(
                        inputBase,
                        errors.dateLodged ? inputError : inputBorder
                      )}
                      disabled={lockNonCert && mode === "edit"}
                    />
                    {errors.dateLodged && (
                      <p className={errorCls}>{errors.dateLodged}</p>
                    )}
                  </div>
                )}
              </div>
            </Section>

            <Section
              id="files"
              step={showReferenceField ? 5 : 4}
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
                    disabled={lockNonCert && mode === "edit"}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const invalidFiles = files.filter(
                        (file) =>
                          !VALID_CAD_EXTENSIONS.some((ext) =>
                            file.name.toLowerCase().endsWith(ext)
                          )
                      );

                      if (invalidFiles.length > 0) {
                        toast.error(
                          `Invalid file type. Only ${VALID_CAD_EXTENSIONS.join(
                            ", "
                          )} files are allowed.`
                        );
                        // Clear the input
                        e.target.value = "";
                        return;
                      }
                      setSelectedCadFiles(files);
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {errors.cad && <p className={errorCls}>{errors.cad}</p>}
                  <p className={helpCls}>
                    Allowed formats: {VALID_CAD_EXTENSIONS.join(", ")}
                  </p>
                  <FileList
                    files={[...(form.cadFilePaths || []), ...selectedCadFiles]}
                    onDelete={async (index) => {
                      const allFiles = [
                        ...(form.cadFilePaths || []),
                        ...selectedCadFiles,
                      ];
                      const fileToDelete = allFiles[index];
                      if (typeof fileToDelete === "string") {
                        const deleteSuccess = await handleDeleteFile(
                          fileToDelete,
                          "cad"
                        );
                        if (!deleteSuccess) return;
                        setForm((prev) => ({
                          ...prev,
                          cadFilePaths: prev.cadFilePaths?.filter(
                            (f) => f !== fileToDelete
                          ),
                        }));
                      } else {
                        const selectedIndex =
                          index - (form.cadFilePaths?.length || 0);
                        setSelectedCadFiles((prev) =>
                          prev.filter((_, i) => i !== selectedIndex)
                        );
                      }
                    }}
                    type="cad"
                  />
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
                    disabled={lockNonCert && mode === "edit"}
                    onChange={(e) =>
                      setSelectedPdfFiles(Array.from(e.target.files || []))
                    }
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {errors.pdf && <p className={errorCls}>{errors.pdf}</p>}
                  <FileList
                    files={[...(form.pdfFilePaths || []), ...selectedPdfFiles]}
                    onDelete={async (index) => {
                      const allFiles = [
                        ...(form.pdfFilePaths || []),
                        ...selectedPdfFiles,
                      ];
                      const fileToDelete = allFiles[index];
                      if (typeof fileToDelete === "string") {
                        const deleteSuccess = await handleDeleteFile(
                          fileToDelete,
                          "pdf"
                        );
                        if (!deleteSuccess) return;
                        setForm((prev) => ({
                          ...prev,
                          pdfFilePaths: prev.pdfFilePaths?.filter(
                            (f) => f !== fileToDelete
                          ),
                        }));
                      } else {
                        const selectedIndex =
                          index - (form.pdfFilePaths?.length || 0);
                        setSelectedPdfFiles((prev) =>
                          prev.filter((_, i) => i !== selectedIndex)
                        );
                      }
                    }}
                    type="pdf"
                  />
                </div>

                {/* Certificate Files */}
                {certificateReady && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor="certFiles">
                      Certificate Files {reqBadge}
                    </label>
                    <input
                      id="certFiles"
                      type="file"
                      multiple
                      onChange={(e) =>
                        setSelectedCertFiles(Array.from(e.target.files || []))
                      }
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                    />
                    {errors.cert && <p className={errorCls}>{errors.cert}</p>}
                    <FileList
                      files={[
                        ...(form.certificateFilePaths || []),
                        ...selectedCertFiles,
                      ]}
                      onDelete={async (index) => {
                        const allFiles = [
                          ...(form.certificateFilePaths || []),
                          ...selectedCertFiles,
                        ];
                        const fileToDelete = allFiles[index];
                        if (typeof fileToDelete === "string") {
                          const deleteSuccess = await handleDeleteFile(
                            fileToDelete,
                            "cert"
                          );
                          if (!deleteSuccess) return;
                          setForm((prev) => ({
                            ...prev,
                            certificateFilePaths:
                              prev.certificateFilePaths?.filter(
                                (f) => f !== fileToDelete
                              ),
                          }));
                        } else {
                          const selectedIndex =
                            index - (form.certificateFilePaths?.length || 0);
                          setSelectedCertFiles((prev) =>
                            prev.filter((_, i) => i !== selectedIndex)
                          );
                        }
                      }}
                      type="cert"
                    />
                  </div>
                )}
              </div>
              {errors.files && <p className={errorCls}>{errors.files}</p>}
            </Section>

            <Section
              id="admin"
              step={showReferenceField ? 6 : 5}
              title="Administrative Information"
              subtitle="Upload a CSV file with pillar data (required). Fields will be auto-populated."
              accent="rose"
            >
              <div>
                <label className={labelCls} htmlFor="pillarsCsv">
                  Pillars CSV File {reqBadge}
                </label>
                <input
                  id="pillarsCsv"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className={cn(
                    "block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100",
                    errors.pillars ? "border-red-500" : ""
                  )}
                />
                {errors.pillars && <p className={errorCls}>{errors.pillars}</p>}
                <p className={helpCls}>
                  Upload a CSV file containing pillar coordinates (at least 3
                  points required)
                </p>
                {pillars.length > 0 && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {pillars.length} pillars loaded successfully
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label
                    className={cn(labelCls, !form.ward && "text-gray-400")}
                  >
                    Ward
                  </label>
                  <input
                    type="text"
                    value={form.ward || ""}
                    placeholder="Will be set from CSV Upload"
                    readOnly
                    className={cn(inputBase, "bg-gray-50")}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label
                    className={cn(labelCls, !form.lcda && "text-gray-400")}
                  >
                    LCDA
                  </label>
                  <input
                    type="text"
                    value={form.lcda || ""}
                    readOnly
                    placeholder="Will be set from CSV Upload"
                    className={cn(inputBase, "bg-gray-50")}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className={cn(labelCls, !form.lga && "text-gray-400")}>
                    LGA
                  </label>
                  <input
                    type="text"
                    value={form.lga || ""}
                    readOnly
                    className={cn(inputBase, "bg-gray-50")}
                    placeholder="Will be set from CSV Upload"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label
                    className={cn(labelCls, !form.state && "text-gray-400")}
                  >
                    State
                  </label>
                  <input
                    type="text"
                    value={form.state || ""}
                    onChange={(e) => setField("state", e.target.value)}
                    className={cn(
                      inputBase,
                      errors.state ? inputError : inputBorder
                    )}
                    placeholder="Will be set from CSV Upload"
                  />
                  {errors.state && <p className={errorCls}>{errors.state}</p>}
                </div>
              </div>
            </Section>

            {/* Actions */}
            <Section
              id="actions"
              step={showReferenceField ? 7 : 6}
              title="Save"
              subtitle="Validate and persist your changes."
              accent="blue"
            >
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSubmit}
                  aria-busy={busy}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 w-full",
                    "bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-md font-medium",
                    "shadow hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                  )}
                >
                  {busy
                    ? "Saving..."
                    : mode === "create"
                    ? "Create Plan"
                    : "Save Changes"}
                </button>
              </div>
            </Section>
          </div>

          {/* Right — Map & Pillar Summary */}
          <div className="space-y-6">
            {pillars.length > 0 && (
              <section
                id="pillar-summary"
                aria-labelledby="pillar-summary-title"
                className={cn(
                  sectionCardBase,
                  "border-l-4 border-l-emerald-500"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                      Step {showReferenceField ? 7 : 6}
                    </div>
                    <h3
                      id="pillar-summary-title"
                      className="font-semibold text-gray-900 mt-2"
                    >
                      Pillar Summary
                    </h3>
                  </div>
                  <a
                    href="#pillar-summary"
                    className="text-xs text-gray-400 hover:text-gray-600"
                    aria-label="Anchor link to Pillar Summary"
                  >
                    #
                  </a>
                </div>
                <hr className="border-dashed border-gray-200" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total Pillars:</span>
                    <span className="font-medium text-gray-900">
                      {pillars.length}
                    </span>
                  </div>
                  <div className="flex flex-col  gap-2">
                    <span className="text-gray-600 ">Geometry:</span>

                    <span className="font-medium text-gray-900">
                      {form.geometry ? (
                        <div className="flex flex-col">
                          {handleGeometryDisplay()?.type === "Polygon" &&
                            handleGeometryDisplay()?.coordinates?.map(
                              (coordSet: [number, number][], i: number) => (
                                <div
                                  key={i}
                                  className="max-h-40 overflow-y-auto mt-1 text-xs text-gray-700"
                                >
                                  {handleGeometryDisplay()?.coordinates &&
                                  handleGeometryDisplay()?.coordinates?.length >
                                    1 ? (
                                    <span>
                                      Polygon {i + 1} (
                                      {
                                        handleGeometryDisplay()?.coordinates[i]
                                          ?.length
                                      }{" "}
                                      points):
                                    </span>
                                  ) : (
                                    <span>
                                      Polygon (
                                      {
                                        handleGeometryDisplay()?.coordinates[i]
                                          ?.length
                                      }{" "}
                                      points):
                                    </span>
                                  )}
                                  {coordSet.map(
                                    (coord: [number, number], j: number) => (
                                      <div key={j} className="py-0.5">
                                        Point {j + 1}: ({coord[0].toFixed(6)},{" "}
                                        {coord[1].toFixed(6)})
                                      </div>
                                    )
                                  )}
                                </div>
                              )
                            )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto mt-3 text-sm">
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
              </section>
            )}

            <section
              id="map-preview"
              aria-labelledby="map-preview-title"
              className={cn(sectionCardBase, "border-l-4 border-l-blue-500")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                    Visual
                  </div>
                  <h2
                    id="map-preview-title"
                    className="text-lg font-semibold mt-2 text-gray-900"
                  >
                    Map Preview
                  </h2>
                </div>
                <a
                  href="#map-preview"
                  className="text-xs text-gray-400 hover:text-gray-600"
                  aria-label="Anchor link to Map Preview"
                >
                  #
                </a>
              </div>
              <hr className="border-dashed border-gray-200" />
              <div
                className={cn(
                  "h-[40rem] w-full rounded-lg overflow-hidden",
                  pillars?.length > 0
                    ? "border-4 border-blue-400"
                    : "border border-gray-200"
                )}
              >
                <MaplibreMap processedPillars={pillars} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
