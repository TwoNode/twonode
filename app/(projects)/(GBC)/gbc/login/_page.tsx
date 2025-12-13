"use client";

import React from "react";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

export default function GBCUserLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 to-pink-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full shadow-lg border-4 border-purple-100 bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Ticket className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-purple-900 mb-2">
          Welcome to GBC 2.5
        </h1>
        <p className="text-purple-700 mb-2 text-lg font-medium">
          Geospatial Builders Conference
        </p>
        <p className="text-gray-600 mb-6 text-sm">
          Sign in to access your tickets, gallery, and event information
        </p>
        <LoginLink postLoginRedirectURL="/api/auth/success/gbc">
          <Button className="w-full px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition mb-4 text-lg shadow-lg">
            Sign in to GBC
          </Button>
        </LoginLink>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
