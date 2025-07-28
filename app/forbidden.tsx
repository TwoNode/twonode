import React from "react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-4 py-12">
      <h1 className="text-7xl font-extrabold text-blue-900 mb-4">403</h1>
      <p className="text-xl text-blue-700 mb-6">
        Access Denied. You do not have permission to view this page.
      </p>
      <Link
        href="/"
        className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
      >
        Go Home
      </Link>
    </main>
  );
}
