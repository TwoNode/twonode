"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getAllUsers,
  getUserStats,
  updateUserRole,
  updateUserStatus,
  updateUserSubscription,
  cancelUserSubscription,
  promoteToAdmin,
  createAdmin,
} from "../../../actions/adminActions";
import { SurfboardRole } from "@/prisma/generated";

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

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<User | null>(
    null
  );
  const [currentUserRole, setCurrentUserRole] = useState<SurfboardRole | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"admins" | "mda">("admins");
  const router = useRouter();

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
    fetchData();
    // Fetch current user role from session/context
    // For now, we'll check from the users list after fetching
    const checkCurrentUserRole = async () => {
      try {
        const usersResult = await getAllUsers();
        if (usersResult.success && usersResult.users) {
          // In production, this should come from auth context
          // For now, we'll assume superadmin if we can see all users
          setCurrentUserRole("SUPERADMIN");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };
    checkCurrentUserRole();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResult, statsResult] = await Promise.all([
        getAllUsers(),
        getUserStats(),
      ]);

      if (usersResult.success && usersResult.users) {
        setUsers(usersResult.users);
      } else {
        toast.error(usersResult.error || "Failed to fetch users");
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // Define admin and MDA roles
  const adminRoles: SurfboardRole[] = ["USER", "ADMIN", "SUPERADMIN"];
  const mdaRoles: SurfboardRole[] = [
    "RECORDS_I",
    "INTAKE",
    "RECORDS_II",
    "ACCOUNTS",
    "CHARTING",
    "SURCON",
    "ARCHIVE",
    "MDA_SUPERADMIN",
  ];

  // Filter users based on active tab
  const tabFilteredUsers = users.filter((user) => {
    if (activeTab === "admins") {
      return adminRoles.includes(user.role);
    } else {
      return mdaRoles.includes(user.role);
    }
  });

  const filteredUsers = tabFilteredUsers.filter((user) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive);
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false);

    return matchesStatus && matchesRole && matchesSearch;
  });

  const handleRoleChange = async (userId: string, newRole: SurfboardRole) => {
    const result = await updateUserRole({ userId, newRole });
    if (result.success) {
      toast.success(result.message);
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    const result = await updateUserStatus({ userId, isActive: !currentStatus });
    if (result.success) {
      toast.success(result.message);
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!confirm("Are you sure you want to promote this user to Admin?"))
      return;

    const result = await promoteToAdmin(userId);
    if (result.success) {
      toast.success(result.message);
      fetchData();
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

    const result = await updateUserSubscription({
      userId: editingSubscription.id,
      ...subscriptionForm,
    });

    if (result.success) {
      toast.success(result.message);
      setShowSubscriptionModal(false);
      setEditingSubscription(null);
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleCancelSubscription = async (userId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;

    const result = await cancelUserSubscription(userId);
    if (result.success) {
      toast.success(result.message);
      setShowSubscriptionModal(false);
      setEditingSubscription(null);
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createAdmin(newAdminForm);
    if (result.success) {
      toast.success(result.message);
      setShowAddAdminModal(false);
      setNewAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "ADMIN",
      });
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const getRoleColor = (role: SurfboardRole) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      case "USER":
        return "bg-green-100 text-green-800";
      case "RECORDS_I":
        return "bg-orange-100 text-orange-800";
      case "RECORDS_II":
        return "bg-orange-100 text-orange-800";
      case "ACCOUNTS":
        return "bg-yellow-100 text-yellow-800";
      case "CHARTING":
        return "bg-teal-100 text-teal-800";
      case "SURCON":
        return "bg-cyan-100 text-cyan-800";
      case "INTAKE":
        return "bg-amber-100 text-amber-800";
      case "ARCHIVE":
        return "bg-stone-100 text-stone-800";
      case "MDA_SUPERADMIN":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "canceled":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  User Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage users, roles, and subscriptions
                </p>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => setShowAddAdminModal(true)}
                  className="mr-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {activeTab === "admins" ? "Add New Admin" : "Add MDA User"}
                </button>
                <button
                  onClick={() => router.push("/surf-restricted/dashboard")}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("admins")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "admins"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
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
                    <p className="text-sm font-medium text-gray-600">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
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
                    <p className="text-sm font-medium text-gray-600">
                      Active Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.activeUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
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
                    <p className="text-sm font-medium text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.admins + stats.superAdmins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
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
                    <p className="text-sm font-medium text-gray-600">
                      Active Subscriptions
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.usersWithActiveSubscriptions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Users ({filteredUsers.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
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
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            {user.companyName && (
                              <div className="text-xs text-gray-400">
                                {user.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as SurfboardRole
                            )
                          }
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                            user.role
                          )} border-0 cursor-pointer`}
                        >
                          {activeTab === "admins" ? (
                            <>
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPERADMIN">SUPERADMIN</option>

                              <option value="RECORDS_I">Records I</option>
                              <option value="RECORDS_II">Records II</option>
                              <option value="ACCOUNTS">Accounts</option>
                              <option value="CHARTING">Charting</option>
                              <option value="SURCON">SURCON</option>
                              <option value="MDA_SUPERADMIN">
                                MDA Super Admin
                              </option>
                            </>
                          ) : (
                            <>
                              <option value="RECORDS_I">RECORDS_I</option>
                              <option value="INTAKE">INTAKE</option>
                              <option value="RECORDS_II">RECORDS_II</option>
                              <option value="ACCOUNTS">ACCOUNTS</option>
                              <option value="CHARTING">CHARTING</option>
                              <option value="SURCON">SURCON</option>
                              <option value="ARCHIVE">ARCHIVE</option>
                              <option value="MDA_SUPERADMIN">
                                MDA_SUPERADMIN
                              </option>
                            </>
                          )}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            handleStatusToggle(user.id, user.isActive)
                          }
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
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
                            <div className="text-xs text-gray-500 mt-1">
                              ₦
                              {(
                                user.subscription.amount / 100
                              ).toLocaleString()}
                              /{user.subscription.interval}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            No Subscription
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.plansCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View
                          </button>
                          {user.role === "USER" && (
                            <button
                              onClick={() => handlePromoteToAdmin(user.id)}
                              className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                            >
                              Promote
                            </button>
                          )}
                          <button
                            onClick={() => openSubscriptionModal(user)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                            title="Manage Subscription"
                          >
                            Subscription
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Details Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      User Details: {selectedUser.firstName}{" "}
                      {selectedUser.lastName}
                    </h2>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-gray-600"
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        User Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.firstName} {selectedUser.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <p className="text-gray-900">{selectedUser.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Company
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.companyName || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            SURCON Number
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.surconRegNumber || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Account Status
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
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
                          <label className="text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedUser.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedUser.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Email Verified
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.emailVerified ? "Yes" : "No"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Total Plans
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.plansCount}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Created
                          </label>
                          <p className="text-gray-900">
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
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingSubscription.subscription
                        ? "Update Subscription"
                        : "Add Subscription"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowSubscriptionModal(false);
                        setEditingSubscription(null);
                      }}
                      className="text-gray-400 hover:text-gray-500"
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
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., PLN_basic"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Basic Plan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 500000 (₦5,000)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                        className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        Cancel Subscription
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowSubscriptionModal(false);
                        setEditingSubscription(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Add New Admin
                    </h3>
                    <button
                      onClick={() => setShowAddAdminModal(false)}
                      className="text-gray-400 hover:text-gray-500"
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
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
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
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
