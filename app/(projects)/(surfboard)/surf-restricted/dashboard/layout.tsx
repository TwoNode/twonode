import SurfboardAdminPanelLayout from "@/components/layouts/surfboardAdminPanelLayout";

export default function RestrictedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Pass user and userData if available
  return <SurfboardAdminPanelLayout>{children}</SurfboardAdminPanelLayout>;
}
