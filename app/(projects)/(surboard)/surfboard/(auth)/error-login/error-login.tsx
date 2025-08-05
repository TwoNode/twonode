import React from "react";
import Link from "next/link";

export default function SurfboardErrorLoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-4 py-12">
      <h1 className="text-5xl font-extrabold text-red-600 mb-4">Login Error</h1>
      <p className="text-lg text-blue-700 mb-6">
        Something went wrong during login. Please try again.
      </p>
      <Link
        href="/surfboard/login"
        className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
      >
        Back to Login
      </Link>
    </main>
  );
}
