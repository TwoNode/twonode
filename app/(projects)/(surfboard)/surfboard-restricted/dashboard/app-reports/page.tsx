"use client";

import { AppReportsViewer } from "@/components/admin/AppReportsViewer";

/** Superadmin only (see SURFBOARD_ROUTES): the crash reports the Surfboard app posted. */
export default function AppReportsPage() {
  return <AppReportsViewer />;
}
