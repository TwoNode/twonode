"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import {
  PillarData,
  PLAN_TYPES,
  PlanType,
  REFERENCE_FILTERS,
  SurfboardPlanDTO,
  MAX_FILE_BYTES,
  ApiResult,
  PILLAR_TYPES,
  PILLAR_TYPE_ADJOINING_FILTERS,
  ParcelInfo,
} from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import {
  createSurfPlan,
  updateSurfPlan,
  searchReferencePlanNumbers,
  getAllFacilitatorsAndPlanNumbers,
  checkPlanNumberExists,
  getAdminBoundaries,
} from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import {
  getSurfboardUploadTargetsMulti,
  deleteSurfboardFileFromS3,
} from "@/app/(projects)/(surfboard)/actions/awsActions";
import { recognizePersonCount } from "@/app/(projects)/(surfboard)/actions/aiExtractionActions";
import {
  generatePolygonFromPillars,
  generateMultiPolygonFromPillarGroups,
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
  Sparkles,
} from "lucide-react";
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
  AIAutofillButtonCompact,
  type AIExtractedData,
} from "./AIAutofillButton";
import { SubmitConfirmationModal } from "./SubmitConfirmationModal";

// Confirmation Modal Component using shadcn AlertDialog
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
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {message}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    null,
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
    fileName: string,
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
              badgeMap[accent],
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
  onSuccess?: () => void;
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
  locality: initial?.locality ?? "",
  ward: initial?.ward ?? null,
  lcda: initial?.lcda ?? null,
  lga: initial?.lga ?? null,
  state: initial?.state ?? null,
  isLive: initial?.isLive ?? false,
  id: initial?.id,
  createdAt: initial?.createdAt,
  withdrawalAndResubmissionStatus:
    initial?.withdrawalAndResubmissionStatus ?? "No_Action",
  pillarTypeReferencePlanNumber: initial?.pillarTypeReferencePlanNumber ?? "",
  parcels: initial?.parcels ?? [],
});

export default function SurfboardPlanForm({
  mode,
  initial,
  isSuperAdmin,
  onSuccess,
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
        : undefined,
  );
  const [lockNonCert, setLockNonCert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingPlanNumber, setIsCheckingPlanNumber] = useState(false);

  // Person Count State
  const [personCountAI, setPersonCountAI] = useState<number | null>(null);
  const [personCountManual, setPersonCountManual] = useState<number>(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // --- MultiPolygon State ---
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [pillarGroups, setPillarGroups] = useState<PillarData[][]>([]);
  const [parcels, setParcels] = useState<ParcelInfo[]>(
    () => initial?.parcels || [],
  );
  const [useSameTitleForAll, setUseSameTitleForAll] = useState(() => {
    // If we have parcels and they have different titles, set to false
    if (initial?.parcels && initial.parcels.length > 1) {
      const titles = initial.parcels.map((p) => p.surveyTitle).filter(Boolean);
      const uniqueTitles = new Set(titles);
      return uniqueTitles.size <= 1;
    }
    return true;
  });

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

  // Pillars (safely handle JSON string from DB)
  const [pillars, setPillars] = useState<PillarData[]>(() => {
    const raw = initial?.pillars;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse pillars JSON:", e);
        return [];
      }
    }
    return [];
  });

  // Adjoining Plan search state
  const [refOptions, setRefOptions] = useState<string[]>([]);
  const [refQuery, setRefQuery] = useState("");
  const [refOpen, setRefOpen] = useState(false);
  const refTimeoutRef = useRef<NodeJS.Timeout>();

  // Populate pillarGroups from pillars on load
  useEffect(() => {
    if (pillars.length > 0 && pillarGroups.length === 0) {
      const groups: Record<number, PillarData[]> = {};
      pillars.forEach((p) => {
        const idx = p.polygonIndex ?? 0;
        if (!groups[idx]) groups[idx] = [];
        groups[idx].push(p);
      });
      const sortedGroups = Object.keys(groups)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => groups[Number(key)]);
      setPillarGroups(sortedGroups);
    }
  }, [pillars, pillarGroups.length]);
  const refFilterConf = REFERENCE_FILTERS[form.planType];
  const showReferenceField = refFilterConf.showField;
  const isReferenceRequired = refFilterConf.required;

  // Adjoining Pillar logic
  const adjoiningFilterConf = PILLAR_TYPE_ADJOINING_FILTERS[form.pillarType];
  const showAdjoiningField = adjoiningFilterConf?.showReferenceField;
  const isAdjoiningRequired = adjoiningFilterConf?.required;

  // Adjoining Ref Plan search state
  const [adjOptions, setAdjOptions] = useState<string[]>([]);
  const [adjQuery, setAdjQuery] = useState("");
  const [adjOpen, setAdjOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await searchReferencePlanNumbers(PLAN_TYPES.DEED); // Use generic search
        setAdjOptions(list || []);
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

  // AI Extraction handler
  const handleAIExtractedData = useCallback(
    (data: AIExtractedData) => {
      // Set AI person count if available
      if (data.personCount) {
        setPersonCountAI(data.personCount);
      }

      // Only autofill empty fields to avoid overwriting user input
      setForm((prev) => ({
        ...prev,
        // Only set if field is empty
        ...(!prev.planNumber &&
          data.planNumber && { planNumber: data.planNumber }),
        // Check if surveyTitle is empty AND if data.surveyTitle is present
        ...(!prev.surveyTitle &&
          data.surveyTitle && { surveyTitle: data.surveyTitle }),
        ...(!prev.deededArea && data.area && { deededArea: data.area }),
        ...(!prev.dateOnSurveyPlan &&
          data.date && { dateOnSurveyPlan: data.date }),
        ...(!prev.locality && data.locality && { locality: data.locality }),
      }));

      // Show what was extracted and applied
      const appliedFields: string[] = [];
      if (data.personCount)
        appliedFields.push(`Person Count (${data.personCount})`);
      if (data.planNumber && !form.planNumber)
        appliedFields.push("Plan Number");
      if (data.surveyTitle && !form.surveyTitle)
        appliedFields.push("Survey Title");
      if (data.area && !form.deededArea) appliedFields.push("Deeded Area");
      if (data.date && !form.dateOnSurveyPlan) appliedFields.push("Date");
      if (data.locality && !form.locality) appliedFields.push("Locality");

      if (appliedFields.length > 0) {
        toast.success(`Autofilled: ${appliedFields.join(", ")}`);
      }

      // Log what could have been extracted but wasn't applied (fields already filled)
      const skippedFields: string[] = [];
      if (data.planNumber && form.planNumber)
        skippedFields.push("Plan Number (already filled)");
      if (data.surveyTitle && form.surveyTitle)
        skippedFields.push("Survey Title (already filled)");
      if (data.area && form.deededArea)
        skippedFields.push("Area (already filled)");
      if (data.date && form.dateOnSurveyPlan)
        skippedFields.push("Date (already filled)");
      if (data.locality && form.locality)
        skippedFields.push("Locality (already filled)");

      if (skippedFields.length > 0) {
        toast.info(`Skipped: ${skippedFields.join(", ")}`);
      }

      // Log coordinates if extracted (for future use with pillar data)
      if (data.coordinates && data.coordinates.length > 0) {
        console.log("AI extracted coordinates:", data.coordinates);
        toast.info(
          `AI also found ${data.coordinates.length} coordinate pairs (check console for details)`,
        );
      }
    },
    [
      form.planNumber,
      form.surveyTitle,
      form.deededArea,
      form.dateOnSurveyPlan,
      form.locality,
    ],
  );

  function setField<K extends keyof SurfboardPlanDTO>(
    key: K,
    val: SurfboardPlanDTO[K],
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Multi-CSV upload logic
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setBusy(true);
    try {
      const newPillarGroups: PillarData[][] = [...pillarGroups];
      const newParcels: ParcelInfo[] = [...parcels];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name} exceeds 50MB`);
          continue;
        }

        const text = await file.text();
        const parsed = parseCSVContent(text);
        if (parsed.length < 3) {
          toast.error(`${file.name} has fewer than 3 pillars`);
          continue;
        }

        const parcelIdx = newPillarGroups.length;
        // Add polygonIndex to each pillar
        const pillarsWithIndex = parsed.map((p) => ({
          ...p,
          polygonIndex: parcelIdx,
        }));
        newPillarGroups.push(pillarsWithIndex);

        // Get admin boundaries for this polygon
        const tempPoly = await generatePolygonFromPillars(pillarsWithIndex);
        const adminData = await getAdminBoundaries(tempPoly as any);

        newParcels.push({
          polygonIndex: parcelIdx,
          surveyTitle: useSameTitleForAll ? form.surveyTitle : "",
          ward: adminData?.success ? adminData.data?.wardname : null,
          lcda: adminData?.success ? adminData.data?.lcdaname : null,
          lga: adminData?.success ? adminData.data?.lganame : null,
          state: adminData?.success ? adminData.data?.statename : null,
          pillarCount: parsed.length,
        });
      }

      if (newPillarGroups.length === 0) return;

      setPillarGroups(newPillarGroups);
      setParcels(newParcels);

      const allPillars = newPillarGroups.flat();
      setPillars(allPillars);

      let geom;
      if (newPillarGroups.length === 1) {
        geom = await generatePolygonFromPillars(newPillarGroups[0]);
      } else {
        geom = await generateMultiPolygonFromPillarGroups(newPillarGroups);
      }

      if (geom) {
        setField("geometry", geom as any);
        // Set primary location fields from the first parcel if not already set
        const first = newParcels[0];
        setForm((prev) => ({
          ...prev,
          ward: prev.ward || first.ward || null,
          lcda: prev.lcda || first.lcda || null,
          lga: prev.lga || first.lga || null,
          state: prev.state || first.state || null,
        }));
      }

      toast.success(
        `Added ${files.length} parcel(s). Total: ${newPillarGroups.length}`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse CSV");
    } finally {
      setBusy(false);
    }
  }

  async function removeParcel(index: number) {
    const nextGroups = pillarGroups.filter((_, i) => i !== index);
    const nextParcels = parcels
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, polygonIndex: i })); // re-index

    // Update polygonIndex in pillars
    const updatedGroups = nextGroups.map((group, i) =>
      group.map((p) => ({ ...p, polygonIndex: i })),
    );

    setPillarGroups(updatedGroups);
    setParcels(nextParcels);

    const allPillars = updatedGroups.flat();
    setPillars(allPillars);

    if (updatedGroups.length === 0) {
      setField("geometry", null);
      return;
    }

    let geom;
    if (updatedGroups.length === 1) {
      geom = await generatePolygonFromPillars(updatedGroups[0]);
    } else {
      geom = await generateMultiPolygonFromPillarGroups(updatedGroups);
    }
    setField("geometry", geom as any);
  }

  // Upload helper (unchanged)
  async function uploadSelected(
    kind: "cad" | "pdf" | "certificate",
    files: File[],
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
        file.type || "application/octet-stream",
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
        }`,
      );
    }
  }

  async function onSubmit() {
    if (!validateReq()) return;

    // Instead of submitting directly, show the confirmation modal
    console.log("Validation passed, showing submit modal");
    setShowSubmitModal(true);
  }

  async function handleConfirmedSubmit() {
    setShowSubmitModal(false);

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
          certificateReady ? selectedCertFiles : [],
        ),
      ]);

      const payload: SurfboardPlanDTO = {
        id: form.id,
        planNumber: form.planNumber,
        surveyTitle: form.surveyTitle,
        planType: form.planType,
        referencePlanNumber: form.referencePlanNumber,
        deededArea: form.deededArea,
        facilitator: form.facilitator,
        pillarType: form.pillarType,
        dateOnSurveyPlan: form.dateOnSurveyPlan,
        ward: form.ward,
        lcda: form.lcda || undefined,
        lga: form.lga,
        state: form.state,
        locality: form.locality,
        geometry: form.geometry,
        personCount: personCountManual, // Include person count
        withdrawalAndResubmissionStatus: form.withdrawalAndResubmissionStatus,
        pillarTypeReferencePlanNumber: form.pillarTypeReferencePlanNumber,
        parcels: parcels,
        dateLodged:
          form.dateLodged ||
          (selectedCertFiles.length > 0 ||
          (form.certificateFilePaths?.length || 0) > 0
            ? new Date().toISOString()
            : undefined),
        pillars: pillars, // Use local pillars state from CSV upload
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
        res = await createSurfPlan(payload);
        if (res.success) {
          toast.success("Plan created");
          setSelectedCadFiles([]);
          setSelectedPdfFiles([]);
          setSelectedCertFiles([]);
        } else {
          toast.error(res.error || "Create failed");
        }
      } else {
        res = await updateSurfPlan(payload);
        if (res.success) toast.success("Plan updated");
        else toast.error(res.error || "Update failed");
      }

      console.log("res", res);

      if (res.success && res?.data?.id) {
        // Call onSuccess callback if provided, otherwise navigate
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/surfboard/dashboard/plan?planId=${res?.data?.id}`);
        }
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

    if (showAdjoiningField && !form.pillarTypeReferencePlanNumber?.trim()) {
      errs.pillarTypeReferencePlanNumber = "Required";
    }

    if (!useSameTitleForAll) {
      const missingTitles = parcels.some((p) => !p.surveyTitle?.trim());
      if (missingTitles) errs.parcels = "All parcels must have a survey title";
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

  // Calculate person count from survey title lines
  const calculatePersonCount = (title: string): number => {
    if (!title) return 0;
    return title.split("\n").filter((line) => line.trim().length > 0).length;
  };

  // Handle title change and debounced recognition check
  const handleSurveyTitleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    index?: number,
  ) => {
    const newVal = e.target.value;
    if (index === undefined) {
      setField("surveyTitle", newVal);
      setPersonCountManual(calculatePersonCount(newVal));

      // If we're using the same title for all, update parcels too
      if (useSameTitleForAll) {
        setParcels((prev) => prev.map((p) => ({ ...p, surveyTitle: newVal })));
      }
    } else {
      // Per-parcel title update
      setParcels((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], surveyTitle: newVal };
        return next;
      });
    }
  };

  // Effect to re-run AI check on title edit if we suspect mismatch?
  // For now, let's just use the manual "recognize" button or implicit check.
  // The user requirement says: "even if a user edits... recognition function will be run"
  // We can do this on blur or use a button to "Verify Count"

  const handleVerifyCount = async () => {
    if (!form.surveyTitle) return;
    setIsRecognizing(true);
    try {
      const res = await recognizePersonCount(form.surveyTitle);
      if (res.success && res.data) {
        setPersonCountAI(res.data.count);
        if (res.data.count !== personCountManual) {
          toast.warning(
            `Note: AI detected ${res.data.count} persons, but you have ${personCountManual} lines.`,
          );
        } else {
          toast.success(`Verified: ${res.data.count} persons detected.`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecognizing(false);
    }
  };

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
    fileType: "cad" | "pdf" | "certificate",
  ) => {
    try {
      const field = `${fileType}FilePaths` as
        | "cadFilePaths"
        | "pdfFilePaths"
        | "certificateFilePaths";

      if (typeof file === "string") {
        // It's an existing file URL, delete from S3
        await deleteSurfboardFileFromS3({ url: file });
        await updateSurfPlan({
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
      <div className="bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-t-sm">
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
        <SubmitConfirmationModal
          isOpen={showSubmitModal}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowSubmitModal(false)}
          data={form}
          personCount={{
            manual: personCountManual,
            ai: personCountAI,
            isValid: personCountAI ? personCountAI === personCountManual : true, // Determine distinct validation logic if needed
          }}
          fileCounts={{
            cad: (form.cadFilePaths?.length || 0) + selectedCadFiles.length,
            pdf: (form.pdfFilePaths?.length || 0) + selectedPdfFiles.length,
            cert:
              (form.certificateFilePaths?.length || 0) +
              selectedCertFiles.length,
          }}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[5fr_5fr] gap-8">
          {/* Left — Form */}
          <div className="space-y-6">
            {/* File Uploads Section - FIRST for AI Autofill workflow */}
            <Section
              id="files"
              step={1}
              title="File Uploads & AI Autofill"
              subtitle="Upload PDF files first, then click 'AI Autofill' to extract form data automatically."
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
                            file.name.toLowerCase().endsWith(ext),
                          ),
                      );

                      if (invalidFiles.length > 0) {
                        toast.error(
                          `Invalid file type. Only ${VALID_CAD_EXTENSIONS.join(
                            ", ",
                          )} files are allowed.`,
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
                          "cad",
                        );
                        if (!deleteSuccess) return;
                        setForm((prev) => ({
                          ...prev,
                          cadFilePaths: prev.cadFilePaths?.filter(
                            (f) => f !== fileToDelete,
                          ),
                        }));
                      } else {
                        const selectedIndex =
                          index - (form.cadFilePaths?.length || 0);
                        setSelectedCadFiles((prev) =>
                          prev.filter((_, i) => i !== selectedIndex),
                        );
                      }
                    }}
                    type="cad"
                  />
                </div>

                {/* PDF */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls} htmlFor="pdfFiles">
                      PDF Files {reqBadge}
                    </label>
                    {/* AI Autofill Button */}
                    {mode === "create" && selectedPdfFiles.length > 0 && (
                      <AIAutofillButtonCompact
                        pdfFiles={selectedPdfFiles}
                        onExtractedData={handleAIExtractedData}
                        disabled={false}
                      />
                    )}
                  </div>
                  <input
                    id="pdfFiles"
                    type="file"
                    multiple
                    accept=".pdf"
                    disabled={lockNonCert && mode === "edit"}
                    onChange={(e) =>
                      setSelectedPdfFiles(Array.from(e.target.files || []))
                    }
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {errors.pdf && <p className={errorCls}>{errors.pdf}</p>}

                  {/* AI Autofill hint when files are selected but in create mode */}
                  {mode === "create" && selectedPdfFiles.length > 0 && (
                    <p className="mt-1 text-xs text-purple-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Click "AI Autofill" to extract Plan Number, Title, Area &
                      Date
                    </p>
                  )}

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
                          "pdf",
                        );
                        if (!deleteSuccess) return;
                        setForm((prev) => ({
                          ...prev,
                          pdfFilePaths: prev.pdfFilePaths?.filter(
                            (f) => f !== fileToDelete,
                          ),
                        }));
                      } else {
                        const selectedIndex =
                          index - (form.pdfFilePaths?.length || 0);
                        setSelectedPdfFiles((prev) =>
                          prev.filter((_, i) => i !== selectedIndex),
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
                            "certificate",
                          );
                          if (!deleteSuccess) return;
                          setForm((prev) => ({
                            ...prev,
                            certificateFilePaths:
                              prev.certificateFilePaths?.filter(
                                (f) => f !== fileToDelete,
                              ),
                          }));
                        } else {
                          const selectedIndex =
                            index - (form.certificateFilePaths?.length || 0);
                          setSelectedCertFiles((prev) =>
                            prev.filter((_, i) => i !== selectedIndex),
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
              id="plan-info"
              step={2}
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
                      "pr-28",
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
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls} htmlFor="surveyTitle">
                      Survey Title {reqBadge}
                    </label>
                    <button
                      type="button"
                      onClick={handleVerifyCount}
                      disabled={isRecognizing || !form.surveyTitle}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {isRecognizing ? (
                        <Sparkles className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Verify Count
                    </button>
                  </div>

                  <textarea
                    id="surveyTitle"
                    value={form.surveyTitle}
                    onChange={(e) => handleSurveyTitleChange(e)}
                    onBlur={() => handleVerifyCount()} // Auto-verify on blur
                    rows={Math.max(2, form.surveyTitle.split("\n").length)}
                    className={cn(
                      inputBase,
                      errors.surveyTitle ? inputError : inputBorder,
                      "min-h-[60px] resize-y",
                    )}
                    disabled={
                      (lockNonCert && mode === "edit") ||
                      (parcels.length > 1 && !useSameTitleForAll)
                    }
                    placeholder={`e.g., \nMR. BABATUNDE TAJUDEEN SHONUBI\nMRS. OGALA TURMAC NDIDI`}
                  />

                  {parcels.length > 1 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={useSameTitleForAll}
                            onChange={() => {
                              setUseSameTitleForAll(true);
                              // Sync current main title to all parcels
                              setParcels((prev) =>
                                prev.map((p) => ({
                                  ...p,
                                  surveyTitle: form.surveyTitle,
                                })),
                              );
                            }}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-sm font-medium">
                            Same title for all parcels
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!useSameTitleForAll}
                            onChange={() => setUseSameTitleForAll(false)}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-sm font-medium">
                            Different title per parcel
                          </span>
                        </label>
                      </div>

                      {!useSameTitleForAll && (
                        <div className="space-y-4">
                          {parcels.map((parcel, idx) => (
                            <div key={idx}>
                              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                Parcel {idx + 1} Survey Title
                              </label>
                              <textarea
                                value={parcel.surveyTitle || ""}
                                onChange={(e) =>
                                  handleSurveyTitleChange(e, idx)
                                }
                                rows={2}
                                className={cn(
                                  inputBase,
                                  inputBorder,
                                  "text-sm",
                                )}
                                placeholder={`Title for Parcel ${idx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className={helpCls}>
                    For multiple owners, please enter each person's name on a{" "}
                    <strong>new line</strong>. Current Count:{" "}
                    <strong>{personCountManual}</strong>
                  </p>

                  {errors.surveyTitle && (
                    <p className={errorCls}>{errors.surveyTitle}</p>
                  )}
                  {errors.parcels && (
                    <p className={errorCls}>{errors.parcels}</p>
                  )}

                  {form.surveyTitle.toUpperCase().includes(" AND ") &&
                    !form.surveyTitle.includes("\n") && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        It looks like there are multiple owners. Please separate
                        them with a new line.
                      </p>
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
                step={3}
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
              step={showReferenceField ? 4 : 3}
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
                      errors.deededArea ? inputError : inputBorder,
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
                        errors.facilitator ? inputError : inputBorder,
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
                              .includes(form.facilitator.toLowerCase()),
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
                      errors.pillarType ? inputError : inputBorder,
                    )}
                    disabled={lockNonCert && mode === "edit"}
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
                      errors.dateOnSurveyPlan ? inputError : inputBorder,
                    )}
                    disabled={lockNonCert && mode === "edit"}
                  />
                  {errors.dateOnSurveyPlan && (
                    <p className={errorCls}>{errors.dateOnSurveyPlan}</p>
                  )}
                </div>

                {showAdjoiningField && (
                  <div className="md:col-span-2">
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
                        value={form.pillarTypeReferencePlanNumber ?? ""}
                        onChange={(e) => {
                          setAdjQuery(e.target.value);
                          setField(
                            "pillarTypeReferencePlanNumber",
                            e.target.value,
                          );
                        }}
                        onFocus={() => setAdjOpen(true)}
                        onBlur={() => setTimeout(() => setAdjOpen(false), 120)}
                        className={cn(
                          inputBase,
                          errors.pillarTypeReferencePlanNumber
                            ? inputError
                            : inputBorder,
                          "pr-8",
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
                    {errors.pillarTypeReferencePlanNumber && (
                      <p className={errorCls}>
                        {errors.pillarTypeReferencePlanNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Locality - Full width field */}
              <div>
                <label className={labelCls} htmlFor="locality">
                  Locality
                </label>
                <input
                  id="locality"
                  type="text"
                  value={form.locality || ""}
                  onChange={(e) => setField("locality", e.target.value)}
                  className={cn(inputBase, inputBorder)}
                  disabled={lockNonCert && mode === "edit"}
                  placeholder="e.g., UNIT 2, BUSH STREET, OFF SUNMOLA STREET, KOSOFE L.G.A."
                />
                <p className={helpCls}>
                  Property address/location (auto-filled from AI extraction if
                  available)
                </p>
              </div>
            </Section>

            <Section
              id="certificate"
              step={showReferenceField ? 5 : 4}
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
                      errors.certificateReady ? inputError : inputBorder,
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
                        form?.dateLodged
                          ? new Date(form.dateLodged)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) => setField("dateLodged", e.target.value)}
                      className={cn(
                        inputBase,
                        errors.dateLodged ? inputError : inputBorder,
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
              id="admin"
              step={showReferenceField ? 7 : 6}
              title="Administrative Information"
              subtitle="Upload CSV file(s) with pillar data. Multiple parcels supported."
              accent="rose"
            >
              <div>
                <label className={labelCls} htmlFor="pillarsCsv">
                  Pillars CSV File(s) {reqBadge}
                </label>
                <input
                  id="pillarsCsv"
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={handleCsvUpload}
                  className={cn(
                    "block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100",
                    errors.pillars ? "border-red-500" : "",
                  )}
                />
                {errors.pillars && <p className={errorCls}>{errors.pillars}</p>}
                <p className={helpCls}>
                  Upload one or more CSV files (at least 3 points per file
                  required)
                </p>

                {parcels.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Loaded Parcels
                    </h4>
                    {parcels.map((parcel, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Parcel {idx + 1} ({parcel.pillarCount} pillars)
                            </p>
                            <p className="text-xs text-gray-500">
                              {parcel.lga || "Unknown LGA"},{" "}
                              {parcel.ward || "Unknown Ward"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParcel(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove parcel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label
                    className={cn(labelCls, !form.ward && "text-gray-400")}
                  >
                    Primary Ward
                  </label>
                  <input
                    type="text"
                    value={form.ward || ""}
                    placeholder="Auto-populated"
                    readOnly
                    className={cn(inputBase, "bg-gray-50")}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label
                    className={cn(labelCls, !form.lcda && "text-gray-400")}
                  >
                    Primary LCDA
                  </label>
                  <input
                    type="text"
                    value={form.lcda || ""}
                    readOnly
                    placeholder="Auto-populated"
                    className={cn(inputBase, "bg-gray-50")}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className={cn(labelCls, !form.lga && "text-gray-400")}>
                    Primary LGA
                  </label>
                  <input
                    type="text"
                    value={form.lga || ""}
                    readOnly
                    className={cn(inputBase, "bg-gray-50")}
                    placeholder="Auto-populated"
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
                    readOnly
                    className={cn(inputBase, "bg-gray-50")}
                    placeholder="Auto-populated"
                  />
                </div>
              </div>
            </Section>

            {/* Actions */}
            <Section
              id="actions"
              step={showReferenceField ? 8 : 7}
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
                    "bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-md font-medium",
                    "shadow hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50",
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
                  "border-l-4 border-l-emerald-500",
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
                          {(() => {
                            const geometry = handleGeometryDisplay();
                            if (!geometry || !geometry.coordinates?.length) {
                              return <span className="text-xs text-gray-500 italic">No coordinates data</span>;
                            }

                            const boundaries: { label: string; points: [number, number][] }[] = [];

                            if (geometry.type === "Polygon") {
                              geometry.coordinates.forEach((ring: [number, number][], ringIndex: number) => {
                                if (Array.isArray(ring) && ring.length > 0) {
                                  boundaries.push({
                                    label: geometry.coordinates.length > 1
                                      ? `Polygon Ring ${ringIndex + 1}`
                                      : "Polygon",
                                    points: ring,
                                  });
                                }
                              });
                            } else if (geometry.type === "MultiPolygon") {
                              geometry.coordinates.forEach((polygon: [number, number][][], polyIndex: number) => {
                                if (Array.isArray(polygon)) {
                                  polygon.forEach((ring: [number, number][], ringIndex: number) => {
                                    if (Array.isArray(ring) && ring.length > 0) {
                                      boundaries.push({
                                        label: polygon.length > 1
                                          ? `Polygon ${polyIndex + 1}, Ring ${ringIndex + 1}`
                                          : `Polygon ${polyIndex + 1}`,
                                        points: ring,
                                      });
                                    }
                                  });
                                }
                              });
                            } else {
                              return <span className="text-xs text-gray-500 italic">Unsupported geometry: {geometry.type}</span>;
                            }

                            return boundaries.map((boundary, i) => (
                              <div
                                key={i}
                                className="max-h-40 overflow-y-auto mt-1 text-xs text-gray-700"
                              >
                                <span>
                                  {boundary.label} ({boundary.points.length} points):
                                </span>
                                {boundary.points.map((coord, j) => {
                                  if (!Array.isArray(coord) || coord.length < 2) return null;
                                  const [x, y] = coord;
                                  return (
                                    <div key={j} className="py-0.5">
                                      Point {j + 1}: ({typeof x === "number" ? x.toFixed(6) : String(x)},{" "}
                                      {typeof y === "number" ? y.toFixed(6) : String(y)})
                                    </div>
                                  );
                                })}
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto mt-3 text-sm space-y-4">
                  {pillarGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                        Parcel {gIdx + 1}
                      </h4>
                      {group.slice(0, 5).map((p, i) => (
                        <div
                          key={i}
                          className="text-gray-700 py-0.5 font-mono text-xs"
                        >
                          {String(p.pillarNumber)}: ({p.easting.toFixed(2)},{" "}
                          {p.northing.toFixed(2)})
                        </div>
                      ))}
                      {group.length > 5 && (
                        <div className="text-xs text-gray-400 italic">
                          …and {group.length - 5} more
                        </div>
                      )}
                    </div>
                  ))}
                  {pillarGroups.length === 0 &&
                    pillars.length > 0 &&
                    pillars.slice(0, 10).map((p, i) => (
                      <div key={i} className="text-gray-700 py-0.5">
                        {String(p.pillarNumber)}: ({p.easting.toFixed(2)},{" "}
                        {p.northing.toFixed(2)})
                      </div>
                    ))}
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
                  "h-160 w-full rounded-lg overflow-hidden",
                  pillars?.length > 0
                    ? "border-4 border-blue-400"
                    : "border border-gray-200",
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
