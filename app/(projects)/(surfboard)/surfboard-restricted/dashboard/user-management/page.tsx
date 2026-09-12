"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { surfboardApi } from "@/surfboard/apiClient";
import { SurfboardRole } from "@/prisma/generated";
import { Eye, ArrowUpCircle, CreditCard } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/hooks/useConfirm";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/useViewMode";

interface Subscription {
  id?: string;
  planCode: string;
  planName: string;
  amount: number;
  interval: string;
  status: string;
  currentStart?: Date | null;
  currentEnd?: Date | null | string;
  nextPaymentDate?: Date | null;
}

interface User {
  id: string;
  kindeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SurfboardRole;
  isActive: boolean;
  emailVerified: boolean;
  companyName?: string | null;
  surconRegNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
  plansCount: number;
  subscription: Subscription | null;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  superAdmins: number;
  regularUsers: number;
  usersWithActiveSubscriptions: number;
}

interface UserFilters {
  roleGroup: "admins" | "mda";
  status: string;
  role: string;
}

export default function UserManagementPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<User | null>(
    null
  );
  const [currentUserRole, setCurrentUserRole] = useState<SurfboardRole | null>(
    null
  );
  const [viewMode, setViewMode] = useViewMode("user-management", "list");
  const router = useRouter();

  const {
    items: users,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: searchTerm,
    setSearch: setSearchTerm,
    filters,
    setFilters,
    reload,
  } = useServerList<User, UserFilters>(
    async ({ page, pageSize, search, filters }) =>
      surfboardApi.admin.users.list({
        page,
        pageSize,
        search: search || undefined,
        roleGroup: filters.roleGroup,
        role: filters.role !== "all" ? filters.role : undefined,
        status:
          filters.status === "active" || filters.status === "inactive"
            ? filters.status
            : undefined,
      }),
    { initialFilters: { roleGroup: "admins", status: "all", role: "all" } }
  );

  const activeTab = filters.roleGroup;
  const filterStatus = filters.status;
  const filterRole = filters.role;
  const setActiveTab = (tab: "admins" | "mda") =>
    setFilters({ roleGroup: tab, status: "all", role: "all" });
  const setFilterStatus = (status: string) =>
    setFilters((f) => ({ ...f, status }));
  const setFilterRole = (role: string) => setFilters((f) => ({ ...f, role }));

  const loadStats = async () => {
    const statsResult = await surfboardApi.admin.users.stats();
    if (statsResult.success) setStats(statsResult.data);
  };

  // Subscription form state
  const [subscriptionForm, setSubscriptionForm] = useState<Subscription>({
    planCode: "",
    planName: "",
    amount: 0,
    interval: "monthly",
    status: "active",
    currentEnd: null,
    nextPaymentDate: null,
  });

  // Add Admin form state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "ADMIN" as SurfboardRole,
  });

  useEffect(() => {
    loadStats();
    // Fetch current user role from session/context
    // For now, we'll check from the users list after fetching
    const checkCurrentUserRole = async () => {
      try {
        const usersResult = await surfboardApi.admin.users.list();
        if (usersResult.success) {
          // In production, this should come from auth context
          // For now, we'll assume superadmin if we can see all users
          setCurrentUserRole("SUPERADMIN");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };
    checkCurrentUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = async (userId: string, newRole: SurfboardRole) => {
    if (
      !(await confirm({
        title: `Change role to ${newRole}?`,
        description:
          "This immediately changes what this user can access — including admin or superadmin privileges if you're granting them.",
        confirmLabel: "Change role",
      }))
    )
      return;

    const result = await surfboardApi.admin.users.updateRole(userId, newRole);
    if (result.success) {
      toast.success(`User role updated to ${newRole}`);
      reload();
      loadStats();
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    if (
      !(await confirm({
        title: currentStatus ? "Deactivate this user?" : "Activate this user?",
        description: currentStatus
          ? "They'll immediately lose access to their account until reactivated."
          : "They'll immediately regain access to their account.",
        confirmLabel: currentStatus ? "Deactivate" : "Activate",
        variant: currentStatus ? "destructive" : "default",
      }))
    )
      return;

    const result = await surfboardApi.admin.users.setStatus(userId, !currentStatus);
    if (result.success) {
      toast.success(`User ${!currentStatus ? "activated" : "deactivated"} successfully`);
      reload();
      loadStats();
    } else {
      toast.error(result.error);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (
      !(await confirm({
        title: "Promote to Admin?",
        description:
          "Are you sure you want to promote this user to Admin? They will gain access to the admin dashboard.",
        confirmLabel: "Promote",
      }))
    )
      return;

    const result = await surfboardApi.admin.users.promote(userId);
    if (result.success) {
      toast.success("User promoted to Admin successfully");
      reload();
      loadStats();
    } else {
      toast.error(result.error);
    }
  };

  const openSubscriptionModal = (user: User) => {
    setEditingSubscription(user);
    if (user.subscription) {
      setSubscriptionForm({
        planCode: user.subscription.planCode,
        planName: user.subscription.planName,
        amount: user.subscription.amount,
        interval: user.subscription.interval,
        status: user.subscription.status,
        currentEnd: user.subscription.currentEnd,
      });
    } else {
      setSubscriptionForm({
        planCode: "",
        planName: "",
        amount: 0,
        interval: "monthly",
        status: "active",
        currentEnd: null,
      });
    }
    setShowSubscriptionModal(true);
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    if (
      !(await confirm({
        title: "Save subscription changes?",
        description: `This immediately changes ${editingSubscription.firstName || editingSubscription.email}'s plan, billing amount, and access — they'll see the new terms right away.`,
        confirmLabel: "Save changes",
      }))
    )
      return;

    const result = await surfboardApi.admin.users.updateSubscription(editingSubscription.id, subscriptionForm);

    if (result.success) {
      toast.success("Subscription updated successfully");
      setShowSubscriptionModal(false);
      setEditingSubscription(null);
      reload();
      loadStats();
    } else {
      toast.error(result.error);
    }
  };

  const handleCancelSubscription = async (userId: string) => {
    if (
      !(await confirm({
        title: "Cancel subscription?",
        description:
          "Are you sure you want to cancel this subscription? This action cannot be undone.",
        confirmLabel: "Cancel subscription",
        variant: "destructive",
      }))
    )
      return;

    const result = await surfboardApi.admin.users.cancelSubscription(userId);
    if (result.success) {
      toast.success("Subscription canceled successfully");
      setShowSubscriptionModal(false);
      setEditingSubscription(null);
      reload();
      loadStats();
    } else {
      toast.error(result.error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await surfboardApi.admin.users.create(newAdminForm);
    if (result.success) {
      toast.success("Admin user created successfully");
      setShowAddAdminModal(false);
      setNewAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "ADMIN",
      });
      reload();
      loadStats();
    } else {
      toast.error(result.error);
    }
  };

  const getRoleColor = (role: SurfboardRole) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300";
      case "ADMIN":
        return "bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300";
      case "USER":
        return "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300";
      case "RECORDS_I":
        return "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300";
      case "RECORDS_II":
        return "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300";
      case "ACCOUNTS":
        return "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300";
      case "CHARTING":
        return "bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300";
      case "SURCON":
        return "bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300";
      case "INTAKE":
        return "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300";
      case "ARCHIVE":
        return "bg-stone-100 dark:bg-stone-500/15 text-stone-800 dark:text-stone-300";
      case "MDA_SUPERADMIN":
        return "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-300";
    }
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300";
      case "canceled":
        return "bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300";
      case "expired":
        return "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-white/10 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background">
      {ConfirmDialog}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  User Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage users, roles, and subscriptions
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-0">
                <button
                  onClick={() => setShowAddAdminModal(true)}
                  className="sm:mr-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {activeTab === "admins" ? "Add New Admin" : "Add MDA User"}
                </button>
                <button
                  onClick={() => router.push("/surfboard-restricted/dashboard")}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg mb-8">
            <div className="border-b border-gray-200 dark:border-white/10 overflow-x-auto">
              <nav className="flex space-x-8 px-6 w-max min-w-full">
                <button
                  onClick={() => setActiveTab("admins")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "admins"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Admins
                </button>
                {currentUserRole === "SUPERADMIN" && (
                  <button
                    onClick={() => setActiveTab("mda")}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "mda"
                        ? "border-purple-500 text-purple-600"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    MDA Users
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Active Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.activeUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.admins + stats.superAdmins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-surface rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>

                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Active Subscriptions
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.usersWithActiveSubscriptions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md bg-white dark:bg-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  {activeTab === "admins" ? (
                    <>
                      <option value="SUPERADMIN">SuperAdmin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="USER">User</option>
                    </>
                  ) : (
                    <>
                      <option value="RECORDS_I">Records I</option>
                      <option value="INTAKE">Intake</option>
                      <option value="RECORDS_II">Records II</option>
                      <option value="ACCOUNTS">Accounts</option>
                      <option value="CHARTING">Charting</option>
                      <option value="SURCON">SURCON</option>
                      <option value="ARCHIVE">Archive</option>
                      <option value="MDA_SUPERADMIN">MDA Super Admin</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-surface rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Users ({total})
              </h2>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>

            {viewMode === "grid" ? (
              <div className="p-4">
                {users.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No users found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-4 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 h-10 w-10 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value as SurfboardRole)}
                          >
                            <SelectTrigger
                              className={`h-auto w-auto min-w-0 gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                                user.role
                              )} border-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeTab === "admins" ? (
                                <>
                                  <SelectItem value="USER">USER</SelectItem>
                                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                                  <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
                                  <SelectItem value="RECORDS_I">Records I</SelectItem>
                                  <SelectItem value="RECORDS_II">Records II</SelectItem>
                                  <SelectItem value="ACCOUNTS">Accounts</SelectItem>
                                  <SelectItem value="CHARTING">Charting</SelectItem>
                                  <SelectItem value="SURCON">SURCON</SelectItem>
                                  <SelectItem value="MDA_SUPERADMIN">MDA Super Admin</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="RECORDS_I">RECORDS_I</SelectItem>
                                  <SelectItem value="INTAKE">INTAKE</SelectItem>
                                  <SelectItem value="RECORDS_II">RECORDS_II</SelectItem>
                                  <SelectItem value="ACCOUNTS">ACCOUNTS</SelectItem>
                                  <SelectItem value="CHARTING">CHARTING</SelectItem>
                                  <SelectItem value="SURCON">SURCON</SelectItem>
                                  <SelectItem value="ARCHIVE">ARCHIVE</SelectItem>
                                  <SelectItem value="MDA_SUPERADMIN">MDA_SUPERADMIN</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>

                          <button
                            onClick={() => handleStatusToggle(user.id, user.isActive)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </button>
                        </div>

                        {user.subscription ? (
                          <div>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSubscriptionStatusColor(
                                user.subscription.status
                              )}`}
                            >
                              {user.subscription.planName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ₦{(user.subscription.amount / 100).toLocaleString()}/{user.subscription.interval}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex w-fit px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-full">
                            No Subscription
                          </span>
                        )}

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.plansCount} plan{user.plansCount === 1 ? "" : "s"}
                          {user.companyName ? ` • ${user.companyName}` : ""}
                        </div>

                        <div className="flex items-center justify-end gap-1 mt-auto pt-2 border-t border-gray-100 dark:border-white/10">
                          <button
                            onClick={() => setSelectedUser(user)}
                            title="View details"
                            className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user.role === "USER" && (
                            <button
                              onClick={() => handlePromoteToAdmin(user.id)}
                              title="Promote to admin"
                              className="p-1.5 rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openSubscriptionModal(user)}
                            title="Manage subscription"
                            className="p-1.5 rounded-md text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface divide-y divide-gray-200 dark:divide-white/10">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.firstName[0]}
                                {user.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                            {user.companyName && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {user.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleRoleChange(user.id, value as SurfboardRole)
                          }
                        >
                          <SelectTrigger
                            className={`h-auto w-auto min-w-0 gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                              user.role
                            )} border-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeTab === "admins" ? (
                              <>
                                <SelectItem value="USER">USER</SelectItem>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                                <SelectItem value="SUPERADMIN">
                                  SUPERADMIN
                                </SelectItem>
                                <SelectItem value="RECORDS_I">
                                  Records I
                                </SelectItem>
                                <SelectItem value="RECORDS_II">
                                  Records II
                                </SelectItem>
                                <SelectItem value="ACCOUNTS">
                                  Accounts
                                </SelectItem>
                                <SelectItem value="CHARTING">
                                  Charting
                                </SelectItem>
                                <SelectItem value="SURCON">SURCON</SelectItem>
                                <SelectItem value="MDA_SUPERADMIN">
                                  MDA Super Admin
                                </SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="RECORDS_I">
                                  RECORDS_I
                                </SelectItem>
                                <SelectItem value="INTAKE">INTAKE</SelectItem>
                                <SelectItem value="RECORDS_II">
                                  RECORDS_II
                                </SelectItem>
                                <SelectItem value="ACCOUNTS">
                                  ACCOUNTS
                                </SelectItem>
                                <SelectItem value="CHARTING">
                                  CHARTING
                                </SelectItem>
                                <SelectItem value="SURCON">SURCON</SelectItem>
                                <SelectItem value="ARCHIVE">
                                  ARCHIVE
                                </SelectItem>
                                <SelectItem value="MDA_SUPERADMIN">
                                  MDA_SUPERADMIN
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            handleStatusToggle(user.id, user.isActive)
                          }
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.subscription ? (
                          <div>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSubscriptionStatusColor(
                                user.subscription.status
                              )}`}
                            >
                              {user.subscription.planName}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              ₦
                              {(
                                user.subscription.amount / 100
                              ).toLocaleString()}
                              /{user.subscription.interval}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-full">
                            No Subscription
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {user.plansCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            title="View details"
                            className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user.role === "USER" && (
                            <button
                              onClick={() => handlePromoteToAdmin(user.id)}
                              title="Promote to admin"
                              className="p-1.5 rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openSubscriptionModal(user)}
                            title="Manage subscription"
                            className="p-1.5 rounded-md text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages} • {total} users
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
              </div>
            )}
          </div>

          {/* User Details Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      User Details: {selectedUser.firstName}{" "}
                      {selectedUser.lastName}
                    </h2>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        User Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Full Name
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedUser.firstName} {selectedUser.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Company
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedUser.companyName || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            SURCON Number
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedUser.surconRegNumber || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Account Status
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Role
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                              selectedUser.role
                            )}`}
                          >
                            {selectedUser.role}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedUser.isActive
                                ? "bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300"
                            }`}
                          >
                            {selectedUser.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Verified
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedUser.emailVerified ? "Yes" : "No"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Total Plans
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {selectedUser.plansCount}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Created
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {new Date(
                              selectedUser.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="px-4 py-2 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Management Modal */}
          {showSubscriptionModal && editingSubscription && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-surface rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {editingSubscription.subscription
                        ? "Update Subscription"
                        : "Add Subscription"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowSubscriptionModal(false);
                        setEditingSubscription(null);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-500"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Plan Code
                      </label>
                      <input
                        type="text"
                        value={subscriptionForm.planCode}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            planCode: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., PLN_basic"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Plan Name
                      </label>
                      <input
                        type="text"
                        value={subscriptionForm.planName}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            planName: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Basic Plan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Amount (in kobo)
                      </label>
                      <input
                        type="number"
                        value={subscriptionForm.amount}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            amount: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 500000 (₦5,000)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Interval
                      </label>
                      <select
                        value={subscriptionForm.interval}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            interval: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={
                          subscriptionForm?.currentEnd instanceof Date
                            ? subscriptionForm.currentEnd
                                .toISOString()
                                .split("T")[0]
                            : (subscriptionForm?.currentEnd as string) || ""
                        }
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            currentEnd: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </label>
                      <select
                        value={subscriptionForm.status}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            status: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="canceled">Canceled</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    {editingSubscription.subscription && (
                      <button
                        onClick={() =>
                          handleCancelSubscription(editingSubscription.id)
                        }
                        className="px-4 py-2 border border-red-300 dark:border-red-500/30 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-surface hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Cancel Subscription
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowSubscriptionModal(false);
                        setEditingSubscription(null);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-white/15 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-surface hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleUpdateSubscription}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Admin Modal */}
          {showAddAdminModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-surface rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Add New Admin
                    </h3>
                    <button
                      onClick={() => setShowAddAdminModal(false)}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-500"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleAddAdmin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminForm.firstName}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            firstName: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminForm.lastName}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            lastName: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminForm.email}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            email: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {activeTab === "admins" ? "Role" : "Department"}
                      </label>
                      <select
                        value={newAdminForm.role}
                        onChange={(e) =>
                          setNewAdminForm({
                            ...newAdminForm,
                            role: e.target.value as SurfboardRole,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        {activeTab === "admins" ? (
                          <>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPERADMIN">Super Admin</option>
                          </>
                        ) : (
                          <>
                            <option value="RECORDS_I">Records I</option>
                            <option value="INTAKE">Intake</option>
                            <option value="RECORDS_II">Records II</option>
                            <option value="ACCOUNTS">Accounts</option>
                            <option value="CHARTING">Charting</option>
                            <option value="SURCON">SURCON</option>
                            <option value="ARCHIVE">Archive</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAddAdminModal(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-white/15 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-surface hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Create Admin
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
