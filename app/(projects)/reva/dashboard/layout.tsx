import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
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
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
