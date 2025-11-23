"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function GBCErrorLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-purple-50 to-red-50 px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full shadow-lg bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-6 text-base">
          We encountered an issue signing you in. This could be due to:
        </p>
        <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Your account may not have the required permissions</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>There may be a temporary connection issue</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Your session may have expired</span>
          </li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/gbc2/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </Button>
          <Button asChild className="flex-1 bg-purple-600 hover:bg-purple-700">
            <Link href="/gbc2">Go to Home</Link>
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-6">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  );
}
