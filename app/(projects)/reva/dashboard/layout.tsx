import RevaUserPanelLayout from "@/components/layouts/revaUserPanelLayout";
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
  return <RevaUserPanelLayout>{children}</RevaUserPanelLayout>;
}
