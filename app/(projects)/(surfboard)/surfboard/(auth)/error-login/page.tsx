import React from "react";
import SurfboardErrorLogin from "./SurfboardErrorLogin";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

export const dynamic = "force-dynamic";

const SurfboardErrorLoginPage = () => {
  return (
    <>
      <SetCookieFromClient
        param="post_login_redirect_url"
        cookieName="surfboard_redirect_url"
      />
      <SurfboardErrorLogin />
    </>
  );
};

export default SurfboardErrorLoginPage;
