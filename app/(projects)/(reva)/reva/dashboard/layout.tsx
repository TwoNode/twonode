import RevaUserPanelLayout from "@/reva/layouts/revaUserPanelLayout";
import { getInitialRevaPanelUser } from "@/reva/access/serverSession";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialRevaPanelUser();
  return (
    <RevaUserPanelLayout initialUser={initialUser}>
      {children}
    </RevaUserPanelLayout>
  );
}
