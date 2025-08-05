import SinglePlanDetails from "./SinglePlan";

export default function PlanDetailsPage({
  searchParams,
}: {
  searchParams: { planId: string };
}) {
  const { planId } = searchParams;

  if (!planId) {
    return <div>Plan ID not found: {planId}</div>;
  }

  return <SinglePlanDetails planId={planId} />;
}
