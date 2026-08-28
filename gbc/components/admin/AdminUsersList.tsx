"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Trash2,
  UserX,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAdmin,
  updateAdminRole,
  toggleAdminStatus,
} from "@/app/(projects)/(GBC)/actions/admin-actions";
import { GBCRole } from "@/prisma/generated";
import { DeleteAdminModal } from "./DeleteAdminModal";
import { ConfirmToggleModal } from "./ConfirmToggleModal";

interface Admin {
  id: string;
  kindeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: "ADMIN" | "SUPERADMIN" | GBCRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  admins?: Admin[];
}

// Helper function to format relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  if (diffMonths > 0)
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return "Just now";
}

export function AdminUsersList({ admins: initialAdmins }: Props) {
  const [admins, setAdmins] = useState(initialAdmins || []);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  // Confirmation for activate/deactivate
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [adminToToggle, setAdminToToggle] = useState<Admin | null>(null);

  // Sync with parent component's filtered admins
  useEffect(() => {
    setAdmins(initialAdmins || []);
  }, [initialAdmins]);

  const handleRoleChange = async (
    adminId: string,
    newRole: "ADMIN" | "SUPERADMIN" | GBCRole
  ) => {
    setIsLoading(adminId);
    try {
      const result = await updateAdminRole(adminId, newRole);
      if (result.success) {
        setAdmins(
          admins.map((admin) =>
            admin.id === adminId ? { ...admin, role: newRole } : admin
          )
        );
        toast.success("Admin role updated successfully");
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
      setSelectedAdmin(null);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    if (!admin) return;

    setAdminToDelete(admin);
    setDeleteModalOpen(true);
    setSelectedAdmin(null);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;

    setIsLoading(adminToDelete.id);
    try {
      const result = await deleteAdmin(adminToDelete.id);
      if (result.success) {
        setAdmins(admins.filter((admin) => admin.id !== adminToDelete.id));
        toast.success("Admin removed successfully");
      } else {
        toast.error(result.error || "Failed to remove admin");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
      setDeleteModalOpen(false);
      setAdminToDelete(null);
    }
  };

  const handleToggleStatus = async (
    adminId: string,
    currentStatus: boolean
  ) => {
    setIsLoading(adminId);
    try {
      const result = await toggleAdminStatus(adminId, !currentStatus);
      if (result.success) {
        setAdmins(
          admins.map((admin) =>
            admin.id === adminId
              ? { ...admin, isActive: !currentStatus }
              : admin
          )
        );
        toast.success(
          !currentStatus
            ? "Admin activated successfully"
            : "Admin deactivated successfully"
        );
      } else {
        toast.error(result.error || "Failed to update admin status");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
      setSelectedAdmin(null);
      setToggleModalOpen(false); // Close modal after action
      setAdminToToggle(null); // Clear admin to toggle
    }
  };

  if (admins.length === 0) {
    return (
      <div className="text-center py-12">
        <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No admin found</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {admins.map((admin) => {
          const name =
            `${admin.firstName || ""} ${admin.lastName || ""}`.trim() ||
            "No Name";
          return (
            <div
              key={admin.id}
              className={`bg-gray-50 rounded-lg p-4 space-y-3 ${
                !admin.isActive ? "opacity-60" : ""
              }`}
            >
              {/* Header with Avatar and Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-purple-600 font-medium text-sm">
                      {name.charAt(0).toUpperCase() ||
                        admin.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{name}</p>
                      {!admin.isActive && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {admin.email}
                    </p>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setSelectedAdmin(
                        selectedAdmin === admin.id ? null : admin.id
                      )
                    }
                    className="p-2 hover:bg-gray-200 rounded-lg"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {selectedAdmin === admin.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSelectedAdmin(null)}
                      />
                      <div className="absolute right-0 top-10 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                        <button
                          onClick={() => {
                            setAdminToToggle(admin);
                            setToggleModalOpen(true);
                            setSelectedAdmin(null);
                          }}
                          disabled={isLoading === admin.id}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                            admin.isActive
                              ? "text-orange-600"
                              : "text-green-600"
                          } disabled:opacity-50`}
                        >
                          <Power className="h-4 w-4" />
                          {admin.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          disabled={isLoading === admin.id}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Admin
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              {admin.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span>{admin.phone}</span>
                </div>
              )}

              {/* Role and Date */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t">
                <select
                  value={admin.role}
                  onChange={(e) =>
                    handleRoleChange(
                      admin.id,
                      e.target.value as "ADMIN" | "SUPERADMIN"
                    )
                  }
                  disabled={isLoading === admin.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    admin.role === "SUPERADMIN"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  } ${
                    isLoading === admin.id
                      ? "opacity-50"
                      : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPERADMIN">Super Admin</option>
                </select>

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {getRelativeTime(admin.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Admin
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Contact
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Role
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Added
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="pb-10">
            {admins.map((admin) => {
              const name =
                `${admin.firstName || ""} ${admin.lastName || ""}`.trim() ||
                "No Name";
              return (
                <tr
                  key={admin.id}
                  className={`border-b hover:bg-gray-50 ${
                    !admin.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-medium">
                          {name.charAt(0).toUpperCase() ||
                            admin.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">{admin.email}</span>
                      </div>
                      {admin.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{admin.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <select
                      value={admin.role}
                      onChange={(e) =>
                        handleRoleChange(
                          admin.id,
                          e.target.value as "ADMIN" | "SUPERADMIN"
                        )
                      }
                      disabled={isLoading === admin.id}
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        admin.role === "SUPERADMIN"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      } ${
                        isLoading === admin.id
                          ? "opacity-50"
                          : "cursor-pointer hover:opacity-80"
                      }`}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERADMIN">Super Admin</option>
                    </select>
                  </td>

                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        admin.isActive
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {admin.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    <div className="text-nowrap flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {getRelativeTime(admin.createdAt)}
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2 relative">
                      <button
                        onClick={() =>
                          setSelectedAdmin(
                            selectedAdmin === admin.id ? null : admin.id
                          )
                        }
                        className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {selectedAdmin === admin.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setSelectedAdmin(null)}
                          />
                          <div className="absolute right-0 bottom-6 top-auto bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                            <button
                              onClick={() => {
                                setAdminToToggle(admin);
                                setToggleModalOpen(true);
                                setSelectedAdmin(null);
                              }}
                              disabled={isLoading === admin.id}
                              className={`cursor-pointer w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                admin.isActive
                                  ? "text-orange-600"
                                  : "text-green-600"
                              } disabled:opacity-50`}
                            >
                              <Power className="h-4 w-4" />
                              {admin.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              disabled={isLoading === admin.id}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove Admin
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteAdminModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteAdmin}
        adminName={
          adminToDelete
            ? `${adminToDelete.firstName || ""} ${
                adminToDelete.lastName || ""
              }`.trim() || adminToDelete.email
            : ""
        }
        isLoading={isLoading === adminToDelete?.id}
      />

      <ConfirmToggleModal
        isOpen={toggleModalOpen}
        onClose={() => setToggleModalOpen(false)}
        onConfirm={() => {
          if (adminToToggle) {
            handleToggleStatus(adminToToggle.id, adminToToggle.isActive);
          }
        }}
        adminName={
          adminToToggle
            ? `${adminToToggle.firstName || ""} ${
                adminToToggle.lastName || ""
              }`.trim() || adminToToggle.email
            : ""
        }
        isActive={adminToToggle?.isActive}
        isLoading={adminToToggle ? isLoading === adminToToggle.id : false}
      />
    </>
  );
}
