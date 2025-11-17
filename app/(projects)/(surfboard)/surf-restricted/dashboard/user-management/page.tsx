"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  maxPlans: number;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
}

interface UserSubscription {
  id: string;
  planId: string;
  status: "active" | "canceled" | "expired" | "pending";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  usedPlans: number;
  maxPlans: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended" | "pending";
  lastLogin: string;
  createdAt: string;
  department: string;
  permissions: string[];
  loginCount: number;
  isOnline: boolean;
  subscription?: UserSubscription;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const router = useRouter();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [editingSubscription, setEditingSubscription] = useState<{
    userId: string;
    subscription: UserSubscription | null;
  } | null>(null);

  useEffect(() => {
    // Simulate fetching users and roles data
    const fetchData = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock users data
      const mockUsers: User[] = [
        {
          id: "1",
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@company.com",
          role: "ADMIN",
          status: "active",
          lastLogin: "2024-01-15T10:30:00Z",
          createdAt: "2023-06-15T08:00:00Z",
          department: "Survey Operations",
          permissions: [
            "view_plans",
            "create_plans",
            "approve_plans",
            "manage_users",
          ],
          loginCount: 156,
          isOnline: true,
        },
        {
          id: "2",
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@company.com",
          role: "SUPERADMIN",
          status: "active",
          lastLogin: "2024-01-15T09:15:00Z",
          createdAt: "2023-03-10T10:00:00Z",
          department: "System Administration",
          permissions: [
            "view_plans",
            "create_plans",
            "approve_plans",
            "manage_users",
            "system_settings",
            "security_controls",
          ],
          loginCount: 289,
          isOnline: false,
        },
        {
          id: "3",
          firstName: "Mike",
          lastName: "Wilson",
          email: "mike.wilson@company.com",
          role: "USER",
          status: "active",
          lastLogin: "2024-01-14T16:45:00Z",
          createdAt: "2023-09-20T14:30:00Z",
          department: "Field Survey",
          permissions: ["view_plans", "create_plans"],
          loginCount: 89,
          isOnline: true,
        },
        {
          id: "4",
          firstName: "Lisa",
          lastName: "Chen",
          email: "lisa.chen@company.com",
          role: "ADMIN",
          status: "inactive",
          lastLogin: "2024-01-10T11:20:00Z",
          createdAt: "2023-07-05T09:15:00Z",
          department: "Data Management",
          permissions: ["view_plans", "create_plans", "approve_plans"],
          loginCount: 134,
          isOnline: false,
        },
        {
          id: "5",
          firstName: "David",
          lastName: "Brown",
          email: "david.brown@company.com",
          role: "USER",
          status: "suspended",
          lastLogin: "2024-01-08T13:10:00Z",
          createdAt: "2023-11-12T16:45:00Z",
          department: "Field Survey",
          permissions: ["view_plans"],
          loginCount: 45,
          isOnline: false,
        },
        {
          id: "6",
          firstName: "Emma",
          lastName: "Davis",
          email: "emma.davis@company.com",
          role: "USER",
          status: "pending",
          lastLogin: "Never",
          createdAt: "2024-01-15T08:30:00Z",
          department: "Survey Operations",
          permissions: [],
          loginCount: 0,
          isOnline: false,
        },
      ];

      // Mock roles data
      const mockRoles: Role[] = [
        {
          id: "1",
          name: "USER",
          description:
            "Basic user with limited access to view and create plans",
          permissions: ["view_plans", "create_plans"],
          userCount: 245,
        },
        {
          id: "2",
          name: "ADMIN",
          description:
            "Administrator with management capabilities and plan approval",
          permissions: [
            "view_plans",
            "create_plans",
            "approve_plans",
            "manage_users",
          ],
          userCount: 23,
        },
        {
          id: "3",
          name: "SUPERADMIN",
          description:
            "Super administrator with full system access and security controls",
          permissions: [
            "view_plans",
            "create_plans",
            "approve_plans",
            "manage_users",
            "system_settings",
            "security_controls",
          ],
          userCount: 3,
        },
      ];

      setUsers(mockUsers);
      setRoles(mockRoles);
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      filterStatus === "all" || user.status === filterStatus;
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesRole && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      case "USER":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, status: newStatus as any } : user
      )
    );
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
  };

  // Add this new function to handle subscription updates
  const handleUpdateSubscription = async (
    subscriptionData: Partial<UserSubscription>
  ) => {
    if (!editingSubscription) return;

    try {
      // In a real app, you would call an API endpoint here
      // await updateUserSubscription(editingSubscription.userId, subscriptionData);

      // Update local state for demo purposes
      setUsers(
        users.map((user) => {
          if (user.id === editingSubscription.userId) {
            return {
              ...user,
              subscription: {
                ...(user.subscription || { id: `sub_${Date.now()}` }),
                ...subscriptionData,
              } as UserSubscription,
            };
          }
          return user;
        })
      );

      toast.success("Subscription updated successfully");
      setShowSubscriptionModal(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Failed to update subscription");
    }
  };

  // Add this function to open the subscription modal
  const openSubscriptionModal = (user: User) => {
    setEditingSubscription({
      userId: user.id,
      subscription: user.subscription || null,
    });

    // In a real app, you would fetch available plans from an API
    setAvailablePlans([
      {
        id: "basic",
        name: "Basic",
        description: "Perfect for individual surveyors",
        maxPlans: 10,
        price: 29.99,
        billingCycle: "monthly",
        features: [
          "Up to 10 survey plans",
          "Basic support",
          "Email notifications",
        ],
      },
      {
        id: "pro",
        name: "Professional",
        description: "For professional survey teams",
        maxPlans: 50,
        price: 99.99,
        billingCycle: "monthly",
        features: ["Up to 50 survey plans", "Priority support", "API access"],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        description: "For large organizations",
        maxPlans: 500,
        price: 499.99,
        billingCycle: "monthly",
        features: [
          "Unlimited survey plans",
          "24/7 support",
          "Dedicated account manager",
        ],
      },
    ]);

    setShowSubscriptionModal(true);
  };

  // Add this function to render the subscription status badge
  const renderSubscriptionStatus = (user: User) => {
    if (!user.subscription) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          No Subscription
        </span>
      );
    }

    const statusColors = {
      active: "bg-green-100 text-green-800",
      canceled: "bg-yellow-100 text-yellow-800",
      expired: "bg-red-100 text-red-800",
      pending: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusColors[user.subscription.status]
        }`}
      >
        {user.subscription.status.charAt(0).toUpperCase() +
          user.subscription.status.slice(1)}
      </span>
    );
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
                  Manage users, roles, permissions, and access controls
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create User
                </button>
                <button
                  onClick={() => setShowCreateRole(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Role
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

          {/* Stats Overview */}
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
                    {users.length}
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
                    {users.filter((u) => u.status === "active").length}
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Online Now
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter((u) => u.isOnline).length}
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
                  <p className="text-sm font-medium text-gray-600">
                    Total Roles
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {roles.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
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
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
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
                  <option value="SUPERADMIN">SuperAdmin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                </select>
              </div>

              <div className="flex items-end">
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Export Users
                </button>
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
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
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
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.firstName[0]}
                                {user.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                              {user.isOnline && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Online
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              Created:{" "}
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderSubscriptionStatus(user)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.lastLogin === "Never"
                          ? "Never"
                          : new Date(user.lastLogin).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.department}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View
                          </button>
                          <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                            Edit
                          </button>
                          {user.status === "active" ? (
                            <button
                              onClick={() =>
                                handleStatusChange(user.id, "suspended")
                              }
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleStatusChange(user.id, "active")
                              }
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => openSubscriptionModal(user)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Manage Subscription"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              />
                            </svg>
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                            Department
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.department}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Created Date
                          </label>
                          <p className="text-gray-900">
                            {new Date(
                              selectedUser.createdAt
                            ).toLocaleDateString()}
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
                            Status
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              selectedUser.status
                            )}`}
                          >
                            {selectedUser.status.toUpperCase()}
                          </span>
                        </div>
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
                            Last Login
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.lastLogin === "Never"
                              ? "Never"
                              : new Date(
                                  selectedUser.lastLogin
                                ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Login Count
                          </label>
                          <p className="text-gray-900">
                            {selectedUser.loginCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Permissions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.permissions.map((permission, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Edit User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create User Modal */}
          {showCreateUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Create New User
                    </h2>
                    <button
                      onClick={() => setShowCreateUser(false)}
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
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPERADMIN">SuperAdmin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Department
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Create User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Role Modal */}
          {showCreateRole && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Create New Role
                    </h2>
                    <button
                      onClick={() => setShowCreateRole(false)}
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
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Role Name
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Permissions
                      </label>
                      <div className="mt-2 space-y-2">
                        {[
                          "view_plans",
                          "create_plans",
                          "approve_plans",
                          "manage_users",
                          "system_settings",
                          "security_controls",
                        ].map((permission) => (
                          <label key={permission} className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {permission}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setShowCreateRole(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Create Role
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSubscriptionModal && editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  <span className="sr-only">Close</span>
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

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-4">
                  SELECT A PLAN
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availablePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        editingSubscription.subscription?.planId === plan.id
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() =>
                        handleUpdateSubscription({
                          planId: plan.id,
                          maxPlans: plan.maxPlans,
                          status: "active",
                          startDate: new Date().toISOString(),
                          endDate: new Date(
                            Date.now() + 30 * 24 * 60 * 60 * 1000
                          ).toISOString(),
                          autoRenew: true,
                          usedPlans: 0,
                        })
                      }
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {plan.name}
                          </h5>
                          <p className="text-sm text-gray-500">
                            {plan.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">
                            ${plan.price}
                          </span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center">
                            <svg
                              className="h-5 w-5 text-green-500 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {editingSubscription.subscription && (
                  <div className="mt-8">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">
                      SUBSCRIPTION DETAILS
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-medium">
                            {editingSubscription.subscription.status
                              .charAt(0)
                              .toUpperCase() +
                              editingSubscription.subscription.status.slice(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Plan Usage</p>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{
                                  width: `${
                                    (editingSubscription.subscription
                                      .usedPlans /
                                      editingSubscription.subscription
                                        .maxPlans) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {editingSubscription.subscription.usedPlans} of{" "}
                              {editingSubscription.subscription.maxPlans} plans
                              used
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Billing Cycle</p>
                          <p className="font-medium">Monthly</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">
                            Next Billing Date
                          </p>
                          <p className="font-medium">
                            {new Date(
                              editingSubscription.subscription.endDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-4">
                        <button
                          onClick={() =>
                            handleUpdateSubscription({
                              status:
                                editingSubscription.subscription?.status ===
                                "active"
                                  ? "canceled"
                                  : "active",
                            })
                          }
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            editingSubscription.subscription?.status ===
                            "active"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {editingSubscription.subscription?.status === "active"
                            ? "Cancel Subscription"
                            : "Reactivate Subscription"}
                        </button>

                        <button
                          onClick={() =>
                            handleUpdateSubscription({
                              autoRenew:
                                !editingSubscription.subscription?.autoRenew,
                            })
                          }
                          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                        >
                          {editingSubscription.subscription?.autoRenew
                            ? "Turn Off Auto-Renew"
                            : "Turn On Auto-Renew"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setEditingSubscription(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // In a real app, you would save the subscription here
                    setShowSubscriptionModal(false);
                    setEditingSubscription(null);
                    toast.success("Subscription updated successfully");
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
