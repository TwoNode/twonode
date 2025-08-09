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
} from "lucide-react";
import {
  getSurfPlanById,
  deleteSurfPlan,
} from "@/app/(projects)/(surboard)/actions/surfboardActions";
import type { Plan } from "@/app/(projects)/(surboard)/types/surfboardTypes";
import dynamic from "next/dynamic";
import { SharePlanModal } from "./SharePlanModal";

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

export default function SinglePlanDetails({ planId }: { planId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanWithPillars | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedWith, setSharedWith] = useState<User[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {plan.planNumber} - {plan.surveyTitle}
            </h1>
            <p className="text-gray-600">
              {plan.planType} • {plan.pillarType}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleMap}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {showMap ? "Hide Map" : "Show Map"}
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Plan
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center"
                  disabled={isDeleting}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
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
                  : 'N/A'}
              </p>
              {plan.centroid && Array.isArray(plan.centroid) && plan.centroid.length >= 2 && (
                <p>
                  <span className="font-medium">Centroid:</span>{" "}
                  {`${plan.centroid[1].toFixed(6)}°N, ${plan.centroid[0].toFixed(6)}°E`}
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
    </div>
  );
}
