"use server";
import prisma from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function getUserFromRevaDB(userId: string) {
  try {
    const user = await prisma.revaUser.findUnique({
      where: { kindeId: userId },
    });

    return user;
  } catch (error) {
    console.error("Error fetching user from Reva DB:", error);
    return null;
  }
}

export async function getAuthenticatedUser() {
  const { getUser, isAuthenticated } = getKindeServerSession();

  const UserIsAuthenticated = await isAuthenticated();
  const user = await getUser();

  if (!UserIsAuthenticated || !user || !user.id) {
    throw new Error("Not Authenticated");
  }

  const revaUser = await getUserFromRevaDB(user.id);

  if (!revaUser) {
    throw new Error("User not found in Reva DB");
  }

  return { ...user, ...revaUser };
}
