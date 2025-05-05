"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs";

export const AuthLinks = () => {
  return (
    <div className="mt-6 flex justify-center gap-4">
      <LoginLink postLoginRedirectURL="/api/auth/success/reva">
        <Button className="bg-blue-700 px-6 py-3 text-lg hover:border-2 hover:border-blue-500 transition-all">
          Sign In
        </Button>
      </LoginLink>
      <RegisterLink postLoginRedirectURL="/api/auth/success/reva">
        <Button className="bg-gray-700 px-6 py-3 text-lg hover:border-2 hover:border-gray-500 transition-all">
          Register
        </Button>
      </RegisterLink>
    </div>
  );
};
