"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getAllUsers,
  getUserStats,
  updateUserRole,
  updateUserStatus,
  createAdmin,
} from "../../../actions/adminActions";
import { SurfboardRole } from "@prisma/client";
import { Users, UserPlus, Search, Shield, Filter } from "lucide-react";

interface User {
  id: string;
  kindeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SurfboardRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  plansCount: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  mdaUsers: number;
}

export default function MDAUserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddMDAUserModal, setShowAddMDAUserModal] = useState(false);
  const router = useRouter();

  // Add/Edit MDA User form state
  const [mdaUserForm, setMdaUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "RECORDS_I" as SurfboardRole,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResult, statsResult] = await Promise.all([
        getAllUsers(),
        getUserStats(),
      ]);

      if (usersResult.success && usersResult.users) {
        // Filter only MDA users
        const mdaUsers = usersResult.users.filter((user) =>
          [
            "RECORDS_I",
            "RECORDS_II",
            "ACCOUNTS",
            "CHARTING",
            "SURCON",
          ].includes(user.role)
        );
        setUsers(mdaUsers);

        // Calculate MDA-specific stats
        setStats({
          totalUsers: mdaUsers.length,
          activeUsers: mdaUsers.filter((u) => u.isActive).length,
          inactiveUsers: mdaUsers.filter((u) => !u.isActive).length,
          mdaUsers: mdaUsers.length,
        });
      } else {
        toast.error(usersResult.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load MDA user data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive);
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

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

  const handleAddMDAUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createAdmin(mdaUserForm);
    if (result.success) {
      toast.success(result.message);
      setShowAddMDAUserModal(false);
      setMdaUserForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "RECORDS_I",
      });
      fetchData();
    } else {
      toast.error(result.error);
    }
  };

  const getRoleColor = (role: SurfboardRole) => {
    switch (role) {
      case "RECORDS_I":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "RECORDS_II":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "ACCOUNTS":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CHARTING":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "SURCON":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleName = (role: SurfboardRole) => {
    switch (role) {
      case "RECORDS_I":
        return "Records I";
      case "RECORDS_II":
        return "Records II";
      case "ACCOUNTS":
        return "Accounts";
      case "CHARTING":
        return "Charting";
      case "SURCON":
        return "SURCON";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MDA users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-linear-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl shadow-xl p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-purple-300" />
              <h1 className="text-3xl font-bold text-white">
                MDA User Management
              </h1>
            </div>
            <p className="text-purple-100 text-lg">
              Manage Ministry, Department & Agency user accounts
            </p>
          </div>
          <button
            onClick={() => setShowAddMDAUserModal(true)}
            className="px-6 py-3 bg-white text-purple-700 rounded-lg hover:bg-purple-50 transition-colors font-semibold flex items-center gap-2 shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            Add MDA User
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total MDA Users
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
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

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Records Dept
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    users.filter(
                      (u) => u.role === "RECORDS_I" || u.role === "RECORDS_II"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-teal-100 text-teal-600">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00 2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Other Depts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    users.filter((u) =>
                      ["ACCOUNTS", "CHARTING", "SURCON"].includes(u.role)
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              <option value="RECORDS_I">Records I</option>
              <option value="RECORDS_II">Records II</option>
              <option value="ACCOUNTS">Accounts</option>
              <option value="CHARTING">Charting</option>
              <option value="SURCON">SURCON</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            MDA Users ({filteredUsers.length})
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
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
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
                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
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
                      className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full border ${getRoleColor(
                        user.role
                      )} cursor-pointer`}
                    >
                      <option value="RECORDS_I">Records I</option>
                      <option value="RECORDS_II">Records II</option>
                      <option value="ACCOUNTS">Accounts</option>
                      <option value="CHARTING">Charting</option>
                      <option value="SURCON">SURCON</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleStatusToggle(user.id, user.isActive)}
                      className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add MDA User Modal */}
      {showAddMDAUserModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New MDA User
              </h2>
            </div>
            <form onSubmit={handleAddMDAUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={mdaUserForm.firstName}
                  onChange={(e) =>
                    setMdaUserForm({
                      ...mdaUserForm,
                      firstName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={mdaUserForm.lastName}
                  onChange={(e) =>
                    setMdaUserForm({ ...mdaUserForm, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={mdaUserForm.email}
                  onChange={(e) =>
                    setMdaUserForm({ ...mdaUserForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={mdaUserForm.role}
                  onChange={(e) =>
                    setMdaUserForm({
                      ...mdaUserForm,
                      role: e.target.value as SurfboardRole,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="RECORDS_I">Records I</option>
                  <option value="RECORDS_II">Records II</option>
                  <option value="ACCOUNTS">Accounts</option>
                  <option value="CHARTING">Charting</option>
                  <option value="SURCON">SURCON</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMDAUserModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  User Details: {selectedUser.firstName} {selectedUser.lastName}
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
                      <span
                        className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full border ${getRoleColor(
                          selectedUser.role
                        )}`}
                      >
                        {getRoleName(selectedUser.role)}
                      </span>
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
                        Created
                      </label>
                      <p className="text-gray-900">
                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
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
    </div>
  );
}
