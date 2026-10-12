"use client";

import { MediaLink } from "@/components/media";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  FileType2,
  FileCheck2,
  Download,
  MapPin,
  Share2,
  Edit,
  Trash2,
  X,
  QrCode,
  RefreshCw,
  MapPinIcon,
  AlertTriangle,
  File,
  Lock,
  Paperclip,
  Upload,
  MessageSquare,
  Send,
} from "lucide-react";
import type {
  PillarData,
  Plan,
} from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import { SharePlanModal } from "./SharePlanModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { Loader2 } from "lucide-react";
import MaplibreMap from "../../../components/maps/MaplibreMap";
import Link from "next/link";
import { surfboardApi } from "@/surfboard/apiClient";
import { useConfirm } from "@/hooks/useConfirm";
import { getQrColors, setQrColors } from "@/lib/qrColorPreferences";

interface PlanWithPillars extends Omit<Plan, "pillars"> {
  status: "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW";
  areaSqM?: number | null;
  pdfFilePaths: string[];
  cadFilePaths: string[];
  certificateFilePaths: string[];
  createdAt: Date;
  updatedAt: Date;
  pillars: PillarData[];
  userId?: string | null;
  isOwner?: boolean;
  centroid?: [number, number] | null;
  redCopyStatus?: string | null;
  redCopyFileUrl?: string | null;
}

// Helper to check if plan is locked (submitted for certificate processing)
const isPlanLocked = (plan: PlanWithPillars | null): boolean => {
  if (!plan) return false;
  return !!plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED";
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  surconRegNumber: string | null;
}

interface FileCardProps {
  filePath: string;
  type: "pdf" | "cad" | "cert" | "redcopy";
  onDelete?: () => Promise<void>;
  showDelete?: boolean;
}

const FileCard = ({
  filePath,
  type,
  onDelete,
  showDelete = true,
}: FileCardProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileName = filePath.split("/").pop() || "";
  const isDwg = fileName.toLowerCase().endsWith(".dwg");
  const authenticatedUrl = surfboardApi.files.getViewUrl(filePath);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const getFileIcon = () => {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500 mr-2" />;
      case "redcopy":
        return <FileText className="h-5 w-5 text-rose-600 mr-2" />;
      case "cad":
        return <FileType2 className="h-5 w-5 text-blue-500 mr-2" />;
      case "cert":
        return <FileCheck2 className="h-5 w-5 text-green-500 mr-2" />;
      default:
        return (
          <File className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
        );
    }
  };

  return (
    <div className="border rounded-md p-3 hover:bg-gray-50 relative group">
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0">
          {getFileIcon()}
          <span className="text-sm truncate" title={fileName}>
            {fileName}
          </span>
        </div>

        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-opacity ml-2"
            title="Delete file"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="mt-2 space-x-2">
        {type === "pdf" || type === "cert" || type === "redcopy" ? (
          <MediaLink
            href={authenticatedUrl}
            className="text-sm text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {type === "pdf"
              ? "View PDF"
              : type === "redcopy"
              ? "View Record Copy"
              : "View Certificate"}
          </MediaLink>
        ) : (
          <>
            <a
              href={surfboardApi.files.getDownloadUrl(filePath, fileName)}
              download
              className="text-sm text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
            {!isDwg && (
              <MediaLink
                href={authenticatedUrl}
                className="text-sm text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View
              </MediaLink>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start">
              <div className="shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete File
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this file? This action
                    cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="button"
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${
                  isDeleting ? "bg-red-600" : "bg-gray-200"
                } text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm`}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-white/15 shadow-sm px-4 py-2 bg-white dark:bg-surface text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirm(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SinglePlanDetailsProps {
  planId: string;
}

export default function SinglePlanDetails({ planId }: SinglePlanDetailsProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanWithPillars | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedWith, setSharedWith] = useState<User[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Private per-viewer attachments (Shared Access) — a recipient's own
  // notes/files on a shared plan, never visible to the surveyor or other
  // recipients. Only fetched/shown for non-owner viewers.
  const [viewerAttachments, setViewerAttachments] = useState<
    { id: string; url: string; fileName: string; createdAt: string }[]
  >([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Per-plan Comments — a shared discussion thread visible to the owner and
  // every current recipient (unlike the private attachments above).
  const [comments, setComments] = useState<
    {
      id: string;
      authorId: string;
      authorName: string;
      isOwner: boolean;
      body: string;
      createdAt: string;
      editedAt: string | null;
    }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Default: strong contrast, opaque light, safe quiet zone.
  // Dark/Light color start from whatever the facilitator last picked
  // (lib/qrColorPreferences) so they don't have to re-pick it every time.
  const [qrOptions, setQrOptions] = useState({
    ...getQrColors(),
    minLightAlpha: 0.1, // server clamps alpha >= 0.3
    margin: 4,
    scale: 8,
    forceOpaque: false, // set true to generate JPEG (no alpha at all)
  });

  useEffect(() => {
    setQrColors({
      darkColor: qrOptions.darkColor,
      lightColor: qrOptions.lightColor,
    });
  }, [qrOptions.darkColor, qrOptions.lightColor]);

  function toggleMap() {
    setShowMap((v) => !v);
  }

  // Function to fetch plan data
  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const result = await surfboardApi.plans.get(planId);
      if (result.success) {
        const data = result.data;
        setIsOwner(result?.data?.isOwner || false);
        setSharedWith(data.sharedToUsers || []);
        setPlan({
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          areaSqM: data.areaSqM,
          centroid: data.centroid,
          pillars: Array.isArray(data.pillars)
            ? data.pillars
                .filter(
                  (p: any) => p && typeof p === "object" && "pillarNumber" in p
                )
                .map((p: any) => ({
                  pillarNumber: String(p.pillarNumber || ""),
                  easting: Number(p.easting) || 0,
                  northing: Number(p.northing) || 0,
                  pointIndex:
                    typeof p.pointIndex === "number" ? p.pointIndex : 0,
                  polygonIndex:
                    typeof p.polygonIndex === "number" ? p.polygonIndex : 0,
                }))
            : [],
        });
      } else {
        toast.error(result.error || "Plan not found");
        router.push("/surfboard/dashboard/plans");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load plan details");
      router.push("/surfboard/dashboard/plans");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlanData();
  }, [planId, router]);

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/surfboardplan/${planId}`);
  }, [planId]);

  const fetchViewerAttachments = async () => {
    const result = await surfboardApi.plans.viewerAttachments.list(planId);
    if (result.success) setViewerAttachments(result.data);
  };

  useEffect(() => {
    // Wait for fetchPlanData to resolve the real isOwner value first —
    // isOwner's default (false) would otherwise fire this for the owner
    // too, on every load, always hitting a 403.
    if (!loading && !isOwner) fetchViewerAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, isOwner, loading]);

  const fetchComments = async () => {
    const result = await surfboardApi.plans.comments.list(planId);
    if (result.success) setComments(result.data);
  };

  useEffect(() => {
    fetchComments();
    surfboardApi.profile.get().then((res) => {
      if (res.success) setCurrentUserId(res.data.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const handlePostComment = async () => {
    const body = newComment.trim();
    if (!body) return;
    try {
      setIsPostingComment(true);
      const result = await surfboardApi.plans.comments.add(planId, body);
      if (!result.success)
        throw new Error(result.error || "Failed to post comment");
      setComments((prev) => [...prev, result.data]);
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to post comment"
      );
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await surfboardApi.plans.comments.delete(
        planId,
        commentId
      );
      if (!result.success)
        throw new Error(result.error || "Failed to delete comment");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete comment"
      );
    }
  };

  const handleUploadViewerAttachment = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    try {
      setIsUploadingAttachment(true);
      // Sequential, not Promise.all: the endpoint is single-file (one POST
      // per attachment), and sequential upload gives a stable, readable
      // per-file failure list instead of interleaved errors.
      const uploaded: typeof viewerAttachments = [];
      const failed: string[] = [];
      for (const file of files) {
        try {
          const result = await surfboardApi.plans.viewerAttachments.upload(
            planId,
            file
          );
          if (!result.success)
            throw new Error(result.error || "Failed to upload attachment");
          uploaded.push(result.data);
        } catch (error) {
          console.error(
            `Error uploading viewer attachment "${file.name}":`,
            error
          );
          failed.push(file.name);
        }
      }
      if (uploaded.length > 0) {
        setViewerAttachments((prev) => [...uploaded, ...prev]);
        toast.success(
          uploaded.length === 1
            ? "Attachment added — only you can see this"
            : `${uploaded.length} attachments added — only you can see these`
        );
      }
      if (failed.length > 0) {
        toast.error(`Failed to upload: ${failed.join(", ")}`);
      }
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleDownloadPillarsCsv = () => {
    if (!plan?.pillars || plan.pillars.length === 0) return;
    const headers = ["Pillar Number", "Easting", "Northing"];
    const rows = plan.pillars.map((p) => [
      p.pillarNumber ?? "",
      p.easting ?? "",
      p.northing ?? "",
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.planNumber || planId}-pillars.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteViewerAttachment = async (attachmentId: string) => {
    try {
      const result = await surfboardApi.plans.viewerAttachments.delete(
        planId,
        attachmentId
      );
      if (!result.success)
        throw new Error(result.error || "Failed to delete attachment");
      setViewerAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment removed");
    } catch (error) {
      console.error("Error deleting viewer attachment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete attachment"
      );
    }
  };

  const handleGenerateQrCode = async () => {
    try {
      setIsGeneratingQr(true);
      const res = await surfboardApi.plans.generateQR(planId, qrOptions as any);
      if (res.success) {
        setQrCodeDataUrl(res.data.qrCodeDataUrl);
        setIsQrModalOpen(true);
      } else {
        toast.error(res.error || "Failed to generate QR code");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Handle delete plan
  const handleDelete = async () => {
    if (!plan) return;

    if (
      !(await confirm({
        title: "Delete this plan?",
        description: "This action cannot be undone.",
        confirmLabel: "Delete",
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await surfboardApi.plans.delete(plan.id);
      if (result.success) {
        toast.success("Plan deleted successfully");
        router.push("/surfboard/dashboard/plans");
      } else {
        toast.error(result.error || "Failed to delete plan");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("An error occurred while deleting the plan");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit plan
  const handleEdit = () => {
    if (plan) {
      router.push(`/surfboard/dashboard/plan/edit?planId=${plan.id}`);
    }
  };

  // Recipient marks a shared plan as reviewed
  const handleMarkReviewed = async () => {
    if (!plan) return;

    setIsResponding(true);
    try {
      const result = await surfboardApi.plans.respondToShare(plan.id);
      if (result.success) {
        toast.success("Marked as reviewed");
      } else {
        toast.error(result.error || "Failed to mark plan as reviewed");
      }
    } catch (error) {
      console.error("Error responding to share:", error);
      toast.error("An error occurred while marking the plan as reviewed");
    } finally {
      setIsResponding(false);
    }
  };

  // Calculate center from pillars for the map
  const getMapCenter = (pillars: PillarData[]): [number, number] => {
    if (!pillars || pillars.length === 0) return [6.5244, 3.3792]; // Default to Lagos

    const sum = pillars.reduce(
      (acc, pillar) => {
        return [
          acc[0] + (pillar.easting || 0),
          acc[1] + (pillar.northing || 0),
        ];
      },
      [0, 0]
    );

    return [sum[0] / pillars.length, sum[1] / pillars.length];
  };

  // The actual share/invite API call already happened inside
  // SharePlanModal's own handleAddUser/handleInviteByEmail before this
  // callback fires — this just syncs the parent's local list.
  const handleShareUpdate = (updatedUsers: User[]) => {
    setSharedWith(updatedUsers);
  };

  // Function to handle copying the public URL to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard");
  };

  const handleGeometryDisplay = () => {
    const _plan = plan || ({} as any);

    if (!_plan) return { type: "Polygon", coordinates: [] };

    if (_plan.geometry && typeof _plan.geometry === "string") {
      try {
        const geometry = JSON.parse(_plan.geometry);
        if (geometry.coordinates && Array.isArray(geometry.coordinates)) {
          return geometry;
        }
        return { type: "Polygon", coordinates: [] };
      } catch (error) {
        console.error("Error parsing geometry:", error);
      }
    }

    if (_plan.geometry && typeof _plan.geometry === "object") {
      return _plan.geometry;
    }

    return { type: "Polygon", coordinates: [] };
  };

  const renderQrCodeModal = () => (
    <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            High-contrast with safe background (no full transparency)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white dark:bg-surface rounded-lg border">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>

          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Dark Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrOptions.darkColor}
                    onChange={(e) =>
                      setQrOptions((p) => ({ ...p, darkColor: e.target.value }))
                    }
                    className="h-10 w-10 rounded border"
                  />
                  <Input
                    value={qrOptions.darkColor}
                    onChange={(e) =>
                      setQrOptions((p) => ({ ...p, darkColor: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Light Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrOptions.lightColor}
                    onChange={(e) =>
                      setQrOptions((p) => ({
                        ...p,
                        lightColor: e.target.value,
                      }))
                    }
                    className="h-10 w-10 rounded border"
                  />
                  <Input
                    value={qrOptions.lightColor}
                    onChange={(e) =>
                      setQrOptions((p) => ({
                        ...p,
                        lightColor: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs">Min Light Alpha (0–1):</label>
                  <Input
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={qrOptions.minLightAlpha}
                    onChange={(e) =>
                      setQrOptions((p) => ({
                        ...p,
                        minLightAlpha: Math.max(
                          0,
                          Math.min(1, Number(e.target.value))
                        ),
                      }))
                    }
                    className="w-24"
                  />
                  <label className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={qrOptions.forceOpaque}
                      onChange={(e) =>
                        setQrOptions((p) => ({
                          ...p,
                          forceOpaque: e.target.checked,
                        }))
                      }
                    />
                    JPEG (no alpha)
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Margin (quiet zone)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={12}
                  value={qrOptions.margin}
                  onChange={(e) =>
                    setQrOptions((p) => ({
                      ...p,
                      margin: Math.max(0, Math.min(12, Number(e.target.value))),
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scale</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={qrOptions.scale}
                  onChange={(e) =>
                    setQrOptions((p) => ({
                      ...p,
                      scale: Math.max(1, Math.min(20, Number(e.target.value))),
                    }))
                  }
                />
              </div>
            </div>

            <div className="w-full flex gap-2">
              <Input
                value={publicUrl}
                readOnly
                className="flex-1 text-sm"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsQrModalOpen(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const res = await surfboardApi.plans.generateQR(
                planId,
                qrOptions as any
              );
              if (res.success && res.data)
                setQrCodeDataUrl(res.data.qrCodeDataUrl);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Update
          </Button>
          <Button
            onClick={() => {
              const link = document.createElement("a");
              link.href = qrCodeDataUrl || "";
              link.download = `plan-${plan?.planNumber || "unknown"}-qrcode.${
                qrOptions.forceOpaque ? "jpg" : "png"
              }`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            disabled={!qrCodeDataUrl}
          >
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPlanData();
  };

  const handleDeleteFile = async (
    file: string | File,
    fileType: "cad" | "pdf" | "certificate"
  ) => {
    const INITIALS = (initial: any) => ({
      planNumber: initial?.planNumber ?? "",
      surveyTitle: initial?.surveyTitle ?? "",
      planType: initial?.planType,
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

    try {
      const field = `${fileType}FilePaths` as
        "cadFilePaths" | "pdfFilePaths" | "certificateFilePaths";

      if (typeof file === "string") {
        // It's an existing file URL, delete from S3
        try {
          await surfboardApi.files.deleteSurfboardFile({ url: file });
        } catch (s3Error) {
          console.error(
            "S3 delete failed, proceeding with DB update:",
            s3Error
          );
        }
        await surfboardApi.plans.update(plan!.id, {
          ...INITIALS(plan),
          [field]: plan?.[field].filter((f) => f !== file),
        } as any);
      }

      setPlan((p: any) => ({
        ...p,
        [field]: p?.[field].filter((f: any) => f !== file),
      }));

      // No need to delete newly selected files from S3 as they haven't been uploaded yet
      toast.success(`Deleted ${fileType} file from storage`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${fileType} file:`, error);
      toast.error(`Failed to delete ${fileType} file from storage`);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Plan Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested plan could not be found.
          </p>
          <button
            onClick={() => router.push("/surfboard/dashboard/plans")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to All Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {ConfirmDialog}
      <div className="mb-8">
        <div className="mb-8">
          {/* Header Card with Gradient Background */}
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-surface dark:to-surface rounded-xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-white/10">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* Plan Info */}
                <div className="space-y-2">
                  <div className="inline-block bg-white/80 dark:bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full mb-2 shadow-sm">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Survey Plan
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {plan.planNumber}
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                    {plan.surveyTitle}
                  </p>

                  {/* Plan Type Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                      {plan.planType}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                      {plan.pillarType}
                    </span>
                    {isPlanLocked(plan) && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <span>Refresh</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={toggleMap}
                    className="px-4 py-2 bg-white dark:bg-surface border border-blue-100 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{showMap ? "Hide Map" : "View Map"}</span>
                  </button>

                  {isOwner && (
                    <>
                      <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        <span>Share</span>
                      </button>

                      <button
                        onClick={handleEdit}
                        className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md ${
                          isPlanLocked(plan)
                            ? "bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
                        disabled={isDeleting || isPlanLocked(plan)}
                        title={
                          isPlanLocked(plan)
                            ? "This plan has been submitted and cannot be edited"
                            : "Edit plan"
                        }
                      >
                        {isPlanLocked(plan) ? (
                          <Lock className="w-4 h-4 mr-2" />
                        ) : (
                          <Edit className="w-4 h-4 mr-2" />
                        )}
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={handleDelete}
                        className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md ${
                          isPlanLocked(plan)
                            ? "bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                        disabled={isDeleting || isPlanLocked(plan)}
                        title={
                          isPlanLocked(plan)
                            ? "This plan has been submitted and cannot be deleted"
                            : "Delete plan"
                        }
                      >
                        {isPlanLocked(plan) ? (
                          <Lock className="w-4 h-4 mr-2" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                      </button>
                    </>
                  )}

                  {!isOwner && (
                    <button
                      onClick={handleMarkReviewed}
                      disabled={isResponding}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileCheck2 className="w-4 h-4 mr-2" />
                      <span>
                        {isResponding ? "Marking..." : "Mark Reviewed"}
                      </span>
                    </button>
                  )}

                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateQrCode}
                      disabled={isGeneratingQr}
                      className="h-10 px-4 border-gray-200 dark:border-white/10 hover:bg-gray-50 flex items-center justify-center"
                    >
                      {isGeneratingQr ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Generating</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4 mr-2" />
                          <span>QR Code</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Share Plan Modal */}
        <SharePlanModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          planId={planId}
          sharedWith={sharedWith}
          onShareUpdate={handleShareUpdate}
        />

        {/* Map Section */}
        {!showMap && plan && (
          <div className="bg-white dark:bg-surface rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Map Preview
            </h2>

            <div
              className={`h-160 w-full rounded overflow-auto ${
                plan?.pillars?.length > 0
                  ? "border-4 border-blue-400"
                  : "border"
              }`}
            >
              <MaplibreMap
                processedPillars={plan?.pillars}
                state={plan?.state}
              />
            </div>
          </div>
        )}

        {/* Plan Details */}
        <div className="space-y-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Plan Information Card */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-surface dark:to-surface px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Plan Information
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Plan Number
                    </p>
                    <p className="mt-1 text-gray-900 dark:text-white font-medium">
                      {plan.planNumber}
                    </p>
                    {plan.referencePlanNumber && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Reference Number
                        </p>
                        <p className="mt-1 text-gray-700 dark:text-gray-300">
                          {plan.referencePlanNumber}
                        </p>
                      </div>
                    )}
                    {plan.withdrawalAndResubmissionStatus &&
                      plan.withdrawalAndResubmissionStatus !== "No_Action" && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Withdrawal Status
                          </p>
                          <span
                            className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              plan.withdrawalAndResubmissionStatus ===
                              "Withdrawn"
                                ? "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300"
                                : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            {plan.withdrawalAndResubmissionStatus}
                          </span>
                        </div>
                      )}
                    {/* @ts-ignore - reasonForWithdrawalAndResubmission may not be in PlanWithPillars type yet */}
                    {plan.reasonForWithdrawalAndResubmission && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Reason for Withdrawal
                        </p>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-2 rounded border border-gray-100 dark:border-white/10">
                          {/* @ts-ignore */}
                          {plan.reasonForWithdrawalAndResubmission}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {plan.status.replace("_", " ")}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/10">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Survey Title
                    </p>
                    {/* @ts-ignore */}
                    {plan.parcels &&
                    Array.isArray(plan.parcels) &&
                    plan.parcels.length > 1 ? (
                      <div className="mt-2 space-y-2">
                        {/* @ts-ignore */}
                        {plan.parcels.map((parcel: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-gray-50 dark:bg-white/5 p-2 rounded border border-gray-100 dark:border-white/10"
                          >
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                              Polygon {idx + 1}:{" "}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {parcel.surveyTitle || plan.surveyTitle}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.surveyTitle}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Plan Type
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.planType}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pillar Type
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.pillarType}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Facilitator
                    </p>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                      {plan.facilitator || "N/A"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Date on Plan
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.dateOnSurveyPlan
                          ? new Date(plan.dateOnSurveyPlan).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Date Lodged
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.dateLodged
                          ? new Date(plan.dateLodged).toLocaleDateString()
                          : "Not lodged"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Details Card */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-surface dark:to-surface px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Location Details
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  {plan.ward && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Ward
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.ward}
                      </p>
                    </div>
                  )}
                  {plan.lcda && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        LCDA
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.lcda}
                      </p>
                    </div>
                  )}
                  {plan.lga && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        LGA
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.lga}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/10">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Area
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.areaSqM
                          ? plan.areaSqM < 10000
                            ? `${plan.areaSqM.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })} m²`
                            : `${(plan.areaSqM / 10000).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 2 }
                              )} ha`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Deeded Area
                      </p>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {plan.deededArea || "N/A"}
                      </p>
                    </div>
                  </div>
                  {plan.centroid &&
                    Array.isArray(plan.centroid) &&
                    plan.centroid.length >= 2 && (
                      <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Centroid Coordinates
                        </p>
                        <p className="mt-1 text-gray-700 dark:text-gray-300 font-mono text-sm">
                          {`${typeof plan.centroid[1] === "number" ? plan.centroid[1].toFixed(6) : plan.centroid[1]}°N, ${typeof plan.centroid[0] === "number" ? plan.centroid[0].toFixed(6) : plan.centroid[0]}°E`}
                        </p>
                        <button
                          onClick={() => {
                            if (!plan?.centroid) return;
                            const [lng, lat] = plan.centroid;
                            window.open(
                              `https://www.google.com/maps?q=${lat},${lng}`,
                              "_blank"
                            );
                          }}
                          className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          View on Map
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Timestamps Card */}
            <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="bg-linear-to-r from-purple-50 to-violet-50 dark:from-surface dark:to-surface px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg
                    className="w-5 h-5 text-purple-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Timestamps
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Created
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(plan.createdAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Last Updated
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date(plan.updatedAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {plan.updatedAt !== plan.createdAt
                          ? "Updated"
                          : "Created"}{" "}
                        {plan.updatedAt &&
                          new Date(plan.updatedAt).toDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white dark:bg-surface p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Documents
          </h3>
          <div className="space-y-4">
            {/* PDF Files */}
            {plan.pdfFilePaths?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">PDF Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.pdfFilePaths.map((filePath, index) => (
                    <FileCard
                      key={index}
                      filePath={filePath}
                      type="pdf"
                      onDelete={async () => {
                        await handleDeleteFile(filePath, "pdf");
                      }}
                      showDelete={plan.isOwner}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Certificate Files */}
            {plan.certificateFilePaths?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Certificates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.certificateFilePaths.map((filePath, index) => (
                    <FileCard
                      key={index}
                      filePath={filePath}
                      type="cert"
                      onDelete={async () => {
                        await handleDeleteFile(filePath, "certificate");
                      }}
                      showDelete={plan.isOwner}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CAD Files */}
            {plan.cadFilePaths?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">CAD Files</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.cadFilePaths.map((filePath, index) => (
                    <FileCard
                      key={index}
                      filePath={filePath}
                      type="cad"
                      onDelete={async () => {
                        await handleDeleteFile(filePath, "cad");
                      }}
                      showDelete={plan.isOwner}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Red Copy (Record Copy) for CoD */}
            {plan.redCopyFileUrl && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  Record Copy (Red Copy)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FileCard
                    filePath={plan.redCopyFileUrl}
                    type="redcopy"
                    showDelete={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Private Attachments — recipient-only, never visible to the surveyor or other recipients */}
        {!isOwner && (
          <div className="bg-white dark:bg-surface p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-gray-400" />
                My Private Attachments
              </h3>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer">
                {isUploadingAttachment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Add file
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUploadViewerAttachment}
                  disabled={isUploadingAttachment}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Only visible to you — not the surveyor or anyone else this plan is
              shared with.
            </p>
            {viewerAttachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {viewerAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-3"
                  >
                    <MediaLink
                      href={surfboardApi.files.getViewUrl(attachment.url)}
                      className="flex items-center gap-2 min-w-0 hover:text-blue-600"
                    >
                      <File className="h-4 w-4 shrink-0 text-gray-400" />
                      <span
                        className="text-sm truncate"
                        title={attachment.fileName}
                      >
                        {attachment.fileName}
                      </span>
                    </MediaLink>
                    <button
                      onClick={() =>
                        handleDeleteViewerAttachment(attachment.id)
                      }
                      className="text-gray-400 hover:text-red-600 shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No private attachments yet.
              </p>
            )}
          </div>
        )}

        {/* Comments — shared discussion, visible to the owner and every current recipient */}
        {(isOwner ? sharedWith.length > 0 : true) && (
          <div className="bg-white dark:bg-surface p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              Comments
            </h3>

            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {comment.authorName}
                        </span>
                        {comment.isOwner && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                            Surveyor
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                          {comment.editedAt ? " (edited)" : ""}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-0.5">
                        {comment.body}
                      </p>
                    </div>
                    {comment.authorId === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-600 shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No comments yet — start the discussion.
                </p>
              )}
            </div>

            <div className="flex items-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                maxLength={2000}
                className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePostComment}
                disabled={isPostingComment || !newComment.trim()}
                className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                {isPostingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post
              </button>
            </div>
          </div>
        )}

        {/* Geometry Section */}
        <div className="bg-white dark:bg-surface rounded-lg border border-gray-200 dark:border-white/10 p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <MapPinIcon className="h-5 w-5 text-blue-500 mr-2" />
            Geometry Coordinates
          </h3>

          <div className="bg-gray-50 dark:bg-white/5 rounded-md p-3 border border-gray-100 dark:border-white/10">
            {plan.geometry ? (
              <div className="space-y-4">
                {(() => {
                  const geometry = handleGeometryDisplay();
                  if (!geometry || !geometry.coordinates?.length) {
                    return (
                      <div className="text-gray-500 dark:text-gray-400 italic">
                        No geometry data available
                      </div>
                    );
                  }

                  const boundaries: {
                    label: string;
                    points: [number, number][];
                  }[] = [];

                  if (geometry.type === "Polygon") {
                    geometry.coordinates.forEach(
                      (ring: [number, number][], ringIndex: number) => {
                        if (Array.isArray(ring) && ring.length > 0) {
                          boundaries.push({
                            label:
                              geometry.coordinates.length > 1
                                ? `Boundary Ring ${ringIndex + 1}`
                                : "Boundary",
                            points: ring,
                          });
                        }
                      }
                    );
                  } else if (geometry.type === "MultiPolygon") {
                    geometry.coordinates.forEach(
                      (polygon: [number, number][][], polyIndex: number) => {
                        if (Array.isArray(polygon)) {
                          polygon.forEach(
                            (ring: [number, number][], ringIndex: number) => {
                              if (Array.isArray(ring) && ring.length > 0) {
                                boundaries.push({
                                  label:
                                    polygon.length > 1
                                      ? `Polygon ${polyIndex + 1}, Ring ${ringIndex + 1}`
                                      : `Polygon ${polyIndex + 1}`,
                                  points: ring,
                                });
                              }
                            }
                          );
                        }
                      }
                    );
                  } else {
                    return (
                      <div className="text-gray-500 dark:text-gray-400 italic">
                        Unsupported geometry type: {geometry.type}
                      </div>
                    );
                  }

                  if (boundaries.length === 0) {
                    return (
                      <div className="text-gray-500 dark:text-gray-400 italic">
                        No valid coordinates found
                      </div>
                    );
                  }

                  return boundaries.map((boundary, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono mr-2">
                          {i + 1}
                        </span>
                        {boundary.label}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                          ({boundary.points.length} points)
                        </span>
                      </div>

                      <div className="ml-7 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 rounded-md p-2 max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                          {boundary.points.map((coord, j) => {
                            if (!Array.isArray(coord) || coord.length < 2)
                              return null;
                            const [x, y] = coord;

                            return (
                              <div
                                key={j}
                                className="flex items-center py-1 px-2 hover:bg-gray-50 rounded"
                              >
                                <span className="text-gray-500 dark:text-gray-400 w-5">
                                  {j + 1}.
                                </span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {typeof x === "number"
                                    ? x.toFixed(6)
                                    : String(x)}
                                  ,{" "}
                                  {typeof y === "number"
                                    ? y.toFixed(6)
                                    : String(y)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No boundary coordinates available
              </div>
            )}
          </div>
        </div>

        {/* Pillars Table */}
        <div className="bg-white dark:bg-surface rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Pillars ({plan.pillars?.length || 0})
            </h3>
            {(plan.pillars?.length ?? 0) > 0 && (
              <button
                onClick={handleDownloadPillarsCsv}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pillar #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Easting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Northing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Point Index
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface divide-y divide-gray-200">
                {plan.pillars?.map((pillar, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {pillar.pillarNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {pillar.easting?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {pillar.northing?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {pillar.pointIndex}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {renderQrCodeModal()}
      </div>
    </div>
  );
}
