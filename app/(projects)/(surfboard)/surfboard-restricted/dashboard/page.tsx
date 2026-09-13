"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Users,
  FileCheck,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  SURFBOARD_COLORS,
  surfboardStatusBadgeStyle,
} from "@/surfboard/colors";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { StatCard } from "@/components/dashboard/StatCard";
import { surfboardApi } from "@/surfboard/apiClient";
import type { StatCards } from "@/surfboard/services/analyticsService";

const HERO_GRADIENT = `linear-gradient(135deg, #0A0F16 0%, ${SURFBOARD_COLORS.primary.dark} 35%, ${SURFBOARD_COLORS.primary.main} 70%, ${SURFBOARD_COLORS.secondary.dark} 130%)`;
const ACCENT_GRADIENT = `linear-gradient(90deg, ${SURFBOARD_COLORS.primary.main} 0%, ${SURFBOARD_COLORS.secondary.main} 100%)`;

const STAT_TONES = ["brand", "info", "warning", "success"] as const;

interface UserStats {
  totalUsers: number;
  activeUsers: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string | Date;
  user?: { firstName: string; lastName: string } | null;
}

/** Buckets an audit-log action string into the same success/warning/error/info palette the old mock feed used. */
function activityTone(
  action: string,
): "success" | "warning" | "error" | "info" {
  if (/APPROVE|COMPLETE|VERIFY/i.test(action)) return "success";
  if (/QUERY|DISAPPROVE|REVOKE|DEACTIVATE/i.test(action)) return "warning";
  if (/DELETE|REJECT|FAIL/i.test(action)) return "error";
  return "info";
}

function activityIcon(tone: "success" | "warning" | "error" | "info") {
  if (tone === "success") return CheckCircle2;
  if (tone === "warning") return AlertTriangle;
  if (tone === "error") return AlertTriangle;
  return Activity;
}

export default function RestrictedDashboardHome() {
  const [statCards, setStatCards] = useState<StatCards | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [statsRes, usersRes, activityRes] = await Promise.all([
        surfboardApi.analytics.stats(),
        surfboardApi.admin.users.stats(),
        surfboardApi.admin.auditLogs.list({ page: 1, pageSize: 5 }),
      ]);
      if (statsRes.success) setStatCards(statsRes.data);
      if (usersRes.success) setUserStats(usersRes.data);
      if (activityRes.success) setRecentActivity(activityRes.data?.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = [
    {
      title: "Total Plans",
      value: statCards?.totalPlansCount ?? 0,
      icon: FileCheck,
    },
    { title: "Active Users", value: userStats?.activeUsers ?? 0, icon: Users },
    {
      title: "Pending Batches",
      value: statCards?.pendingBatchesCount ?? 0,
      icon: Clock,
    },
    {
      title: "Pending Certificates",
      value: statCards?.pendingCertificatePlansCount ?? 0,
      icon: Activity,
    },
  ];

  const quickActions = [
    {
      title: "Analytics Dashboard",
      description: "View comprehensive insights and data visualizations",
      icon: BarChart3,
      href: "/surfboard-restricted/dashboard/analytics",
    },
    {
      title: "User Management",
      description: "Manage user roles, permissions, and access control",
      icon: Users,
      href: "/surfboard-restricted/dashboard/user-management",
    },
    {
      title: "Survey Plans",
      description: "Review, approve, and manage survey plans",
      icon: FileCheck,
      href: "/surfboard-restricted/dashboard/surf-plans",
    },
  ];

  return (
    <div className="min-h-full">
      <DashboardHero
        greeting="Admin control center"
        title="Admin Dashboard"
        description="Manage survey plans, users, and system settings with comprehensive oversight and analytics."
        pills={[
          `${(statCards?.totalPlansCount ?? 0).toLocaleString()} Plans`,
          `${userStats?.totalUsers ?? 0} Users`,
          `${statCards?.pendingBatchesCount ?? 0} Pending`,
        ]}
        gradient={HERO_GRADIENT}
        className="mb-8"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <StatCard
              label={stat.title}
              value={loading ? "…" : stat.value.toLocaleString()}
              icon={stat.icon}
              tone={STAT_TONES[index % STAT_TONES.length]}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <Layers className="w-6 h-6 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
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
                          className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
                          style={{
                            backgroundColor: SURFBOARD_COLORS.surface.main,
                          }}
                        >
                          <Icon
                            className="w-6 h-6"
                            style={{ color: SURFBOARD_COLORS.primary.main }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-[#0077B6] transition-colors">
                              {action.title}
                            </h3>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#0077B6] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                        style={{ background: ACCENT_GRADIENT }}
                      />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <Activity className="w-6 h-6 text-gray-400" />
          </div>

          <div className="bg-white dark:bg-white/3 rounded-xl shadow-md dark:shadow-none border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {!loading && recentActivity.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No recent activity.
                </div>
              )}
              <AnimatePresence>
                {recentActivity.map((activity, index) => {
                  const tone = activityTone(activity.action);
                  const Icon = activityIcon(tone);
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
                    >
                      <div className="flex gap-3">
                        <div
                          className="p-2 rounded-lg shrink-0"
                          style={surfboardStatusBadgeStyle(tone)}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 mb-1 leading-relaxed">
                            {activity.action.replace(/_/g, " ")}
                            {activity.user
                              ? ` · ${activity.user.firstName} ${activity.user.lastName}`
                              : ""}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(activity.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
              <Link
                href="/surfboard-restricted/dashboard/audit-logs"
                className="text-sm font-medium text-[#0077B6] hover:text-[#023E8A] flex items-center gap-1 group"
              >
                View all activity
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
