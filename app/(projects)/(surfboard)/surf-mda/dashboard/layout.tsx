import SurfboardMDAPanelLayout from "@/components/layouts/surfboardMDAPanelLayout";

export default function MDADashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Pass user and userData if available
  return <SurfboardMDAPanelLayout>{children}</SurfboardMDAPanelLayout>;
}
