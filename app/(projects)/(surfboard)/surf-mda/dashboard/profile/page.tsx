"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Building2, Calendar } from "lucide-react";

interface MDAProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  joinedDate: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MDAProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching MDA user profile data
    const fetchProfile = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock profile data
      const mockProfile: MDAProfile = {
        id: "1",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@mda.gov",
        role: "ACCOUNTS",
        department: "Ministry of Physical Planning",
        phone: "+234 80 123 4567",
        joinedDate: "2024-01-01T00:00:00Z",
      };

      setProfile(mockProfile);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      ACCOUNTS: "Accounts Officer",
      CHARTING: "Charting Officer",
      SURCON: "SURCON Officer",
      RECORDS_I: "Records I Officer",
      RECORDS_II: "Records II Officer",
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-600 mt-2">
                  View your MDA account information
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Back
              </button>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-purple-100">{getRoleName(profile.role)}</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="text-gray-900 font-medium">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="text-gray-900 font-medium">
                      {getRoleName(profile.role)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Building2 className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="text-gray-900 font-medium">
                      {profile.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Joined Date</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(profile.joinedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <strong>Note:</strong> To update your profile information,
                  please contact your system administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
