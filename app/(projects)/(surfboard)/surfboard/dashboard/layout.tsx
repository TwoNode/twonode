import SurfboardUserPanelLayout from "@/components/layouts/surfboardUserPanelLayout";
import "maplibre-gl/dist/maplibre-gl.css";

export const maxDuration = 60;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Pass user info if available
  return <SurfboardUserPanelLayout>{children}</SurfboardUserPanelLayout>;
}
