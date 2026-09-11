import { DashboardShell } from "@/components/admin-panel/DashboardShell";
import { getEffectiveUserData } from "@/lib/auth/session";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Platform } from "@/utils/platform";

export const maxDuration = 60;

export default async function RestrictedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Native session first, legacy Kinde cookie as fallback — see
  // lib/auth/session.ts's getEffectiveUserData doc comment.
  const encryptedUserData = await getEffectiveUserData(Platform.SURFBOARD);

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
      title="Surfboard Admin"
      logoSrc="/surfboard/surf_logo.svg"
      role={userData?.role}
      group="admin"
      user={user?.name || userData?.name ? { picture: user?.picture, name: user?.name || userData?.name } : undefined}
    >
      {children}
    </DashboardShell>
  );
}
