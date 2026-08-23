"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { getGatedPublicSurfPlan } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import { getPlanQRAccessState } from "@/app/(projects)/(surfboard)/actions/qrEarningsActions";
import QRPaywallModal from "@/app/(projects)/(surfboard)/components/QRPaywallModal";
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
  Clock,
  Lock,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Award,
} from "lucide-react";
import { PillarData } from "../../types/surfboardTypes";
import MaplibreMap from "../../components/maps/MaplibreMap";

function DetailItem({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null | React.ReactNode;
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
        <div className="text-base font-medium text-foreground">{value}</div>
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
        className="bg-linear-to-r from-blue-50 to-cyan-50 border-b border-slate-100"
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

/** Service 2 content: shown only when the active session was paid for
 * CERTIFICATE_OF_DEPOSIT. Distinct from the generic Service 1 plan-detail
 * view so a CoD purchase actually surfaces the certificate, not the map. */
function CoDAccessPanel({
  plan,
  isCoDAvailable,
}: {
  plan: any;
  isCoDAvailable: boolean;
}) {
  const certificateFilePaths: string[] = Array.isArray(
    plan.certificateFilePaths,
  )
    ? plan.certificateFilePaths
    : [];

  return (
    <div className="mt-6 max-w-2xl mx-auto">
      <Card className="overflow-hidden border-indigo-200 shadow-md">
        <CardHeader className="bg-linear-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-indigo-800">
            <Award className="h-5 w-5" />
            Certificate of Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={plan.status} />
            <span className="text-sm text-slate-600">
              {plan.surveyTitle || `Survey Plan ${plan.planNumber}`} &middot;
              #{plan.planNumber}
            </span>
          </div>

          {isCoDAvailable && certificateFilePaths.length > 0 ? (
            <div className="space-y-3">
              {certificateFilePaths.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 transition-colors"
                >
                  <FileCheck className="h-5 w-5 text-indigo-600 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-indigo-900">
                    Certificate of Deposit
                    {certificateFilePaths.length > 1 ? ` #${i + 1}` : ""}
                  </span>
                  <Download className="h-4 w-4 text-indigo-500" />
                </a>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">
                No Certificate of Deposit has been lodged for this plan yet.
                Check back once OSSG lodging is complete.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlanDetails({ planId }: { planId: string }) {
  const [showMap, setShowMap] = useState(true);
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
      [0, 0],
    );

    return [sum[0] / pillars.length, sum[1] / pillars.length];
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const token =
    searchParams.get("token") || searchParams.get("access_token") || "";

  const [qrAccessInfo, setQrAccessInfo] = useState<any>(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(
    null,
  );
  const [paywallDefaultService, setPaywallDefaultService] = useState<
    "LOCATION_AUTHENTICITY" | "CERTIFICATE_OF_DEPOSIT" | undefined
  >(undefined);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        const res = await getGatedPublicSurfPlan(planId, token);
        if (!res.success || !res.data) {
          setError("Plan not found");
          return;
        }
        setPlanData(res.data);

        // Fetch QR Access State from the gated response
        const accessRes = (res as any).accessInfo;
        if (accessRes && accessRes.success) {
          setQrAccessInfo(accessRes);
          if (
            accessRes.accessState === "PAYWALL_REQUIRED" ||
            accessRes.accessState === "EXPIRED"
          ) {
            setIsPaywallOpen(true);
          }

          if (accessRes.accessState === "PAID_ACTIVE" && accessRes.expiresAt) {
            const expMs = new Date(accessRes.expiresAt).getTime();
            const nowMs = Date.now();
            const diffSec = Math.max(0, Math.floor((expMs - nowMs) / 1000));
            setSessionSecondsLeft(diffSec);
          }
        }

        // Process pillars for the map
        const pillars =
          typeof res.data.pillars === "string"
            ? JSON.parse(res.data.pillars)
            : res.data.pillars || [];

        const geometry =
          typeof res.data.geometry === "string"
            ? JSON.parse(res.data.geometry)
            : res.data.geometry;

        // Set initial center from first pillar or use centroid if available
        if (geometry && geometry[0]?.coordinates) {
          setInitialCenter([
            geometry[0].coordinates[1],
            geometry[0].coordinates[0],
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
  }, [planId, token]);

  // Session Timer Interval
  useEffect(() => {
    if (sessionSecondsLeft === null || sessionSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSessionSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setQrAccessInfo((prevInfo: any) => ({
            ...prevInfo,
            accessState: "EXPIRED",
          }));
          setIsPaywallOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionSecondsLeft]);

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

  const handlePaymentSuccess = (newToken: string) => {
    setIsPaywallOpen(false);
    router.push(`/surfboardplan/${planId}?token=${newToken}`);
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isAccessDenied =
    qrAccessInfo?.accessState !== "PAID_ACTIVE" &&
    qrAccessInfo?.accessState !== "FREE";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Active Session / Expired Session Banners */}
        {qrAccessInfo?.accessState === "PAID_ACTIVE" && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-200" />
              <span className="font-semibold text-sm">
                Active Paid Session (
                {qrAccessInfo.serviceType === "LOCATION_AUTHENTICITY"
                  ? "Service 1: Location Verification"
                  : "Service 2: Certificate of Deposit"}
                )
              </span>
            </div>
            <div className="flex items-center gap-2">
              {qrAccessInfo.serviceType === "LOCATION_AUTHENTICITY" && (
                <Button
                  onClick={() => {
                    setPaywallDefaultService("CERTIFICATE_OF_DEPOSIT");
                    setIsPaywallOpen(true);
                  }}
                  size="sm"
                  className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold gap-1.5"
                >
                  <Award className="h-4 w-4" />
                  Unlock Certificate of Deposit
                </Button>
              )}
              {sessionSecondsLeft !== null && (
                <div className="flex items-center gap-1.5 bg-emerald-700/80 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                  <Clock className="h-4 w-4 text-emerald-300" />
                  Access Expires In: {formatTimer(sessionSecondsLeft)}
                </div>
              )}
            </div>
          </div>
        )}
        {qrAccessInfo?.accessState === "EXPIRED" && (
          <div className="bg-amber-600 text-white px-4 py-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-200" />
              <span className="font-semibold text-sm">
                Your 1-Hour Access Has Expired
              </span>
            </div>
            <Button
              onClick={() => {
                setPaywallDefaultService(qrAccessInfo?.serviceType);
                setIsPaywallOpen(true);
              }}
              size="sm"
              className="bg-white text-amber-900 hover:bg-amber-100 font-bold"
            >
              Re-Purchase Access
            </Button>
          </div>
        )}
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
        {/* Masked Content if Access Denied */}
        <div
          className={`transition-all duration-500 relative ${isAccessDenied ? "opacity-30 blur-md pointer-events-none select-none" : ""}`}
        >
          {isAccessDenied ? (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2].map((i) => (
                  <Card key={i} className="overflow-hidden border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="space-y-2">
                          <Skeleton className="h-4 w-24 bg-slate-200" />
                          <Skeleton className="h-5 w-full bg-slate-100" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-6">
                <Card className="overflow-hidden border-slate-200">
                  <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-16 bg-slate-200" />
                        <Skeleton className="h-4 w-24 bg-slate-100" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : qrAccessInfo?.serviceType === "CERTIFICATE_OF_DEPOSIT" ? (
            <CoDAccessPanel
              plan={plan}
              isCoDAvailable={qrAccessInfo?.isCoDAvailable ?? false}
            />
          ) : (
            <>
              {/* Map Section */}
              {showMap && (
                <Card className="overflow-hidden border-cyan-200 shadow-md h-200 flex flex-col">
                  <CardHeader className="bg-linear-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 p-4">
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
                  <CardContent className="flex-1 p-0 relative h-200 overflow-auto scroll-m-0 webkit-scrollbar scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100">
                    {/* Map Section */}

                    <div className="bg-white rounded-2xl shadow p-6">
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
                          // processedPillars={mapPillars || []}
                          processedPillars={plan?.pillars}
                          state={plan?.state}
                        />
                      </div>
                    </div>

                    {/* <div className="absolute inset-0">
    
              </div> */}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Plan Overview */}
                  <Card className="overflow-hidden border border-slate-200 shadow-sm">
                    <CardHeader className="bg-linear-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
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
                        {plan.withdrawalAndResubmissionStatus &&
                          plan.withdrawalAndResubmissionStatus !==
                            "No_Action" && (
                            <DetailItem
                              icon={FileText}
                              label="Withdrawal Status"
                              value={
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    plan.withdrawalAndResubmissionStatus ===
                                    "Withdrawn"
                                      ? "bg-red-100 text-red-800 border-red-200"
                                      : "bg-blue-100 text-blue-800 border-blue-200"
                                  }`}
                                >
                                  {plan.withdrawalAndResubmissionStatus}
                                </span>
                              }
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
                        {/* <DetailItem
                    icon={Ruler}
                    label="Area"
                    value={
                      plan.areaSqM
                        ? `${plan.areaSqM.toLocaleString()} m²`
                        : undefined
                    }
                    className="border-b pb-3"
                  /> */}
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
                    <CardHeader className="bg-linear-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
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
                          value={
                            <div className="flex flex-col">
                              <span>{coordinates}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!plan.centroid) return;
                                  const [lng, lat] = plan.centroid;
                                  window.open(
                                    `https://www.google.com/maps?q=${lat},${lng}`,
                                    "_blank",
                                  );
                                }}
                                className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline self-start"
                              >
                                View on Google Maps
                                <svg
                                  className="w-3 h-3 ml-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </button>
                            </div>
                          }
                          className="md:col-span-2"
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Surveyor Information */}
                  {user && (
                    <Card className="overflow-hidden border border-slate-200 shadow-sm">
                      <CardHeader className="bg-linear-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
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
                    <CardHeader className="bg-linear-to-b from-cyan-50 to-white border-b border-cyan-100">
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
                    <CardHeader className="bg-linear-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
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
            </>
          )}
        </div>{" "}
        {/* End Masked Content */}
        {/* QR Code Paywall Modal */}
        <QRPaywallModal
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          planId={plan.id}
          planNumber={plan.planNumber}
          isCoDAvailable={qrAccessInfo?.isCoDAvailable ?? false}
          pricing={qrAccessInfo?.pricing}
          onPaymentSuccess={handlePaymentSuccess}
          defaultService={paywallDefaultService}
        />
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

export default function PublicSurfboardPlan({ planId }: { planId: string }) {
  if (!planId) {
    return <SurfPageNotFound />;
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PlanDetails planId={planId} />
    </Suspense>
  );
}

// export const dynamic = "force-dynamic";
