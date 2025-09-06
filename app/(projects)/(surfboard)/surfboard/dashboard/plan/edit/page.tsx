import EditPlan from "./EditPlan";
import { getSurfPlanById } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import { SurfPageNotFound } from "@/components/pageNotFound/SurfPageNotFound";

export default async function EditPlanPage({
  searchParams,
}: {
  searchParams: { planId: string };
}) {
  const planId = searchParams.planId;

  const result = await getSurfPlanById(planId, { forEdit: true });

  if (!result.success) {
    return (
      <SurfPageNotFound
        url="/surfboard/dashboard/plans"
        urlText="Surfboard Plans"
      />
    );
  }

  if (!result.data) {
    return (
      <SurfPageNotFound
        url="/surfboard/dashboard/plans"
        urlText="Surfboard Plans"
      />
    );
  }

  const plan = result.data;

  // Check if the plan was created more than 24 hours ago
  const isWithin24Hours =
    plan.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <>
      <EditPlan plan={plan as SurfboardPlanDTO} />
    </>
  );
}
