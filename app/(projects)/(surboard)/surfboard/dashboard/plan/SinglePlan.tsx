"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  FileType2,
  FileCheck2,
  Download,
  ArrowLeft,
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
} from "@/app/(projects)/(surboard)/actions/surfboardActions";
import type { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
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

// Dynamically import the ArcGISMap component with no SSR
const ArcGISMap = dynamic(
  () =>
    import("@/app/(projects)/(surboard)/surfboard/dashboard/newplan/ArcGISMap"),
  { ssr: false }
);

interface PillarData {
  pillarNumber: string;
  easting: number;
  northing: number;
  pointIndex: number;
}

interface PlanWithPillars extends Omit<Plan, "deededArea" | "pillars"> {
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  areaSqM?: number | null;
  pdfFilePath: string | null;
  cadFilePath: string | null;
  certificateFilePath: string | null;
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
  const [qrOptions, setQrOptions] = useState({
    darkColor: '#000000',
    lightColor: '#ffffff00', // Transparent by default
    margin: 1,
    scale: 8,
  });

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
        router.push("/surfboard/dashboard/allplans");
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

  // Toggle map visibility
  const toggleMap = () => {
    setShowMap(!showMap);
  };

  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return;

      try {
        const result = await getSurfPlanById(planId);

        if (result.success && result.data) {
          setIsOwner(result?.data?.isOwner || false);
          setPlan({
            ...result.data,
            createdAt: new Date(result.data.createdAt),
            updatedAt: new Date(result.data.updatedAt),
            areaSqM:
              typeof result.data.deededArea === "number"
                ? result.data.deededArea
                : null,
            centroid: result?.data?.centroid,
            pillars: (() => {
              if (!Array.isArray(result.data.pillars)) return [];
              return result.data.pillars
                .filter(
                  (p): p is PillarData =>
                    p !== null &&
                    typeof p === "object" &&
                    "pillarNumber" in p &&
                    "easting" in p &&
                    "northing" in p
                )
                .map((p) => ({
                  pillarNumber: String(p.pillarNumber || ""),
                  easting: Number(p.easting) || 0,
                  northing: Number(p.northing) || 0,
                  pointIndex:
                    typeof p.pointIndex === "number" ? p.pointIndex : 0,
                }));
            })(),
          });
        } else {
          toast.error(result.error || "Plan not found");
          router.push("/surfboard/dashboard/allplans");
        }
      } catch (error) {
        console.error("Error fetching plan:", error);
        toast.error("Failed to load plan details");
        router.push("/surfboard/dashboard/allplans");
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, router]);

  useEffect(() => {
    getPlanPublicUrl(planId).then((url) => setPublicUrl(url));
  }, [planId]);

  // Fetch shared users for this plan
  useEffect(() => {
    const fetchSharedUsers = async () => {
      try {
        // TODO: Replace with actual API call to fetch shared users
        // const response = await fetch(`/api/plans/${planId}/shared-users`);
        // const data = await response.json();
        // setSharedWith(data);

        // Mock data for now
        setSharedWith([
          // {
          //   id: "1",
          //   firstName: "John",
          //   lastName: "Doe",
          //   surconRegNumber: "ksadf_",
          //   email: "john@example.com",
          // },
          // Add more mock users as needed
        ]);
      } catch (error) {
        console.error("Error fetching shared users:", error);
        toast.error("Failed to load shared users");
      }
    };

    if (planId) {
      fetchSharedUsers();
    }
  }, [planId]);

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

  // Function to handle QR code generation
  const handleGenerateQrCode = async () => {
    try {
      setIsGeneratingQr(true);
      const result = await generatePlanQRCode(planId, qrOptions);

      if (result.success && result.data) {
        setQrCodeDataUrl(result.data.qrCodeDataUrl);
        setIsQrModalOpen(true);
      } else {
        toast.error(result.error || "Failed to generate QR code");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGeneratingQr(false);
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
            Customize and download your QR code
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* QR Code Preview */}
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
                style={{
                  backgroundColor: qrOptions.lightColor === '#ffffff30' ? 'transparent' : qrOptions.lightColor
                }}
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>

          {/* Color Customization */}
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dark Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={qrOptions.darkColor}
                    onChange={(e) => setQrOptions(prev => ({
                      ...prev,
                      darkColor: e.target.value
                    }))}
                    className="h-10 w-10 rounded border border-gray-300"
                  />
                  <Input
                    value={qrOptions.darkColor}
                    onChange={(e) => setQrOptions(prev => ({
                      ...prev,
                      darkColor: e.target.value
                    }))}
                    className="flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Light Color
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={qrOptions.lightColor === '#ffffff30' ? '#ffffff' : qrOptions.lightColor}
                      onChange={(e) => {
                        const color = e.target.value + (qrOptions.lightColor.endsWith('30') ? '30' : '');
                        setQrOptions(prev => ({
                          ...prev,
                          lightColor: color
                        }));
                      }}
                      className="h-10 w-10 rounded border border-gray-300"
                    />
                    {qrOptions.lightColor.endsWith('30') && (
                      <div className="absolute inset-0 border-2 border-red-500 pointer-events-none"></div>
                    )}
                  </div>
                  <div className="flex-1 flex items-center">
                    <Input
                      value={qrOptions.lightColor}
                      onChange={(e) => setQrOptions(prev => ({
                        ...prev,
                        lightColor: e.target.value
                      }))}
                      className="flex-1"
                      placeholder="#ffffff30 (transparent)"
                    />
                    <button
                      onClick={() => setQrOptions(prev => ({
                        ...prev,
                        lightColor: prev.lightColor.endsWith('30')
                          ? prev.lightColor.slice(0, -2)
                          : prev.lightColor + '30'
                      }))}
                      className="ml-2 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                      title={qrOptions.lightColor.endsWith('30') ? "Make opaque" : "Make transparent"}
                    >
                      {qrOptions.lightColor.endsWith('30') ? "Opaque" : "Transparent"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margin
                </label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={qrOptions.margin}
                  onChange={(e) => setQrOptions(prev => ({
                    ...prev,
                    margin: Math.min(10, Math.max(0, parseInt(e.target.value) || 0))
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scale
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={qrOptions.scale}
                  onChange={(e) => setQrOptions(prev => ({
                    ...prev,
                    scale: Math.min(20, Math.max(1, parseInt(e.target.value) || 8))
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="w-full flex space-x-2">
            <Input
              value={publicUrl}
              readOnly
              className="flex-1 text-sm"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsQrModalOpen(false)}
          >
            Close
          </Button>
          <Button
            onClick={async () => {
              // Regenerate QR code with new options
              const result = await generatePlanQRCode(planId, qrOptions);
              if (result.success && result.data) {
                setQrCodeDataUrl(result.data.qrCodeDataUrl);
              }
            }}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update
          </Button>
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.href = qrCodeDataUrl || '';
              link.download = `plan-${plan?.planNumber || 'unknown'}-qrcode.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            disabled={!qrCodeDataUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
            onClick={() => router.push("/surfboard/dashboard/allplans")}
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
        <div className="flex flex-col md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0 mr-auto">
            <h1 className="text-2xl font-bold text-gray-900">
              {plan.planNumber} - {plan.surveyTitle}
            </h1>
            <p className="text-gray-600">
              {plan.planType} • {plan.pillarType}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto ml-auto">
            <button
              onClick={toggleMap}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center flex-1 md:flex-none min-w-[120px]"
            >
              <MapPin className="w-4 h-4 mr-1.5 md:mr-2" />
              <span className="text-sm md:text-base">{showMap ? "Hide Map" : "Show Map"}</span>
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
        {showMap && (
          <div
            className="mb-8 rounded-lg overflow-hidden border border-gray-200"
            style={{ height: "800px" }}
          >
            <ArcGISMap
              pillars={plan.pillars || []}
              planInfo={{
                planNumber: plan.planNumber,
                surveyTitle: plan.surveyTitle,
                planType: plan.planType,
                pillarType: plan.pillarType,
              }}
              initialCenter={getMapCenter(plan.pillars || [])}
              zoomPadding={{ duration: 1000 }}
            />
          </div>
        )}

        {/* Plan Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Plan Information
            </h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Plan Number:</span>{" "}
                {plan.planNumber}
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
                <span className="font-medium">Status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                    plan.status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : plan.status === "REJECTED"
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
