"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Activity,
  TrendingUp,
  FileText,
  Map,
  BarChart3,
  User,
  Loader2,
  Shield,
  Calculator,
  Compass,
  Archive,
  FolderCheck,
} from "lucide-react";
import { surfboardApi } from "@/surfboard/apiClient";

type MDARole =
  | "ACCOUNTS"
  | "CHARTING"
  | "SURCON"
  | "RECORDS_I"
  | "INTAKE"
  | "RECORDS_II"
  | "ARCHIVE"
  | "SUPERADMIN"
  | "MDA_SUPERADMIN";

interface RoleConfig {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  iconBg: string;
  iconColor: string;
  heroGradient: string;
}

const roleConfigs: Record<MDARole, RoleConfig> = {
  ACCOUNTS: {
    title: "Accounts Admin",
    description:
      "Review and approve LASG payment receipts for Certificate of Deposit batches",
    icon: Calculator,
    href: "/surfboard-mda/dashboard/accounts",
    color: "from-purple-500 to-violet-500",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    heroGradient: "from-purple-600 via-purple-700 to-violet-800",
  },
  CHARTING: {
    title: "Charting Admin",
    description:
      "Review and confirm charting remarks for submitted survey plans",
    icon: Map,
    href: "/surfboard-mda/dashboard/charting",
    color: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    heroGradient: "from-blue-600 via-blue-700 to-cyan-800",
  },
  SURCON: {
    title: "SURCON Admin",
    description: "Verify pillar numbers and coordinates against the database",
    icon: Compass,
    href: "/surfboard-mda/dashboard/surcon",
    color: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    heroGradient: "from-emerald-600 via-emerald-700 to-teal-800",
  },
  RECORDS_I: {
    title: "Records I Admin",
    description: "Review uploaded record copies for quality and completeness",
    icon: Archive,
    href: "/surfboard-mda/dashboard/records-i",
    color: "from-indigo-500 to-purple-500",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    heroGradient: "from-indigo-600 via-indigo-700 to-purple-800",
  },
  INTAKE: {
    title: "Intake Admin",
    description: "Review and approve physical document bundles (batches) sequentially",
    icon: FileCheck,
    href: "/surfboard-mda/dashboard/intake",
    color: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    heroGradient: "from-orange-600 via-orange-700 to-amber-800",
  },
  RECORDS_II: {
    title: "Records II Admin",
    description:
      "Final approval and submission to OSSG - verify physical copies",
    icon: FolderCheck,
    href: "/surfboard-mda/dashboard/records-ii",
    color: "from-pink-500 to-rose-500",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    heroGradient: "from-pink-600 via-pink-700 to-rose-800",
  },
  ARCHIVE: {
    title: "Archive Admin",
    description:
      "Acknowledge and archive physically submitted plans",
    icon: Archive,
    href: "/surfboard-mda/dashboard/archive",
    color: "from-slate-500 to-gray-500",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    heroGradient: "from-slate-600 via-slate-700 to-gray-800",
  },
  SUPERADMIN: {
    title: "Super Admin",
    description:
      "Full access to all MDA departments and administrative functions",
    icon: Shield,
    href: "/surfboard-mda/dashboard",
    color: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    heroGradient: "from-slate-700 via-slate-800 to-gray-900",
  },
  MDA_SUPERADMIN: {
    title: "MDA Super Admin",
    description:
      "Oversight access to view all activities across all MDA departments",
    icon: Shield,
    href: "/surfboard-mda/dashboard",
    color: "from-orange-500 to-red-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    heroGradient: "from-orange-600 via-red-700 to-rose-800",
  },
};

const allQuickActions = [
  {
    role: "ACCOUNTS" as MDARole,
    title: "Accounts",
    description: "Review LASG payment receipts and approve batches",
    icon: Calculator,
    href: "/surfboard-mda/dashboard/accounts",
    color: "from-purple-500 to-violet-500",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    role: "CHARTING" as MDARole,
    title: "Charting",
    description: "Edit and confirm charting remarks for survey plans",
    icon: Map,
    href: "/surfboard-mda/dashboard/charting",
    color: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    role: "SURCON" as MDARole,
    title: "SURCON",
    description: "Verify pillar numbers and coordinates",
    icon: Compass,
    href: "/surfboard-mda/dashboard/surcon",
    color: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    role: "RECORDS_I" as MDARole,
    title: "Records I",
    description: "Review uploaded record copies for quality",
    icon: Archive,
    href: "/surfboard-mda/dashboard/records-i",
    color: "from-indigo-500 to-purple-500",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    role: "INTAKE" as MDARole,
    title: "Intake",
    description: "Process and approve physical batches",
    icon: FileCheck,
    href: "/surfboard-mda/dashboard/intake",
    color: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    role: "RECORDS_II" as MDARole,
    title: "Records II",
    description: "Final approval and lodge with OSSG",
    icon: FolderCheck,
    href: "/surfboard-mda/dashboard/records-ii",
    color: "from-pink-500 to-rose-500",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    role: "ARCHIVE" as MDARole,
    title: "Archive",
    description: "Receive and archive final physical plans",
    icon: Archive,
    href: "/surfboard-mda/dashboard/archive",
    color: "from-slate-500 to-gray-500",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

export default function MDADashboardHome() {
  const [userRole, setUserRole] = useState<MDARole | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pendingCounts, setPendingCounts] = useState({
    accounts: 0,
    charting: 0,
    surcon: 0,
    recordsI: 0,
    intake: 0,
    recordsII: 0,
    archive: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user data
        const userResult = await surfboardApi.session.get();
        if (userResult.success && userResult.data) {
          setUserRole(userResult.data.role as MDARole);
          setUserName(
            `${userResult.data.firstName} ${userResult.data.lastName}`
          );
        }

        // Get pending counts
        const countsResult = await surfboardApi.mda.pendingCounts();
        if (countsResult.success && countsResult.data) {
          setPendingCounts(countsResult.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const currentRole = userRole || "ACCOUNTS";
  const roleConfig = roleConfigs[currentRole];
  const isSuperAdmin =
    currentRole === "SUPERADMIN" || currentRole === "MDA_SUPERADMIN";

  // For specific roles, show their section prominently
  // For SUPERADMIN or MDA_SUPERADMIN, show all sections
  const quickActions = isSuperAdmin
    ? allQuickActions
    : [
      allQuickActions.find((a) => a.role === currentRole)!,
      ...allQuickActions.filter((a) => a.role !== currentRole),
    ];

  // Build stats based on role
  const getStats = () => {
    if (isSuperAdmin) {
      return [
        {
          title: "Accounts Pending",
          value: pendingCounts.accounts,
          icon: Calculator,
          color: "from-purple-500 to-purple-600",
          bgColor: "bg-purple-50",
          textColor: "text-purple-600",
          href: "/surfboard-mda/dashboard/accounts",
        },
        {
          title: "Charting Pending",
          value: pendingCounts.charting,
          icon: Map,
          color: "from-blue-500 to-blue-600",
          bgColor: "bg-blue-50",
          textColor: "text-blue-600",
          href: "/surfboard-mda/dashboard/charting",
        },
        {
          title: "SURCON Pending",
          value: pendingCounts.surcon,
          icon: Compass,
          color: "from-emerald-500 to-emerald-600",
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-600",
          href: "/surfboard-mda/dashboard/surcon",
        },
        {
          title: "Records I Pending",
          value: pendingCounts.recordsI,
          icon: Archive,
          color: "from-indigo-500 to-indigo-600",
          bgColor: "bg-indigo-50",
          textColor: "text-indigo-600",
          href: "/surfboard-mda/dashboard/records-i",
        },
        {
          title: "Intake Pending",
          value: pendingCounts.intake,
          icon: FileCheck,
          color: "from-orange-500 to-amber-500",
          bgColor: "bg-orange-50",
          textColor: "text-orange-600",
          href: "/surfboard-mda/dashboard/intake",
        },
        {
          title: "Records II Pending",
          value: pendingCounts.recordsII,
          icon: FolderCheck,
          color: "from-pink-500 to-pink-600",
          bgColor: "bg-pink-50",
          textColor: "text-pink-600",
          href: "/surfboard-mda/dashboard/records-ii",
        },
        {
          title: "Archive Pending",
          value: pendingCounts.archive,
          icon: Archive,
          color: "from-slate-500 to-slate-600",
          bgColor: "bg-slate-50",
          textColor: "text-slate-600",
          href: "/surfboard-mda/dashboard/archive",
        },
      ];
    }

    // For specific roles, show their pending count prominently
    const roleStatMap: Record<
      string,
      { key: keyof typeof pendingCounts; title: string }
    > = {
      ACCOUNTS: { key: "accounts", title: "Batches Pending Review" },
      CHARTING: { key: "charting", title: "Plans Pending Charting" },
      SURCON: { key: "surcon", title: "Plans Pending SURCON" },
      RECORDS_I: { key: "recordsI", title: "Plans Pending Records I" },
      INTAKE: { key: "intake", title: "Batches Pending Intake Review" },
      RECORDS_II: { key: "recordsII", title: "Plans Ready for Final Approval" },
      ARCHIVE: { key: "archive", title: "Plans Pending Archive" },
    };

    const roleStat = roleStatMap[currentRole];
    return [
      {
        title: roleStat.title,
        value: pendingCounts[roleStat.key],
        icon: roleConfig.icon,
        color: roleConfig.color,
        bgColor: roleConfig.iconBg,
        textColor: roleConfig.iconColor,
        href: roleConfig.href,
        isPrimary: true,
      },
    ];
  };

  const stats = getStats();

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${roleConfig.heroGradient} p-8 mb-8 shadow-xl`}
      >
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-10" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-10" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <roleConfig.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {roleConfig.title}
                </h1>
                {userName && (
                  <p className="text-white/70 text-sm mt-1">
                    Welcome back, {userName}
                  </p>
                )}
              </div>
            </div>
            <p className="text-white/90 text-lg max-w-2xl mt-4">
              {roleConfig.description}
            </p>

            {!isSuperAdmin && (
              <Link href={roleConfig.href}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-6 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  Go to {roleConfig.title.split(" ")[0]} Dashboard
                  <ArrowUpRight className="w-5 h-5" />
                </motion.button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        className={`grid gap-6 mb-8 ${isSuperAdmin
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
          : "grid-cols-1"
          }`}
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group"
            >
              <Link href={stat.href}>
                <div
                  className={`relative overflow-hidden rounded-2xl bg-white dark:bg-white/3 p-6 shadow-md dark:shadow-none hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 cursor-pointer ${(stat as any).isPrimary
                    ? "ring-2 ring-offset-2 dark:ring-offset-[#0B1A26] ring-purple-500"
                    : ""
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                  <div>
                    <div
                      className={`font-bold text-gray-900 dark:text-white mb-1 ${(stat as any).isPrimary ? "text-5xl" : "text-3xl"
                        }`}
                    >
                      {stat.value.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {stat.title}
                    </div>
                  </div>
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r ${stat.color}`}
                  />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions - Show all for SUPERADMIN, or other sections for specific roles */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isSuperAdmin ? "All Departments" : "Other Departments"}
          </h2>
          <Layers className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isSuperAdmin ? quickActions : quickActions.slice(1)).map(
            (action, index) => {
              const Icon = action.icon;
              const pendingCount =
                pendingCounts[
                action.role === "RECORDS_I"
                  ? "recordsI"
                  : action.role === "RECORDS_II"
                    ? "recordsII"
                    : (action.role.toLowerCase() as keyof typeof pendingCounts)
                ];

              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={action.href}>
                    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-white/3 p-6 shadow-md dark:shadow-none hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-xl ${action.iconBg} group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className={`w-6 h-6 ${action.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                              {action.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              {pendingCount > 0 && (
                                <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full">
                                  {pendingCount} pending
                                </span>
                              )}
                              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`absolute inset-0 bg-linear-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            }
          )}

          {/* Profile Settings Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: quickActions.length * 0.05 }}
          >
            <Link href="/surfboard-mda/dashboard/profile">
              <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-white/3 p-6 shadow-md dark:shadow-none hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/10 cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-500/20 group-hover:scale-110 transition-transform duration-300">
                    <User className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                        Profile & Settings
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      Manage your account and preferences
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-linear-to-br from-slate-500 to-gray-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Role-specific guidance */}
      {!isSuperAdmin && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Your Role: {roleConfig.title}
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {currentRole === "ACCOUNTS" &&
                  "Review LASG payment receipts and approve or disapprove batches. After approval, plans become available to other MDA roles."}
                {currentRole === "CHARTING" &&
                  "Review and edit charting remarks from the LASG dataset. Copy or type the final charting remarks for each plan."}
                {currentRole === "SURCON" &&
                  "Verify that pillar numbers and coordinates match the SURCON database. Approve or query plans as needed."}
                {currentRole === "RECORDS_I" &&
                  "Review the uploaded record copies for quality and completeness. Approve or query plans based on document quality."}
                {currentRole === "RECORDS_II" &&
                  "Verify physical record copies match uploaded versions. This is the final step before lodging with OSSG."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
