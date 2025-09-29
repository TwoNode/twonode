"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { format } from "date-fns";
import { getPublicSurfPlanByIdWithSurveyor } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfPageNotFound } from "@/components/pageNotFound/SurfPageNotFound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Ruler,
  User,
  Briefcase,
  Hash,
  FileText,
  Layers,
  Share2,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Map,
  CalendarDays,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { PillarData } from "../../types/surfboardTypes";

const ArcGISMap = dynamic(
  () =>
    import(
      "@/app/(projects)/(surfboard)/surfboard/dashboard/newplan/ArcGISMap"
    ),
  { ssr: false }
);

function DetailItem({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;

  const statusConfig = {
    pending: {
      label: "Pending",
      class: "bg-amber-100 text-amber-800 border-amber-200",
    },
    lodged: {
      label: "Lodged",
      class: "bg-green-100 text-green-800 border-green-200",
    },
    queried: {
      label: "Queried",
      class: "bg-red-100 text-red-800 border-red-200",
    },
    underReview: {
      label: "Under Review",
      class: "bg-blue-100 text-blue-800 border-blue-200",
    },
  };

  const config = statusConfig[
    status.toLowerCase() as keyof typeof statusConfig
  ] || {
    label: status,
    class: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.class}`}
    >
      {config.label}
    </span>
  );
}

function PillarsOverview({ pillars }: { pillars: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!pillars || !Array.isArray(pillars) || pillars.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden border border-slate-200 shadow-sm">
      <CardHeader
        className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Hash className="h-5 w-5 text-cyan-600" />
            Pillars Overview
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-6">
          <div className="space-y-4">
            {pillars.map((pillar: any, index: number) => (
              <div key={index} className="p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium mb-2">Pillar {index + 1}</h4>
                {pillar.coordinates && Array.isArray(pillar.coordinates) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Longitude:</span>
                    <span>{pillar.coordinates[0]?.toFixed(6) || "N/A"}</span>
                    <span className="text-muted-foreground">Latitude:</span>
                    <span>{pillar.coordinates[1]?.toFixed(6) || "N/A"}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function PlanDetails({ planId }: { planId: string }) {
  const [showMap, setShowMap] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapPillars, setMapPillars] = useState<any[]>([]);
  const [initialCenter, setInitialCenter] = useState<[number, number]>([
    6.5244, 3.3792,
  ]); // Default to Lagos

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

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        const res = await getPublicSurfPlanByIdWithSurveyor(planId);
        if (!res.success || !res.data) {
          setError("Plan not found");
          return;
        }
        setPlanData(res.data);

        // Process pillars for the map
        const pillars =
          typeof res.data.pillars === "string"
            ? JSON.parse(res.data.pillars)
            : res.data.pillars || [];

        const processedPillars = pillars.map((p: any, index: number) => ({
          pillarNumber: p.pillarNumber || `Pillar ${index + 1}`,
          easting: p.coordinates?.[0] || 0,
          northing: p.coordinates?.[1] || 0,
          pointIndex: index,
        }));

        setMapPillars(processedPillars);

        // Set initial center from first pillar or use centroid if available
        if (pillars[0]?.coordinates) {
          setInitialCenter([
            pillars[0].coordinates[1],
            pillars[0].coordinates[0],
          ]);
        } else if (
          res.data.centroid &&
          Array.isArray(res.data.centroid) &&
          res.data.centroid.length >= 2
        ) {
          setInitialCenter([res.data.centroid[1], res.data.centroid[0]]);
        }
      } catch (err) {
        console.error("Error fetching plan data:", err);
        setError("Failed to load plan data");
      } finally {
        setLoading(false);
      }
    };

    fetchPlanData();
  }, [planId]);

  if (loading) return <LoadingSkeleton />;
  if (error || !planData) return <SurfPageNotFound />;

  const { user, ...plan } = planData;
  const formattedDate = plan.dateOnSurveyPlan
    ? format(new Date(plan.dateOnSurveyPlan), "MMMM d, yyyy")
    : "Not signed yet";

  const coordinates =
    plan.centroid && Array.isArray(plan.centroid) && plan.centroid.length >= 2
      ? `${plan.centroid[1].toFixed(6)}°N, ${plan.centroid[0].toFixed(6)}°E`
      : null;

  // Parse pillars if available
  let pillars = [];
  try {
    pillars =
      typeof plan.pillars === "string"
        ? JSON.parse(plan.pillars)
        : plan.pillars;
  } catch (e) {
    console.error("Error parsing pillars:", e);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Survey Plan Verification
              </h1>
              <h2 className="text-2xl font-semibold text-slate-700 mt-1">
                {plan.surveyTitle || `Survey Plan ${plan.planNumber}`}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <StatusBadge status={plan.status} />
                <div className="flex items-center text-sm text-slate-600 bg-white/80 px-3 py-1.5 rounded-md border border-slate-100 shadow-sm">
                  <CalendarDays className="h-4 w-4 mr-1.5 text-cyan-600" />
                  {formattedDate !== "Not signed yet"
                    ? `Signed on ${formattedDate}`
                    : "Not signed yet"}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-white hover:bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 font-medium shadow-sm"
                  onClick={() => setShowMap(!showMap)}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {showMap ? "Hide Map" : "View on Map"}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-800 shadow-sm"
                disabled
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-white/80 hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-800 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Map Section */}
        {showMap && (
          <Card className="overflow-hidden border-cyan-200 shadow-md h-[800px] flex flex-col">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-cyan-800">
                  <MapPin className="h-5 w-5" />
                  Survey Plan Location
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Close Map
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative h-[800px] overflow-auto scroll-m-0 webkit-scrollbar scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100">
              {/* Map Section */}
              <div
                className="mb-8 rounded-lg overflow-hidden border border-gray-200"
                style={{ height: "800px" }}
              >
                <ArcGISMap
                  pillars={plan.pillars || []}
                  planInfo={{
                    metadata: {
                      planNumber: plan.planNumber,
                      surveyTitle: plan.surveyTitle,
                      planType: plan.planType,
                      pillarType: plan.pillarType,
                    },
                  }}
                  initialCenter={getMapCenter(plan.pillars || [])}
                  // initialCenter={initialCenter}
                  
                  zoomPadding={{ duration: 1000 }}
                />
              </div>

              {/* <div className="absolute inset-0">
                <ArcGISMap
                  pillars={mapPillars}
                  planInfo={{
                    planNumber: plan.planNumber,
                    surveyTitle: plan.surveyTitle,
                    planType: plan.planType,
                    pillarType: plan.pillarType,
                  }}
                  zoomPadding={{ duration: 1000 }}
                />
              </div> */}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Overview */}
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <Layers className="h-5 w-5 text-cyan-600" />
                  Plan Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <DetailItem
                    icon={Hash}
                    label="Plan Number"
                    value={plan.planNumber}
                    className="border-b pb-3"
                  />
                  {plan.referencePlanNumber &&
                    plan.referencePlanNumber !== "N/A" && (
                      <DetailItem
                        icon={FileText}
                        label="Reference Plan"
                        value={plan.referencePlanNumber}
                        className="border-b pb-3"
                      />
                    )}
                  <DetailItem
                    icon={Layers}
                    label="Plan Type"
                    value={plan.planType || "N/A"}
                    className="border-b pb-3"
                  />
                </div>
                <div className="space-y-4">
                  <DetailItem
                    icon={Ruler}
                    label="Area"
                    value={
                      plan.areaSqM
                        ? `${plan.areaSqM.toLocaleString()} m²`
                        : undefined
                    }
                    className="border-b pb-3"
                  />
                  <DetailItem
                    icon={Ruler}
                    label="Deeded Area"
                    value={plan.deededArea || "N/A"}
                    className="border-b pb-3"
                  />
                  <DetailItem
                    icon={Layers}
                    label="Pillar Type"
                    value={plan.pillarType || "N/A"}
                    className="border-b pb-3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pillars Overview */}
            <PillarsOverview pillars={pillars} />

            {/* Location Details */}
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <MapPin className="h-5 w-5 text-cyan-600" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem
                  icon={MapPin}
                  label="LGA"
                  value={plan.lga || "N/A"}
                />
                <DetailItem
                  icon={MapPin}
                  label="Ward"
                  value={plan.ward || "N/A"}
                />
                {coordinates && (
                  <DetailItem
                    icon={MapPin}
                    label="Coordinates"
                    value={coordinates}
                    className="md:col-span-2"
                  />
                )}
              </CardContent>
            </Card>

            {/* Surveyor Information */}
            {user && (
              <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <User className="h-5 w-5 text-cyan-600" />
                    Surveyor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailItem
                    icon={User}
                    label="Surveyor"
                    value={`${user.firstName} ${user.lastName}`}
                  />
                  <DetailItem
                    icon={Briefcase}
                    label="Company"
                    value={user.companyName || "N/A"}
                  />
                  <DetailItem
                    icon={Hash}
                    label="SURCON Number"
                    value={user.surconRegNumber || "N/A"}
                  />
                  <DetailItem
                    icon={FileText}
                    label="SURCON Name"
                    value={user.surconRegName || "N/A"}
                  />
                </CardContent>
              </Card>
            )}

            {/* Additional Notes */}
            {plan.reasonForWithdrawalAndResubmission && (
              <Card className="overflow-hidden border-destructive/20">
                <CardHeader className="bg-destructive/5 border-b border-destructive/20">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-destructive">
                    <FileText className="h-5 w-5" />
                    Reason for Withdrawal and Resubmission
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-foreground">
                    {plan.reasonForWithdrawalAndResubmission}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan Summary */}
            <Card className="overflow-hidden border border-cyan-100 shadow-sm">
              <CardHeader className="bg-gradient-to-b from-cyan-50 to-white border-b border-cyan-100">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-cyan-800">
                  <FileText className="h-5 w-5" />
                  Plan Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Status
                  </span>
                  <StatusBadge status={plan.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Signed On
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {formattedDate}
                  </span>
                </div>
                {plan.updatedAt && plan.updatedAt !== plan.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Last Updated
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {format(new Date(plan.updatedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 bg-white">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50"
                  disabled
                >
                  <Download className="h-4 w-4" />
                  Download Plan PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50"
                >
                  <Printer className="h-4 w-4" />
                  Print Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/20">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicSurfboardPlan({
  params,
}: {
  params: { id: string };
}) {
  if (!params?.id) {
    return <SurfPageNotFound />;
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PlanDetails planId={params.id} />
    </Suspense>
  );
}

// export const dynamic = "force-dynamic";
