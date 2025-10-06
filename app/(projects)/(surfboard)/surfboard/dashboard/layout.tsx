import SurfboardUserPanelLayout from "@/components/layouts/surfboardUserPanelLayout";
import "maplibre-gl/dist/maplibre-gl.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Pass user info if available
  return <SurfboardUserPanelLayout>{children}</SurfboardUserPanelLayout>;
}
