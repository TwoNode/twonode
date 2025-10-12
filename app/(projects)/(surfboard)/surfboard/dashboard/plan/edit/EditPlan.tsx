import SurfboardPlanForm from "@/app/(projects)/(surfboard)/components/SurfboardPlanForm";
import type { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";

export default function EditPlan({
  plan,
  isSuperAdmin = false,
}: {
  plan: SurfboardPlanDTO;
  isSuperAdmin?: boolean;
}) {
  return (
    <div className="mx-auto p-4">
      <SurfboardPlanForm
        mode="edit"
        initial={plan}
        isSuperAdmin={!!isSuperAdmin}
      />
    </div>
  );
}
