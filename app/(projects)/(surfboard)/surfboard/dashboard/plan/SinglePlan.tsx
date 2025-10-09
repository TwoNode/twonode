"use client";

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
  QrCode,
  RefreshCw,
} from "lucide-react";
import {
  getSurfPlanById,
  deleteSurfPlan,
  generatePlanQRCode,
  getPlanPublicUrl,
} from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import type {
  PillarData,
  Plan,
} from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import dynamic from "next/dynamic";
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
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  surconRegNumber: string | null;
}

interface SinglePlanDetailsProps {
  planId: string;
}

export default function SinglePlanDetails({ planId }: SinglePlanDetailsProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanWithPillars | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedWith, setSharedWith] = useState<User[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Default: strong contrast, opaque light, safe quiet zone
  const [qrOptions, setQrOptions] = useState({
    darkColor: "#000000",
    lightColor: "#ffffff",
    minLightAlpha: 0.3, // server clamps alpha >= 0.3
    margin: 4,
    scale: 8,
    forceOpaque: false, // set true to generate JPEG (no alpha at all)
  });

  function toggleMap() {
    setShowMap((v) => !v);
  }

  // Function to fetch plan data
  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const result = await getSurfPlanById(planId);
      if (result.success && result.data) {
        const data = result.data;
        setIsOwner(result?.data?.isOwner || false);
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
    getPlanPublicUrl(planId)
      .then(setPublicUrl)
      .catch(() => {});
  }, [planId]);

  const handleGenerateQrCode = async () => {
    try {
      setIsGeneratingQr(true);
      const res = await generatePlanQRCode(planId, qrOptions as any);
      if (res.success && res.data) {
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
      !confirm(
        "Are you sure you want to delete this plan? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteSurfPlan(plan.id);
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

  const handleShareUpdate = async (updatedUsers: User[]) => {
    try {
      // TODO: Call API to update shared users in the backend
      // const response = await fetch(`/api/plans/${planId}/share`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userIds: updatedUsers.map(u => u.id) })
      // });
      // if (!response.ok) throw new Error('Failed to update shared users');

      setSharedWith(updatedUsers);
      toast.success("Sharing settings updated");
    } catch (error) {
      console.error("Error updating shared users:", error);
      toast.error("Failed to update sharing settings");
    }
  };

  // Function to handle copying the public URL to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied to clipboard");
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
          <div className="p-4 bg-white rounded-lg border">
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
              const res = await generatePlanQRCode(planId, qrOptions as any);
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
          <p className="text-gray-600 mb-6">
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
      <div className="mb-8">
        {/* <div className="flex flex-col md:items-center md:justify-between mb-6">
          <div className="flex flex-col items-center justify-between md:flex-row md:items-start">
            <div className="mb-4 md:mb-0 md:mr-8">
              <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
                {plan.planNumber}
              </h1>
              <h2 className="text-lg font-medium text-gray-600">
                {plan.surveyTitle}
              </h2>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center">
                <div className="flex items-center gap-x-2 text-sm font-medium text-gray-600">
                  <span>{plan.planType}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span>{plan.pillarType}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto ml-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center flex-1 md:flex-none min-w-[100px]"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5 md:mr-2 animate-spin" />
                  <span className="text-sm md:text-base">Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5 md:mr-2" />
                  <span className="text-sm md:text-base">Refresh</span>
                </>
              )}
            </button>
            <button
              onClick={toggleMap}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center flex-1 md:flex-none min-w-[120px]"
            >
              <MapPin className="w-4 h-4 mr-1.5 md:mr-2" />
              <span className="text-sm md:text-base">
                {showMap ? "Hide Map" : "Show Map"}
              </span>
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center flex-1 md:flex-none min-w-[120px]"
                >
                  <Share2 className="w-4 h-4 mr-1.5 md:mr-2" />
                  <span className="text-sm md:text-base">Share</span>
                </button>
                <button
                  onClick={handleEdit}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center justify-center flex-1 md:flex-none min-w-[100px]"
                  disabled={isDeleting}
                >
                  <Edit className="w-4 h-4 mr-1.5 md:mr-2" />
                  <span className="text-sm md:text-base">Edit</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center flex-1 md:flex-none min-w-[100px]"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-1.5 md:mr-2" />
                  <span className="text-sm md:text-base">
                    {isDeleting ? "Deleting..." : "Delete"}
                  </span>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateQrCode}
                  disabled={isGeneratingQr}
                  className="flex-1 md:flex-none min-w-[120px] h-[36px] justify-center"
                >
                  {isGeneratingQr ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5 md:mr-2" />
                      <span className="text-sm md:text-base">Generating</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-1.5 md:mr-2" />
                      <span className="text-sm md:text-base">QR Code</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div> */}

        <div className="mb-8">
          {/* Header Card with Gradient Background */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* Plan Info */}
                <div className="space-y-2">
                  <div className="inline-block bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-2 shadow-sm">
                    <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                      Survey Plan
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {plan.planNumber}
                  </h1>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    {plan.surveyTitle}
                  </p>

                  {/* Plan Type Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {plan.planType}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {plan.pillarType}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
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
                    className="px-4 py-2 bg-white border border-blue-100 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
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
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                        disabled={isDeleting}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                      </button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateQrCode}
                    disabled={isGeneratingQr}
                    className="h-10 px-4 border-gray-200 hover:bg-gray-50 flex items-center justify-center"
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
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Map Preview
            </h2>

            <div
              className={`h-[40rem] w-full rounded overflow-auto ${
                plan?.pillars?.length > 0
                  ? "border-4 border-blue-400"
                  : "border"
              }`}
            >
              <MaplibreMap processedPillars={plan?.pillars} />
            </div>
          </div>
        )}

        {/* Plan Details */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Plan Information
            </h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Plan Number:</span>{" "}
                {plan.planNumber}
                {plan.referencePlanNumber && (
                  <span className="ml-4">
                    <span className="font-medium">Reference:</span>{" "}
                    {plan.referencePlanNumber}
                  </span>
                )}
              </p>
              <p>
                <span className="font-medium">Survey Title:</span>{" "}
                {plan.surveyTitle}
              </p>
              <p>
                <span className="font-medium">Plan Type:</span> {plan.planType}
              </p>
              <p>
                <span className="font-medium">Pillar Type:</span>{" "}
                {plan.pillarType}
              </p>
              <p>
                <span className="font-medium">Facilitator:</span>{" "}
                {plan.facilitator}
              </p>
              <p>
                <span className="font-medium">Deeded Area:</span>{" "}
                {plan.deededArea || "N/A"}
              </p>
              <p>
                <span className="font-medium">Date on Survey Plan:</span>{" "}
                {plan.dateOnSurveyPlan
                  ? new Date(plan.dateOnSurveyPlan).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <span className="font-medium">Date Lodged:</span>{" "}
                {plan.dateLodged
                  ? new Date(plan.dateLodged).toLocaleDateString()
                  : "Not lodged"}
              </p>
              <p>
                <span className="font-medium">Status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                    plan.status === "LODGED"
                      ? "bg-green-100 text-green-800"
                      : plan.status === "QUERIED"
                      ? "bg-red-100 text-red-800"
                      : plan.status === "UNDER_REVIEW"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {plan.status.replace("_", " ")}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Location Details
            </h3>
            <div className="space-y-2">
              {plan?.ward && (
                <p>
                  <span className="font-medium">Ward:</span> {plan.ward}
                </p>
              )}
              {plan?.lcda && (
                <p>
                  <span className="font-medium">LCDA:</span> {plan.lcda}
                </p>
              )}
              {plan?.lga && (
                <p>
                  <span className="font-medium">LGA:</span> {plan.lga}
                </p>
              )}
              <p>
                <span className="font-medium">Area:</span>{" "}
                {plan.areaSqM
                  ? plan.areaSqM < 10000
                    ? `${plan.areaSqM.toFixed(2)} m²`
                    : `${(plan.areaSqM / 10000).toFixed(2)} ha`
                  : "N/A"}
              </p>
              {plan.centroid &&
                Array.isArray(plan.centroid) &&
                plan.centroid.length >= 2 && (
                  <p>
                    <span className="font-medium">Centroid:</span>{" "}
                    {`${plan.centroid[1].toFixed(
                      6
                    )}°N, ${plan.centroid[0].toFixed(6)}°E`}
                  </p>
                )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Timestamps
            </h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Created:</span>{" "}
                {new Date(plan.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Last Updated:</span>{" "}
                {new Date(plan.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div> */}
        {/* Plan Details */}
        <div className="space-y-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Plan Information Card */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
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
                    <p className="text-sm font-medium text-gray-500">
                      Plan Number
                    </p>
                    <p className="mt-1 text-gray-900 font-medium">
                      {plan.planNumber}
                    </p>
                    {plan.referencePlanNumber && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-500">
                          Reference Number
                        </p>
                        <p className="mt-1 text-gray-700">
                          {plan.referencePlanNumber}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {plan.status.replace("_", " ")}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Survey Title
                    </p>
                    <p className="mt-1 text-gray-700">{plan.surveyTitle}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Plan Type
                      </p>
                      <p className="mt-1 text-gray-700">{plan.planType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Pillar Type
                      </p>
                      <p className="mt-1 text-gray-700">{plan.pillarType}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Facilitator
                    </p>
                    <p className="mt-1 text-gray-700">
                      {plan.facilitator || "N/A"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Date on Plan
                      </p>
                      <p className="mt-1 text-gray-700">
                        {plan.dateOnSurveyPlan
                          ? new Date(plan.dateOnSurveyPlan).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Date Lodged
                      </p>
                      <p className="mt-1 text-gray-700">
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
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
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
                      <p className="text-sm font-medium text-gray-500">Ward</p>
                      <p className="mt-1 text-gray-700">{plan.ward}</p>
                    </div>
                  )}
                  {plan.lcda && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">LCDA</p>
                      <p className="mt-1 text-gray-700">{plan.lcda}</p>
                    </div>
                  )}
                  {plan.lga && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">LGA</p>
                      <p className="mt-1 text-gray-700">{plan.lga}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Area</p>
                      <p className="mt-1 text-gray-700">
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
                      <p className="text-sm font-medium text-gray-500">
                        Deeded Area
                      </p>
                      <p className="mt-1 text-gray-700">
                        {plan.deededArea || "N/A"}
                      </p>
                    </div>
                  </div>
                  {plan.centroid &&
                    Array.isArray(plan.centroid) &&
                    plan.centroid.length >= 2 && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-500">
                          Centroid Coordinates
                        </p>
                        <p className="mt-1 text-gray-700 font-mono text-sm">
                          {`${plan.centroid[1].toFixed(
                            6
                          )}°N, ${plan.centroid[0].toFixed(6)}°E`}
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
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
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
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
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
                      <p className="text-sm font-medium text-gray-500">
                        Created
                      </p>
                      <p className="text-sm text-gray-700">
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
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
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
                      <p className="text-sm font-medium text-gray-500">
                        Last Updated
                      </p>
                      <p className="text-sm text-gray-700">
                        {new Date(plan.updatedAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
          <div className="space-y-4">
            {/* PDF Files */}
            {plan.pdfFilePaths?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">PDF Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.pdfFilePaths.map((filePath, index) => (
                    <div
                      key={index}
                      className="border rounded-md p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm truncate">
                          {filePath.split("/").pop()}
                        </span>
                      </div>
                      <a
                        href={filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View PDF
                      </a>
                    </div>
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
                    <div
                      key={index}
                      className="border rounded-md p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <FileCheck2 className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm truncate">
                          {filePath.split("/").pop()}
                        </span>
                      </div>
                      <a
                        href={filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View Certificate
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAD Files */}
            {plan.cadFilePaths?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">CAD Files</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.cadFilePaths.map((filePath, index) => {
                    const fileName = filePath.split("/").pop() || "";
                    const isDwg = fileName.toLowerCase().endsWith(".dwg");

                    return (
                      <div
                        key={index}
                        className="border rounded-md p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          <FileType2 className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="text-sm truncate">{fileName}</span>
                        </div>
                        <div className="mt-2 space-x-2">
                          <a
                            href={filePath}
                            download
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Download
                          </a>
                          {!isDwg && (
                            <a
                              href={filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pillars Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Pillars ({plan.pillars?.length || 0})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pillar #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Easting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Northing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Point Index
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plan.pillars?.map((pillar, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pillar.pillarNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pillar.easting?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pillar.northing?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pillar.pointIndex}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {renderQrCodeModal()}
    </div>
  );
}
