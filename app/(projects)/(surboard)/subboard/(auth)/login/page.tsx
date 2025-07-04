import React from "react";
import RevaLogin from "./RevaLogin";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

export const dynamic = "force-dynamic";

const RevaLoginPage = () => {
  return (
    <>
      <SetCookieFromClient
        param="post_login_redirect_url"
        cookieName="my_redirect_url"
      />
      <RevaLogin />;
    </>
  );
};

export default RevaLoginPage;
