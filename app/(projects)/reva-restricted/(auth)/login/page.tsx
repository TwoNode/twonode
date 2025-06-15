import React from "react";
import RevaAdminLogin from "./RevaAdminLogin";
import { setMyRedirectUrlCookie } from "@/app/(projects)/reva/actions/otherActions";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

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
