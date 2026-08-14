"use client";

import React from "react";
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";

export default function SurfboardErrorLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-50 via-teal-50 to-blue-100 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <img
            src="/surfboard/surf_logo.svg"
            alt="Surfboard Logo"
            className="w-20 h-20 rounded-full shadow-lg border-4 border-blue-100 object-contain bg-white"
            style={{ background: "white" }}
          />
        </div>
        <h1 className="text-2xl font-extrabold text-blue-900 mb-2">
          Login Error
        </h1>
        <p className="text-blue-700 mb-6 text-base font-medium">
          We couldn't sign you in. Please try again or contact support if the
          problem persists.
        </p>
        <LoginLink postLoginRedirectURL="/api/auth/success/surfboard">
          <Button className="w-full px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition mb-4 text-lg shadow">
            Try Login Again
          </Button>
        </LoginLink>
        <RegisterLink postLoginRedirectURL="/api/auth/success/surfboard">
          <Button variant="outline" className="w-full px-6 py-3 bg-blue-100 text-blue-900 rounded-lg font-semibold hover:bg-blue-200 transition text-lg shadow">
            Register New Account
          </Button>
        </RegisterLink>
      </div>
    </div>
  );
}
