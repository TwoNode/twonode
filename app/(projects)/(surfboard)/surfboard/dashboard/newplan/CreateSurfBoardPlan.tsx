"use client";
import React from "react";
import SurfboardPlanForm from "@/app/(projects)/(surfboard)/components/SurfboardPlanForm";

export default function CreateSurfBoardPlan({ isSuperAdmin = false }) {
  return (
    <div className="mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Create New Surfboard Plan</h1>
      <SurfboardPlanForm mode="create" isSuperAdmin={!!isSuperAdmin} />
    </div>
  );
}
