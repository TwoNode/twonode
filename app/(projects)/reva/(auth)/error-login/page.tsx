import React from "react";
import RevaErrorLogin from "./RevaErrorLogin";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

export const dynamic = "force-dynamic";

const RevaLoginPage = () => {
  return (
    <>
      <SetCookieFromClient
        param="post_login_redirect_url"
        cookieName="my_redirect_url"
      />
      <RevaErrorLogin />;
    </>
  );
};

export default RevaLoginPage;
