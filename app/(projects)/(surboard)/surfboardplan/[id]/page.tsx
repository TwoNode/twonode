import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { getSurfPlanByIdWithSurveyor } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { SurfPageNotFound } from "@/components/pageNotFound/SurfPageNotFound";

interface PublicSurfboardPlanPageProps {
  params: { id: string };
}

export default async function PublicSurfboardPlanPage({ params }: PublicSurfboardPlanPageProps) {
  const res = await getSurfPlanByIdWithSurveyor(params.id);

  if (!res.success || !res.data) {
    return <SurfPageNotFound />;
  }

  const { user, ...plan } = res.data;
  const formattedDate = format(new Date(plan.createdAt), "");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Survey Plan: {plan.planNumber}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Created on {formattedDate}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Details Section */}
            <section>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
                Plan Details
              </h3>
              <div className="space-y-3 text-sm">
                <DetailItem label="Survey Title" value={plan.surveyTitle} />
                <DetailItem label="Plan Number" value={plan.planNumber} />
                <DetailItem label="LGA" value={plan.lga} />
                <DetailItem label="Ward" value={plan.ward} />
                <DetailItem label="Status" value={plan.status} />
                <DetailItem 
                  label="Area" 
                  value={plan.areaSqM ? `${plan.areaSqM} m²` : undefined} 
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

            {/* Surveyor Information Section */}
            <section>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
                Surveyor Information
              </h3>
              <div className="space-y-3 text-sm">
                <DetailItem 
                  label="Surveyor" 
                  value={user ? `${user.firstName} ${user.lastName}` : 'N/A'}
                />
                <DetailItem 
                  label="Company" 
                  value={user?.companyName} 
                />
                <DetailItem 
                  label="SURCON No." 
                  value={user?.surconRegNumber} 
                />
                <DetailItem 
                  label="SURCON Name" 
                  value={user?.surconRegName} 
                />
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

// Reusable Detail Item Component
function DetailItem({ 
  label, 
  value 
}: { 
  label: string; 
  value?: string | number | null 
}) {
  if (value === undefined || value === null) return null;
  
  return (
    <p className="flex justify-between">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span className="text-foreground">{value}</span>
    </p>
  );
}

export const dynamic = "force-dynamic";
