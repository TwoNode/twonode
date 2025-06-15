"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { customSetCookie } from "@/app/actions/customCookieSetter";

type Props = {
  param: string;
  cookieName: string;
};

export function SetCookieFromClient({ param, cookieName }: Props) {
  const searchParams = useSearchParams();
  const cookieValue = searchParams.get(param);

  useEffect(() => {
    if (cookieValue) {
      customSetCookie(cookieName, cookieValue);
    }
  }, [cookieValue, cookieName]);

  return null;
}
