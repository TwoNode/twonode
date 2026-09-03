import React from "react";
import RevaAdminLogin from "./RevaAdminLogin";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

export const dynamic = "force-dynamic";

const RevaLoginPage = () => {
  return (
    <>
      <SetCookieFromClient
        param="post_login_redirect_url"
        cookieName="my_redirect_url"
      />
      <RevaAdminLogin />;
    </>
  );
};

export default RevaLoginPage;
