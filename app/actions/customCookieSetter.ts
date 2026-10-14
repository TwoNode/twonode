"use server";

import { cookies } from "next/headers";
import { isSafeReturnPath } from "@/lib/auth/loginReturn";

export async function customSetCookie(cookieName: string, cookieValue: string) {
  if (!cookieName || !cookieValue) return;
  // Only ever used for the page to return to after sign-in: a path on this site.
  if (!isSafeReturnPath(cookieValue.trim())) return;

  const normalizedName = cookieName.trim();
  const normalizedValue = cookieValue.trim();

  const cookieStore = await cookies();
  cookieStore.set(normalizedName, normalizedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not strict: the cookie has to come back when the browser returns
    // from the sign-in provider (a cross-site redirect, which strict hides).
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
}
