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
  XCircle,
  ArrowUpRight,
  Layers,
  Database,
  Eye,
} from "lucide-react";
import { SURFBOARD_COLORS, surfboardStatusBadgeStyle } from "@/surfboard/colors";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { StatCard } from "@/components/dashboard/StatCard";

const HERO_GRADIENT = `linear-gradient(135deg, ${SURFBOARD_COLORS.primary.dark} 0%, ${SURFBOARD_COLORS.primary.main} 55%, ${SURFBOARD_COLORS.secondary.dark} 130%)`;
const ACCENT_GRADIENT = `linear-gradient(90deg, ${SURFBOARD_COLORS.primary.main} 0%, ${SURFBOARD_COLORS.secondary.main} 100%)`;

const STAT_TONES = ["brand", "info", "warning", "success"] as const;

// Simple counter animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

export default function RestrictedDashboardHome() {
  // Mock statistics - replace with real data from your API
  const totalPlans = useCountUp(1247);
  const totalUsers = useCountUp(342);
  const pendingReviews = useCountUp(28);
  const activePlans = useCountUp(892);

  const stats = [
    {
      title: "Total Plans",
      value: totalPlans,
      change: "+12.3%",
      trend: "up",
      icon: Database,
    },
    {
      title: "Active Users",
      value: totalUsers,
      change: "+8.1%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Pending Reviews",
      value: pendingReviews,
      change: "-3.2%",
      trend: "down",
      icon: Clock,
    },
    {
      title: "Active Plans",
      value: activePlans,
      change: "+15.7%",
      trend: "up",
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
    // {
    //   title: "Security & Permissions",
    //   description: "Configure security settings and access policies",
    //   icon: Shield,
    //   href: "/surfboard-restricted/dashboard/secure-plans",
    //   color: "from-rose-500 to-pink-500",
    //   iconBg: "bg-rose-100",
    //   iconColor: "text-rose-600",
    // },
    // {
    //   title: "System Settings",
    //   description: "Manage platform configuration and preferences",
    //   icon: Settings,
    //   href: "/surfboard-restricted/dashboard/settings",
    //   color: "from-slate-500 to-gray-600",
    //   iconBg: "bg-slate-100",
    //   iconColor: "text-slate-600",
    // },
    // {
    //   title: "SuperAdmin Panel",
    //   description: "Access advanced system-wide controls",
    //   icon: Zap,
    //   href: "/surfboard-restricted/dashboard/superadmin",
    //   color: "from-amber-500 to-orange-500",
    //   iconBg: "bg-amber-100",
    //   iconColor: "text-amber-600",
    // },
  ];

  const recentActivity = [
    {
      type: "success" as const,
      icon: CheckCircle2,
      message: "Survey plan SP-2024-1243 approved by John Doe",
      time: "2 minutes ago",
    },
    {
      type: "warning" as const,
      icon: AlertTriangle,
      message: "Pending review: 5 new survey submissions",
      time: "15 minutes ago",
    },
    {
      type: "info" as const,
      icon: Eye,
      message: "New user registration: jane.smith@example.com",
      time: "1 hour ago",
    },
    {
      type: "error" as const,
      icon: XCircle,
      message: "Survey plan SP-2024-1189 flagged for review",
      time: "2 hours ago",
    },
    {
      type: "success" as const,
      icon: CheckCircle2,
      message: "System backup completed successfully",
      time: "3 hours ago",
    },
  ];

  return (
    <div className="min-h-full">
      <DashboardHero
        greeting="Admin control center"
        title="Admin Dashboard"
        description="Manage survey plans, users, and system settings with comprehensive oversight and analytics."
        pills={[`${totalPlans.toLocaleString()} Plans`, `${totalUsers} Users`, `${pendingReviews} Pending`]}
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
              value={stat.value.toLocaleString()}
              icon={stat.icon}
              tone={STAT_TONES[index % STAT_TONES.length]}
              accent={{ main: SURFBOARD_COLORS.primary.main, light: SURFBOARD_COLORS.primary.light }}
              trend={{ value: stat.change, direction: stat.trend as "up" | "down" }}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
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
                          style={{ backgroundColor: SURFBOARD_COLORS.surface.main }}
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
              <AnimatePresence>
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-200"
                    >
                      <div className="flex gap-3">
                        <div
                          className="p-2 rounded-lg shrink-0"
                          style={surfboardStatusBadgeStyle(activity.type)}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 mb-1 leading-relaxed">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.time}
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
                href="/surfboard-restricted/dashboard/analytics"
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
