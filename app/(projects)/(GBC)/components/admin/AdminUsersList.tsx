"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { deleteAdmin, updateAdminRole } from "../../actions/admin-actions";
import { GBCRole } from "@prisma/client";

interface Admin {
  id: string;
  kindeId: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "ADMIN" | "SUPER_ADMIN" | GBCRole;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  admins?: Admin[];
}

export function AdminUsersList({ admins: initialAdmins }: Props) {
  const [admins, setAdmins] = useState(initialAdmins || []);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleRoleChange = async (
    adminId: string,
    newRole: "ADMIN" | "SUPER_ADMIN" | GBCRole
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
    if (
      !confirm(
        "Are you sure you want to remove this admin? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsLoading(adminId);
    try {
      const result = await deleteAdmin(adminId);
      if (result.success) {
        setAdmins(admins.filter((admin) => admin.id !== adminId));
        toast.success("Admin removed successfully");
      } else {
        toast.error(result.error || "Failed to remove admin");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(null);
      setSelectedAdmin(null);
    }
  };

  return (
    <div className="overflow-x-auto">
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
              Added
            </th>
            <th className="text-right py-3 px-4 font-medium text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id} className="border-b hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-medium">
                      {admin.name?.charAt(0).toUpperCase() ||
                        admin.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{admin.name || "No name"}</p>
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
                      e.target.value as "ADMIN" | "SUPER_ADMIN"
                    )
                  }
                  disabled={isLoading === admin.id}
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    admin.role === "SUPER_ADMIN"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  } ${
                    isLoading === admin.id
                      ? "opacity-50"
                      : "cursor-pointer hover:opacity-80"
                  }`}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </td>

              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-3 w-3" />
                  {new Intl.RelativeTimeFormat("en", {
                    numeric: "auto",
                  }).format(
                    Math.round(
                      (new Date(admin.createdAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24 * 30)
                    ) < -12
                      ? Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24 * 365)
                        )
                      : Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24 * 30)
                        ) < -1
                      ? Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24 * 30)
                        )
                      : Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        ) < -1
                      ? Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60)
                        ) < -1
                      ? Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60 * 60)
                        )
                      : Math.round(
                          (new Date(admin.createdAt).getTime() - Date.now()) /
                            (1000 * 60)
                        ),
                    Math.abs(
                      Math.round(
                        (new Date(admin.createdAt).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24 * 365)
                      )
                    ) >= 1
                      ? "year"
                      : Math.abs(
                          Math.round(
                            (new Date(admin.createdAt).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24 * 30)
                          )
                        ) >= 1
                      ? "month"
                      : Math.abs(
                          Math.round(
                            (new Date(admin.createdAt).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )
                        ) >= 1
                      ? "day"
                      : Math.abs(
                          Math.round(
                            (new Date(admin.createdAt).getTime() - Date.now()) /
                              (1000 * 60 * 60)
                          )
                        ) >= 1
                      ? "hour"
                      : "minute"
                  )}
                </div>
              </td>

              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() =>
                      setSelectedAdmin(
                        selectedAdmin === admin.id ? null : admin.id
                      )
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {selectedAdmin === admin.id && (
                    <div className="absolute right-8 mt-32 bg-white border rounded-lg shadow-lg py-1 z-10">
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        disabled={isLoading === admin.id}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Admin
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {admins.length === 0 && (
        <div className="text-center py-12">
          <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No administrators found</p>
        </div>
      )}
    </div>
  );
}
