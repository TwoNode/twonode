import React from "react";
import RevaLogin from "./RevaLogin";
import { setMyRedirectUrlCookie } from "../../actions/otherActions";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

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
