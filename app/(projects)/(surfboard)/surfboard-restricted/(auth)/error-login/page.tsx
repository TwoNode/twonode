import React from "react";
import Link from "next/link";

export default function SurfRestrictedErrorLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 dark:bg-background px-4 py-12">
      <h1 className="text-5xl font-extrabold text-red-600 dark:text-red-400 mb-4">Login Error</h1>
      <p className="text-lg text-blue-700 dark:text-blue-300 mb-6">
        Something went wrong during login. Please try again.
      </p>
      <Link
        href="/surfboard-restricted/login"
        className="px-6 py-2 bg-blue-700 dark:bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-800 dark:hover:bg-blue-700 transition"
      >
        Back to Login
      </Link>
    </div>
  );
}
