import RevaAdminPanelLayout from "@/components/admin-panel/revaAdminPanelLayout";
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
  return <RevaAdminPanelLayout>{children}</RevaAdminPanelLayout>;
}
