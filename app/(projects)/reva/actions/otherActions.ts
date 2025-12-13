"use server";

import { cookies } from "next/headers";

export const setMyRedirectUrlCookie = async (redirectUrl = "") => {
  console.log("setting setMyRedirectUrlCookie ");

  if (redirectUrl) {
    const cookieStore = await cookies();
    await cookieStore.set("my_redirect_url", redirectUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });
  }

  return null;
};
