"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle } from "lucide-react";

export default function GBCAdminLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 to-purple-100 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full shadow-lg border-4 border-purple-100 bg-linear-to-br from-purple-600 to-purple-800 flex items-center justify-center">
            <Shield className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-purple-900 mb-2">
          GBC Admin Portal
        </h1>
        <p className="text-purple-700 mb-2 text-base font-medium">
          Administrator Access Only
        </p>
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 shrink-0" />
            <p className="text-sm text-amber-800">
              Only pre-registered administrators can access this area. If you
              need admin access, please contact the system administrator.
            </p>
          </div>
        </div>
        <LoginLink postLoginRedirectURL="/api/auth/success/gbc2-restricted">
          <Button className="w-full px-6 py-3 bg-purple-800 text-white rounded-lg font-semibold hover:bg-purple-900 transition mb-4 text-lg shadow">
            Sign in as Admin
          </Button>
        </LoginLink>
        <p className="text-sm text-gray-500 mt-4">
          Global Business Conference 2.0
        </p>
      </div>
    </div>
  );
}
