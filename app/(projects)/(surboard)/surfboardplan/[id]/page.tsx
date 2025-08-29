import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { getSurfPlanByIdWithSurveyor } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResolvingMetadata } from "next";
import { Metadata } from "next";
import { SurfPageNotFound } from "@/components/pageNotFound/SurfPageNotFound";

type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const res = await getSurfPlanByIdWithSurveyor(params.id);

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
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex justify-between py-1">
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

async function PlanDetails({ planId }: { planId: string }) {
  const res = await getSurfPlanByIdWithSurveyor(planId);

  if (!res.success || !res.data) {
    return <SurfPageNotFound />;
  }

  const { user, ...plan } = res.data;
  const formattedDate = format(new Date(plan.createdAt), "MMMM d, yyyy");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Survey Plan: {plan.planNumber}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {user
              ? `Surveyed by ${user.firstName} ${user.lastName}${
                  user.surconRegNumber
                    ? ` (SURCON: ${user.surconRegNumber})`
                    : ""
                } on ${formattedDate}`
              : `Created on ${formattedDate}`}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
                Plan Details
              </h3>
              <div className="space-y-3 text-sm">
                <DetailItem label="Survey Title" value={plan.surveyTitle} />
                <DetailItem label="Plan Number" value={plan.planNumber} />
                <DetailItem label="LGA" value={plan.lga} />
                <DetailItem label="Ward" value={plan.ward} />
                <DetailItem
                  label="Status"
                  value={plan.status?.replace(/_/g, " ").toLowerCase()}
                />
                <DetailItem
                  label="Area"
                  value={
                    plan.areaSqM
                      ? `${plan.areaSqM.toLocaleString()} m²`
                      : undefined
                  }
                />
                <DetailItem label="Facilitator" value={plan.facilitator} />
                <DetailItem label="Pillar Type" value={plan.pillarType} />
                <DetailItem label="Plan Type" value={plan.planType} />
                <DetailItem
                  label="Reference Plan Number"
                  value={plan.referencePlanNumber}
                />
                <DetailItem label="Deeded Area" value={plan.deededArea} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
                Location Details
              </h3>
              <div className="space-y-3 text-sm">
                <DetailItem
                  label="Surveyor"
                  value={user ? `${user.firstName} ${user.lastName}` : "N/A"}
                />
                <DetailItem label="Company" value={user?.companyName} />
                <DetailItem label="SURCON No." value={user?.surconRegNumber} />
                <DetailItem label="SURCON Name" value={user?.surconRegName} />
                {plan.centroid &&
                  Array.isArray(plan.centroid) &&
                  plan.centroid.length >= 2 && (
                    <DetailItem
                      label="Coordinates"
                      value={`${plan.centroid[1].toFixed(
                        6
                      )}°N, ${plan.centroid[0].toFixed(6)}°E`}
                    />
                  )}
              </div>
            </section>
          </div>

          {/* Reason for Withdrawal Section */}
          {plan.reasonForWithdrawalAndResubmission && (
            <div className="mt-6 p-4 bg-muted/50 rounded-md">
              <h4 className="font-medium text-foreground mb-2">
                Reason for Withdrawal and Resubmission
              </h4>
              <p className="text-sm text-muted-foreground">
                {plan.reasonForWithdrawalAndResubmission}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4">
      <Skeleton className="h-10 w-3/4 mb-2" />
      <Skeleton className="h-5 w-1/2 mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
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
