import SinglePlanDetails from "./SinglePlan";

export default async function PlanDetailsPage({
  searchParams,
}: {
  searchParams: { planId: string };
}) {
  const { planId } = await searchParams;

  if (!planId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-center text-gray-500">
          Plan ID not found: <span className="font-bold">{planId}</span>
        </p>
      </div>
    );
  }

  return <SinglePlanDetails planId={planId} />;
}
