import React from "react";
import RevaErrorLogin from "./RevaErrorLogin";
import { setMyRedirectUrlCookie } from "../../actions/otherActions";
import { SetCookieFromClient } from "@/components/SetCookieFromClient";

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
