import React from "react";
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

const postLoginRedirectURL = "/api/auth/success/surf-restricted";

export default function SurfMDALoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 via-blue-50 to-indigo-100 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <img
            src="/surfboard/surf_logo.png"
            alt="Surfboard Logo"
            className="w-20 h-20 rounded-full shadow-lg border-4 border-purple-100 object-contain bg-white"
            style={{ background: "white" }}
          />
        </div>
        <h1 className="text-3xl font-extrabold text-purple-900 mb-2">
          MDA Portal
        </h1>
        <p className="text-purple-700 mb-6 text-base font-medium">
          Ministry, Department & Agency Access
        </p>
        <LoginLink postLoginRedirectURL={postLoginRedirectURL}>
          <button className="w-full px-6 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition mb-4 text-lg shadow">
            Sign in to MDA Portal
          </button>
        </LoginLink>
        <div className="text-purple-700 mt-4">
          Don&apos;t have an account?{" "}
          <RegisterLink postLoginRedirectURL={postLoginRedirectURL}>
            <span className="underline cursor-pointer hover:text-purple-900 font-semibold">
              Register here
            </span>
          </RegisterLink>
        </div>
      </div>
    </div>
  );
}
