import React from "react";
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

const postLoginRedirectURL = "/api/auth/success/surf-restricted";

export default function SurfRestrictedLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-teal-50 to-blue-100 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <img
            src="/surfboard/surf_logo.png"
            alt="Surfboard Logo"
            className="w-20 h-20 rounded-full shadow-lg border-4 border-blue-100 object-contain bg-white"
            style={{ background: "white" }}
          />
        </div>
        <h1 className="text-3xl font-extrabold text-blue-900 mb-2">
          Restricted Access
        </h1>
        <p className="text-blue-700 mb-6 text-base font-medium">
          Restricted area. Authorized users only.
        </p>
        <LoginLink postLoginRedirectURL={postLoginRedirectURL}>
          <button className="w-full px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition mb-4 text-lg shadow">
            Sign in to Surfboard
          </button>
        </LoginLink>
        <div className="text-blue-700 mt-4">
          Don&apos;t have an account?{" "}
          <RegisterLink postLoginRedirectURL={postLoginRedirectURL}>
            <span className="underline cursor-pointer hover:text-blue-900 font-semibold">
              Register here
            </span>
          </RegisterLink>
        </div>
      </div>
    </div>
  );
}
