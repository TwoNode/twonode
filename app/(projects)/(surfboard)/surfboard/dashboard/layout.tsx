import SurfboardUserPanelLayout from "@/surfboard/layouts/surfboardUserPanelLayout";
import { getInitialSurfboardPanel } from "@/surfboard/access/serverPanel";
import "maplibre-gl/dist/maplibre-gl.css";

export const maxDuration = 60;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The session and subscription are read here so the panel draws on the
  // first paint; null (no session, or a failed read) makes the panel check in
  // the browser instead, as before.
  const initial = await getInitialSurfboardPanel();
  return (
    <SurfboardUserPanelLayout initial={initial}>
      {children}
    </SurfboardUserPanelLayout>
  );
}
