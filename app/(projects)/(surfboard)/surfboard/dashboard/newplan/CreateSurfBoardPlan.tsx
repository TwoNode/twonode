"use client";
import SurfboardPlanForm from "@/app/(projects)/(surfboard)/components/SurfboardPlanForm";

export default function CreateSurfBoardPlan({ isSuperAdmin = false }) {
  return (
    <div className="mx-auto p-4">
      <SurfboardPlanForm mode="create" isSuperAdmin={!!isSuperAdmin} />
    </div>
  );
}
