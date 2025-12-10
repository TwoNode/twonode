"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  Building2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { getUserData } from "../../../actions/authActions";

interface MDAProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const roleNames: Record<string, string> = {
  ACCOUNTS: "Accounts Admin",
  CHARTING: "Charting Admin",
  SURCON: "SURCON Admin",
  RECORDS_I: "Records I Admin",
  RECORDS_II: "Records II Admin",
  SUPERADMIN: "Super Administrator",
};

const roleDescriptions: Record<string, string> = {
  ACCOUNTS:
    "Responsible for reviewing and approving LASG payment receipts for Certificate of Deposit batches.",
  CHARTING:
    "Responsible for reviewing and confirming charting remarks for submitted survey plans.",
  SURCON:
    "Responsible for verifying pillar numbers and coordinates against the SURCON database.",
  RECORDS_I:
    "Responsible for reviewing uploaded record copies for quality and completeness.",
  RECORDS_II:
    "Responsible for final approval and submission to OSSG - verifying physical copies.",
  SUPERADMIN:
    "Full administrative access to all MDA departments and system functions.",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<MDAProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await getUserData();

        if (result.success && result.data) {
          setProfile({
            firstName: result.data.firstName,
            lastName: result.data.lastName,
            email: result.data.email,
            role: result.data.role,
          });
        } else {
          setError(result.error || "Failed to load profile data");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("An error occurred while loading your profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error || "Failed to load profile data"}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">
              View your MDA account information
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-purple-600">
                  {profile.firstName.charAt(0)}
                  {profile.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-purple-100 text-lg mt-1">
                  {roleNames[profile.role] || profile.role}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Email Address
                  </p>
                  <p className="text-gray-900 font-semibold text-lg">
                    {profile.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Role</p>
                  <p className="text-gray-900 font-semibold text-lg">
                    {roleNames[profile.role] || profile.role}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl md:col-span-2">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Department
                  </p>
                  <p className="text-gray-900 font-semibold text-lg">
                    Lagos State Surveyor General&apos;s Office (OSSG)
                  </p>
                </div>
              </div>
            </div>

            {/* Role Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                Your Responsibilities
              </h3>
              <p className="text-blue-700">
                {roleDescriptions[profile.role] ||
                  "Your role involves managing certificate of deposit approvals."}
              </p>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> To update your profile information or
                change your role, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
