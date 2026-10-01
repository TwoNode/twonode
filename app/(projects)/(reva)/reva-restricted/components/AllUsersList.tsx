"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { revaApi } from "@/reva/apiClient";
import { CalendarIcon, ClockIcon, Search } from "lucide-react";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  emailVerified: boolean;
  is_active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count: {
    properties: number;
  };
}

interface UserListFilters {
  role: string;
}

export default function AllUsersList() {
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);

  const {
    items: filteredUsers,
    total,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: searchTerm,
    setSearch: setSearchTerm,
    filters,
    setFilters,
    reload,
  } = useServerList<User, UserListFilters>(
    async ({ page, pageSize, search, filters }) =>
      revaApi.admin.users.listPaginated({
        page,
        pageSize,
        search: search || undefined,
        scope: filters.role === "admins" || filters.role === "users" ? filters.role : "all",
      }),
    { initialFilters: { role: "all" } }
  );
  const selectedRole = filters.role;
  const setSelectedRole = (role: string) => setFilters({ role });

  const handleMakeUserAdmin = async (
    userId: string,
    role: "ADMIN" | "SUPERADMIN"
  ) => {
    setActionUserId(userId);
    setActionType("make-admin");
    try {
      const result = await revaApi.admin.users.promote(userId, role);
      if (result.success) {
        toast.success("User upgraded to admin successfully");
        reload();
      } else {
        toast.error(result.error || "Failed to make user admin");
      }
    } catch (error) {
      console.error("Error making user admin:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setActionUserId(null);
      setActionType(null);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    setActionUserId(userId);
    setActionType("deactivate");
    try {
      const result = await revaApi.admin.users.setActive(userId, false);
      if (result.success) {
        toast.success("User deactivated successfully");
        reload();
      } else {
        toast.error(result.error || "Failed to deactivate user");
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setActionUserId(null);
      setActionType(null);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    setActionUserId(userId);
    setActionType("reactivate");
    try {
      const result = await revaApi.admin.users.setActive(userId, true);
      if (result.success) {
        toast.success("User reactivated successfully");
        reload();
      } else {
        toast.error(result.error || "Failed to reactivate user");
      }
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setActionUserId(null);
      setActionType(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionUserId(userId);
    setActionType("delete");
    try {
      const result = await revaApi.admin.users.remove(userId);
      if (result.success) {
        toast.success("User deleted successfully");
        reload();
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setActionUserId(null);
      setActionType(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  //   if (isLoading) {
  //     return (
  //       <Card>
  //         <CardContent className="p-6">
  //           <div className="flex items-center justify-center">
  //             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  //             <span className="ml-2">Loading users...</span>
  //           </div>
  //         </CardContent>
  //       </Card>
  //     );
  //   }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col xl:flex-row max-xl:xl:items-start sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-nowrap text-xl font-bold text-gray-900 dark:text-white">
              All Users ({total})
            </CardTitle>
            <CardDescription>
              Manage all user accounts and their roles
            </CardDescription>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Role Filter */}
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="admins">Admins</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-col gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </h3>

                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={
                            user.role === "SUPERADMIN"
                              ? "destructive"
                              : user.role === "ADMIN"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {user.emailVerified && (
                          <Badge variant="outline">Verified</Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          Created: {formatDate(user.createdAt.toString())}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        <span>
                          Updated: {formatDate(user.updatedAt.toString())}
                        </span>
                      </div>
                      <span>Properties: {user._count.properties}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {/* Make Admin Button - only show for regular users */}
                    {user.role === "USER" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              actionUserId === user.id &&
                              actionType === "make-admin"
                            }
                          >
                            {actionUserId === user.id &&
                            actionType === "make-admin"
                              ? "Upgrading..."
                              : "Make Admin"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Make User Admin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to make{" "}
                              <strong>
                                {user.firstName} {user.lastName}
                              </strong>{" "}
                              an admin? This will give them administrative
                              privileges.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleMakeUserAdmin(user.id, "ADMIN")
                              }
                            >
                              Make Admin
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Activate/Deactivate Button */}
                    {user.is_active ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              actionUserId === user.id &&
                              actionType === "deactivate"
                            }
                          >
                            {actionUserId === user.id &&
                            actionType === "deactivate"
                              ? "Deactivating..."
                              : "Deactivate"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to deactivate{" "}
                              <strong>
                                {user.firstName} {user.lastName}
                              </strong>
                              ? This will prevent them from accessing the
                              system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeactivateUser(user.id)}
                            >
                              Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivateUser(user.id)}
                        disabled={
                          actionUserId === user.id &&
                          actionType === "reactivate"
                        }
                      >
                        {actionUserId === user.id && actionType === "reactivate"
                          ? "Reactivating..."
                          : "Reactivate"}
                      </Button>
                    )}

                    {/* Delete Button - only show for inactive users */}
                    {!user.is_active && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={
                              actionUserId === user.id &&
                              actionType === "delete"
                            }
                          >
                            {actionUserId === user.id && actionType === "delete"
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to permanently delete{" "}
                              <strong>
                                {user.firstName} {user.lastName}
                              </strong>
                              ? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} • {total} users
            </p>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
