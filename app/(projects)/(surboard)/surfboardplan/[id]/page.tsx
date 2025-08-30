import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { format } from "date-fns";
import { getPublicSurfPlanByIdWithSurveyor } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Metadata } from "next";
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
} from "lucide-react";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getPublicSurfPlanByIdWithSurveyor(params.id);

  if (!res.success || !res.data) {
    return {
      title: "Plan Not Found | Surfboard Plans",
    };
  }

  const { planNumber, surveyTitle, lga, ward } = res.data;

  return {
    title: `Survey Plan ${planNumber} | ${surveyTitle}`,
    description: `Survey plan ${planNumber} for ${surveyTitle} in ${ward}, ${lga}.`,
    openGraph: {
      title: `Survey Plan ${planNumber} | ${surveyTitle}`,
      description: `View survey plan details for ${surveyTitle} in ${ward}, ${lga}.`,
      type: "website",
      url: `https://www.twonodetechnologies.com/surfboardplan/${params.id}`,
    },
  };
}

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

  const statusMap: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    PENDING: { label: "Pending Review", variant: "outline" },
    APPROVED: { label: "Approved", variant: "default" },
    REJECTED: { label: "Rejected", variant: "destructive" },
    UNDER_REVIEW: { label: "Under Review", variant: "secondary" },
  };

  const statusInfo = statusMap[status] || {
    label: status.replace(/_/g, " "),
    variant: "outline" as const,
  };

  return (
    <Badge
      variant={statusInfo.variant}
      className="text-xs font-medium px-2.5 py-1 rounded-full"
    >
      {statusInfo.label}
    </Badge>
  );
}

async function PlanDetails({ planId }: { planId: string }) {
  const res = await getPublicSurfPlanByIdWithSurveyor(planId);

  if (!res.success || !res.data) {
    return <SurfPageNotFound />;
  }

  const { user, ...plan } = res.data;
  const formattedDate = format(new Date(plan.createdAt), "MMMM d, yyyy");
  const coordinates =
    plan.centroid && Array.isArray(plan.centroid) && plan.centroid.length >= 2
      ? `${plan.centroid[1].toFixed(6)}°N, ${plan.centroid[0].toFixed(6)}°E`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {plan.surveyTitle || `Survey Plan ${plan.planNumber}`}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={plan.status} />
              <p className="text-sm text-muted-foreground">
                Created on {formattedDate}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Overview */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Layers className="h-5 w-5 text-primary" />
                  Plan Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailItem
                  icon={Hash}
                  label="Plan Number"
                  value={plan.planNumber}
                />
                <DetailItem
                  icon={FileText}
                  label="Reference Plan"
                  value={plan.referencePlanNumber || "N/A"}
                />
                <DetailItem
                  icon={Ruler}
                  label="Area"
                  value={
                    plan.areaSqM
                      ? `${plan.areaSqM.toLocaleString()} m²`
                      : undefined
                  }
                />
                <DetailItem
                  icon={Layers}
                  label="Plan Type"
                  value={plan.planType || "N/A"}
                />
                <DetailItem
                  icon={Layers}
                  label="Pillar Type"
                  value={plan.pillarType || "N/A"}
                  className="md:col-span-2"
                />
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-primary" />
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
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <User className="h-5 w-5 text-primary" />
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
            <Card className="overflow-hidden border-primary/20">
              <CardHeader className="bg-primary/5 border-b border-primary/20">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-primary">
                  <FileText className="h-5 w-5" />
                  Plan Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Status
                  </span>
                  <StatusBadge status={plan.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Created
                  </span>
                  <span className="text-sm font-medium">{formattedDate}</span>
                </div>
                {plan.updatedAt && plan.updatedAt !== plan.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </span>
                    <span className="text-sm font-medium">
                      {format(new Date(plan.updatedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {plan.facilitator && (
                  <div className="pt-4 mt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Facilitator
                    </h4>
                    <p className="text-sm font-medium">{plan.facilitator}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/20 px-6 py-4 border-t">
                <Button className="w-full" size="sm">
                  View Full Details
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-semibold">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Plan PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
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

export default function PublicSurfboardPlanPage({
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

export const dynamic = "force-dynamic";
