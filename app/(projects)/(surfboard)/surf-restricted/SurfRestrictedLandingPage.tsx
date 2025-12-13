import React from "react";
import Link from "next/link";

export default function SurfRestrictedLandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-blue-100 px-4 py-12">
      <section className="max-w-2xl w-full text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4">
          Surfboard Restricted Area
        </h1>
        <p className="text-lg md:text-xl text-blue-700 mb-6">
          Welcome to the secure section of Surfboard. Here, authorized users can
          access advanced analytics, administrative tools, and manage sensitive
          survey plans with enhanced security and privacy.
        </p>
        <Link href="/surf-restricted/dashboard" className="inline-block px-8 py-3 bg-blue-700 text-white rounded-lg shadow-lg hover:bg-blue-800 transition font-semibold text-lg">
          Go to Restricted Dashboard
        </Link>
      </section>
      <section className="bg-white rounded-xl shadow-md p-6 max-w-xl w-full border border-blue-100">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">
          Restricted Features
        </h2>
        <ul className="list-disc list-inside text-blue-700 text-base text-left">
          <li>Advanced analytics and reporting</li>
          <li>Administrative controls and user management</li>
          <li>Secure plan review and approval workflows</li>
          <li>Access to sensitive or confidential survey data</li>
        </ul>
      </section>
      <footer className="mt-16 text-blue-500 text-sm">
        &copy; {new Date().getFullYear()} TwoNode Technologies. All rights
        reserved.
      </footer>
    </div>
  );
}
