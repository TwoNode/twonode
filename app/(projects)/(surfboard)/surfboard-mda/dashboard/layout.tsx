import { DashboardShell } from "@/components/admin-panel/DashboardShell";
import { getEncryptedUserData } from "@/utils/encryptedCookies";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SURFBOARD_COLORS } from "@/surfboard/colors";

export const maxDuration = 60;

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
    <DashboardShell
      title="Surfboard MDA"
      logoSrc="/surfboard/surf_logo.svg"
      colorPalette={SURFBOARD_COLORS}
      role={userData?.role}
      group="mda"
      user={user?.name || userData?.name ? { picture: user?.picture, name: user?.name || userData?.name } : undefined}
    >
      {children}
    </DashboardShell>
  );
}
