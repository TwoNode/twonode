import EditPlan from "./EditPlan";
import { getSurfPlanById } from "@/app/(projects)/(surfboard)/actions/surfboardActions";
import { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import { SurfPageNotFound } from "@/components/pageNotFound/SurfPageNotFound";
import Link from "next/link";
import { Lock } from "lucide-react";

export default async function EditPlanPage({
  searchParams,
}: {
  searchParams: { planId: string };
}) {
  const { planId } = await searchParams;

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

  // Check if plan is locked (submitted for certificate processing)
  const isLocked = plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED";

  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Plan Locked</h1>
          <p className="text-red-600 mb-6">
            This plan has been submitted for certificate processing and cannot
            be edited.
            <br />
            Please contact support if you need to make changes.
          </p>
          <div className="space-y-3">
            <Link
              href={`/surfboard/dashboard/plan?planId=${planId}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Plan Details
            </Link>
            <br />
            <Link
              href="/surfboard/dashboard/plans"
              className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to All Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <EditPlan plan={plan as SurfboardPlanDTO} />
    </>
  );
}
