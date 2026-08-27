import RevaAdminPanelLayout from "@/reva/layouts/revaAdminPanelLayout";
// import ServerProtectedAdminRoute from "@/components/middlewares/ServerProtectedAdminRoute";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Temporarily disabled for debugging
    // <ServerProtectedAdminRoute>
    <RevaAdminPanelLayout>{children}</RevaAdminPanelLayout>
    // </ServerProtectedAdminRoute>
  );
}
