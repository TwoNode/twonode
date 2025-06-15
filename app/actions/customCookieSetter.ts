"use server";

import { cookies } from "next/headers";

export async function customSetCookie(cookieName: string, cookieValue: string) {
  if (!cookieName || !cookieValue) return;

  const normalizedName = cookieName.trim();
  const normalizedValue = cookieValue.trim();

  cookies().set(normalizedName, normalizedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}
