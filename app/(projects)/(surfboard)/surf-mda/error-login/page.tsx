import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function SurfMDAErrorLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 via-blue-50 to-indigo-100 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-red-600 mb-3">
          Login Error
        </h1>
        <h2 className="text-xl font-semibold text-purple-900 mb-2">
          Access Denied
        </h2>
        <p className="text-purple-700 mb-6 text-base">
          You must be registered with an MDA role to access this portal. Please
          contact your administrator if you believe this is an error.
        </p>
        <Link href="/surf-mda/login">
          <button className="w-full px-6 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition text-lg shadow">
            Back to Login
          </button>
        </Link>
      </div>
    </div>
  );
}
