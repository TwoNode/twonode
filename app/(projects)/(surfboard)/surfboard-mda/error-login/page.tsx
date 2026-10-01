import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

export default function SurfMDAErrorLoginPage() {
  return (
    <AuthSplitLayout
      accent="#7C3AED"
      accentDark="#5B21B6"
      eyebrow="MDA Portal"
      headline="Ministries, Departments & Agencies."
      description="Sign in to your MDA workspace to manage submissions, approvals, and inter-agency records."
      networkVariant="mda"
    >
      <div className="bg-white dark:bg-[#101F2C] dark:border dark:border-white/10 rounded-2xl shadow-xl dark:shadow-none p-8 max-w-md w-full text-center flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-3">
          Login Error
        </h1>
        <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-300 mb-2">
          Access Denied
        </h2>
        <p className="text-purple-700 dark:text-purple-200/80 mb-6 text-base">
          You must be registered with an MDA role to access this portal. Please
          contact your administrator if you believe this is an error.
        </p>
        <Link href="/surfboard-mda/login" className="w-full">
          <button className="w-full px-6 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition text-lg shadow">
            Back to Login
          </button>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
