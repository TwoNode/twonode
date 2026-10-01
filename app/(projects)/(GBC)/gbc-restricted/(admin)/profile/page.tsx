import { requireAdmin } from "@/gbc/utils/auth";
import Link from "next/link";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Settings,
  Bell,
  Users,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Admin page — force dynamic per-request auth verification
export const dynamic = "force-dynamic";

export default async function GBCAdminProfilePage() {
  const user = await requireAdmin();

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Administrator";
  const initials = (
    (user.firstName?.[0] || "") + (user.lastName?.[0] || "")
  ).toUpperCase() || "A";

  const isSuperAdmin = user.role === "SUPERADMIN";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-gray-600 hover:text-gray-900">
          <Link href="/gbc-restricted">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <User className="h-6 w-6" />
              </div>
              Administrator Profile
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              View your GBC administrator account credentials and platform access details
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/gbc-restricted/settings">
              <Settings className="h-4 w-4 mr-2" />
              Platform Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Profile Summary Card */}
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <div className="h-28 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-900" />
        <CardContent className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 mb-5 gap-4">
            <div className="flex items-end gap-4">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md border-4 border-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #9333EA)",
                }}
              >
                {initials}
              </div>
              <div className="mb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {fullName}
                </h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <Shield className="h-3.5 w-3.5" />
                {isSuperAdmin ? "Super Admin" : "Administrator"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {user.isActive ? "Active Account" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/70">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Email Address</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/70">
              <Phone className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.phone || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/70">
              <Shield className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Admin Role</p>
                <p className="text-sm font-semibold text-gray-900">
                  {isSuperAdmin ? "Super Admin (Full Access)" : "Event Administrator"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/70">
              <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Account Created</p>
                <p className="text-sm font-semibold text-gray-900">
                  {user.createdAt ? format(new Date(user.createdAt), "PPP") : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="hover:border-purple-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600" />
              Settings & Configurations
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Event configuration, ticket tiers, social links, and email notification controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="secondary" size="sm" asChild className="w-full">
              <Link href="/gbc-restricted/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-600" />
              Admin Notifications
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              View broadcasts and send notifications to all administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="secondary" size="sm" asChild className="w-full">
              <Link href="/gbc-restricted/notifications">Go to Notifications</Link>
            </Button>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card className="sm:col-span-2 hover:border-purple-200 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Administrator User Management
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Provision new admin accounts, manage roles, and review administrator activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href="/gbc-restricted/users">Manage Admin Accounts</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
