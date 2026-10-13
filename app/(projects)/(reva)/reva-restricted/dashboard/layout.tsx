import RevaAdminPanelLayout from "@/reva/layouts/revaAdminPanelLayout";
// import ServerProtectedAdminRoute from "@/components/middlewares/ServerProtectedAdminRoute";
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
  // Resolved here so the panel draws with the right role and menu at once;
  // proxy.ts is still what keeps everyone else out.
  const initialUser = await getInitialRevaPanelUser();
  return (
    // Temporarily disabled for debugging
    // <ServerProtectedAdminRoute>
    <RevaAdminPanelLayout initialUser={initialUser}>
      {children}
    </RevaAdminPanelLayout>
    // </ServerProtectedAdminRoute>
  );
}
