import SurfboardMDAPanelLayout from "@/components/layouts/surfboardMDAPanelLayout";
import { getEncryptedUserData } from "@/utils/encryptedCookies";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export default async function MDADashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data from encrypted cookies
  const encryptedUserData = await getEncryptedUserData();

  // Also get Kinde user for profile picture if available
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  const user = kindeUser
    ? {
        picture: kindeUser.picture ?? undefined,
        name:
          (`${kindeUser.given_name ?? ""} ${
            kindeUser.family_name ?? ""
          }`.trim() ||
            kindeUser.email) ??
          undefined,
      }
    : undefined;

  const userData = encryptedUserData
    ? {
        role: encryptedUserData.role as string,
        name: `${encryptedUserData.firstName} ${encryptedUserData.lastName}`.trim(),
      }
    : undefined;

  return (
    <SurfboardMDAPanelLayout user={user} userData={userData}>
      {children}
    </SurfboardMDAPanelLayout>
  );
}
