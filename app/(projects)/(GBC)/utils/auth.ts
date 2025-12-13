// src/lib/auth.ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
// import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export async function requireAuth() {
  // const { isAuthenticated, getUser } = getKindeServerSession();

  // if (!(await isAuthenticated())) {
  //   redirect("/api/auth/login");
  // }

  // const kindeUser = await getUser();
  // if (!kindeUser) {
  //   redirect("/api/auth/login");
  // }

  return {
    id: "ririeo-352354-rewt",
    email: "rojith@gbc.com",
    given_name: "Rojith",
    family_name: "Bond",
    picture: "https://example.com/picture.jpg",
    username: "rojith",
    phone_number: "08012345678",
  };
}

export async function requireAdmin() {
  // const kindeUser = await requireAuth();

  // // Get or create user in database
  // let user = await prisma.gBCUser.findUnique({
  //   where: { kindeId: kindeUser.id },
  // });

  // if (!user) {
  //   // Create user on first login
  //   user = await prisma.gBCUser.create({
  //     data: {
  //       kindeId: kindeUser.id,
  //       email: kindeUser.email || "",
  //       name: `${kindeUser.given_name || ""} ${
  //         kindeUser.family_name || ""
  //       }`.trim(),
  //       phone: kindeUser.phone_number || undefined,
  //       role: "USER", // Default role
  //     },
  //   });
  // }

  // // Check if user is admin
  // if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
  //   // redirect("/unauthorized");
  // }

  return {
    firstName: "James",
    lastName: "Bond",
    id: "ririeo-352354-rewt",
    createdAt: new Date(),
    updatedAt: new Date(),
    kindeId: "ririeo-352354-rewt",
    email: "rojith@gbc.com",
    role: "ADMIN",
    phone: "08012345678",
  };
}

export async function getCurrentGBCUser() {
  const { isAuthenticated, getUser } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return null;
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    return null;
  }

  // Get or create user in database
  let user = await prisma.gBCUser.findUnique({
    where: { kindeId: kindeUser.id },
  });

  if (!user) {
    user = await prisma.gBCUser.create({
      data: {
        kindeId: kindeUser.id,
        email: kindeUser.email || "",
        firstName: kindeUser.given_name || "",
        lastName: kindeUser.family_name || "",
        phone: kindeUser.phone_number || undefined,
        role: "USER",
      },
    });
  }

  return user;
}

export async function checkIsAdmin() {
  const user = await getCurrentGBCUser();
  return user?.role === "ADMIN" || user?.role === "SUPERADMIN";
}

export async function checkIsSuperAdmin() {
  const user = await getCurrentGBCUser();
  return user?.role === "SUPERADMIN";
}
