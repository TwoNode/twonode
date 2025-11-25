"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Users,
  FileCheck,
  Shield,
  Settings,
  TrendingUp,
  Activity,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Layers,
  Database,
  Zap,
  Eye,
} from "lucide-react";

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
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Active Users",
      value: totalUsers,
      change: "+8.1%",
      trend: "up",
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      title: "Pending Reviews",
      value: pendingReviews,
      change: "-3.2%",
      trend: "down",
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      title: "Active Plans",
      value: activePlans,
      change: "+15.7%",
      trend: "up",
      icon: Activity,
      color: "from-violet-500 to-violet-600",
      bgColor: "bg-violet-50",
      textColor: "text-violet-600",
    },
  ];

  const quickActions = [
    {
      title: "Analytics Dashboard",
      description: "View comprehensive insights and data visualizations",
      icon: BarChart3,
      href: "/surf-restricted/dashboard/analytics",
      color: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "User Management",
      description: "Manage user roles, permissions, and access control",
      icon: Users,
      href: "/surf-restricted/dashboard/user-management",
      color: "from-emerald-500 to-teal-500",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Survey Plans",
      description: "Review, approve, and manage survey plans",
      icon: FileCheck,
      href: "/surf-restricted/dashboard/surf-plans",
      color: "from-violet-500 to-purple-500",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: "Security & Permissions",
      description: "Configure security settings and access policies",
      icon: Shield,
      href: "/surf-restricted/dashboard/secure-plans",
      color: "from-rose-500 to-pink-500",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      title: "System Settings",
      description: "Manage platform configuration and preferences",
      icon: Settings,
      href: "/surf-restricted/dashboard/settings",
      color: "from-slate-500 to-gray-600",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      title: "SuperAdmin Panel",
      description: "Access advanced system-wide controls",
      icon: Zap,
      href: "/surf-restricted/dashboard/superadmin",
      color: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  const recentActivity = [
    {
      type: "success",
      icon: CheckCircle2,
      message: "Survey plan SP-2024-1243 approved by John Doe",
      time: "2 minutes ago",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      type: "warning",
      icon: AlertTriangle,
      message: "Pending review: 5 new survey submissions",
      time: "15 minutes ago",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      type: "info",
      icon: Eye,
      message: "New user registration: jane.smith@example.com",
      time: "1 hour ago",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      type: "error",
      icon: XCircle,
      message: "Survey plan SP-2024-1189 flagged for review",
      time: "2 hours ago",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      type: "success",
      icon: CheckCircle2,
      message: "System backup completed successfully",
      time: "3 hours ago",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 mb-8 shadow-xl">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-20" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-20" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-8 h-8 text-cyan-300" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-blue-100 text-lg max-w-2xl">
              Welcome to the Surfboard administrative control center. Manage
              survey plans, users, and system settings with comprehensive
              oversight and analytics.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend === "up" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    <TrendingUp
                      className={`w-4 h-4 ${
                        stat.trend === "down" ? "rotate-180" : ""
                      }`}
                    />
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {stat.title}
                  </div>
                </div>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r ${stat.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
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
                    <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-xl ${action.iconBg} group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className={`w-6 h-6 ${action.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {action.title}
                            </h3>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">
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
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Recent Activity
            </h2>
            <Activity className="w-6 h-6 text-gray-400" />
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex gap-3">
                        <div
                          className={`p-2 rounded-lg ${activity.bgColor} shrink-0`}
                        >
                          <Icon className={`w-4 h-4 ${activity.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 mb-1 leading-relaxed">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
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
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <Link
                href="/surf-restricted/dashboard/analytics"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
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
