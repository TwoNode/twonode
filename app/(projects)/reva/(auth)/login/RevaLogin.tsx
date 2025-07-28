"use client";

import React from "react";
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";

export default function RevaLogin() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <img
            src="/reva/revaLogo.png"
            alt="REVA Logo"
            className="w-20 h-20 rounded-full shadow-lg border-4 border-blue-100 object-contain bg-white"
            style={{ background: "white" }}
          />
        </div>
        <h1 className="text-3xl font-extrabold text-blue-900 mb-2">
          Sign in to REVA
        </h1>
        <p className="text-blue-700 mb-6 text-base font-medium">
          Access your REVA dashboard and manage your requests securely.
        </p>
        <LoginLink postLoginRedirectURL="/api/auth/success/reva">
          <Button className="w-full px-6 py-3 bg-blue-800 text-white rounded-lg font-semibold hover:bg-blue-900 transition mb-4 text-lg shadow">
            Sign in to REVA
          </Button>
        </LoginLink>
        <div className="text-blue-700 mt-4">
          Don&apos;t have an account?{" "}
          <RegisterLink postLoginRedirectURL="/api/auth/success/reva">
            <span className="underline cursor-pointer hover:text-blue-900 font-semibold">
              Register here
            </span>
          </RegisterLink>
        </div>
      </div>
    </main>
  );
}
