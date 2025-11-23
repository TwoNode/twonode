"use client";

import { Card } from "@/components/ui/card";
import { Users, Shield, Search } from "lucide-react";
import { AdminUsersList } from "../../../components/admin/AdminUsersList";
import { AddAdminModal } from "../../../components/admin/AddAdminModal";
import { AdminFilter } from "../../../components/admin/AdminFilter";
import { useEffect, useState } from "react";
import { getAllAdmins } from "../../../actions/admin-actions";

interface Admin {
  id: string;
  kindeId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: "ADMIN" | "SUPERADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [allAdmins, setAllAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([
    "ADMIN",
    "SUPERADMIN",
  ]);
  const [statusFilters, setStatusFilters] = useState<boolean[]>([true, false]); // Both active and inactive
  const [isLoading, setIsLoading] = useState(true);

  // Fetch admins on mount
  useEffect(() => {
    const fetchAdmins = async () => {
      const result = await getAllAdmins();
      if (result.success && result.data) {
        setAllAdmins(result.data as Admin[]);
        setFilteredAdmins(result.data as Admin[]);
      }
      setIsLoading(false);
    };

    fetchAdmins();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = allAdmins;

    // Filter by role
    if (roleFilters && roleFilters.length > 0) {
      filtered = filtered.filter((admin) => roleFilters.includes(admin.role));
    }

    // Filter by status
    if (statusFilters && statusFilters.length > 0) {
      console.log("statusFilters", statusFilters);
      console.log("allAdmins", filtered);
      // filtered = filtered.filter((admin) =>
      //   statusFilters.includes(admin.isActive)
      // );
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((admin) => {
        const name = `${admin.firstName || ""} ${
          admin.lastName || ""
        }`.toLowerCase();
        const email = admin.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    setFilteredAdmins(filtered);
  }, [allAdmins, roleFilters, statusFilters, searchQuery]);

  const handleFilterChange = (filters: {
    roles: string[];
    statuses: boolean[];
  }) => {
    setRoleFilters(filters.roles);
    setStatusFilters(filters.statuses);
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            Admin Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>

        <div className="w-full flex justify-end self-end sm:w-auto ml-auto">
          <AddAdminModal />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Admins</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {allAdmins?.length || 0}
              </p>
            </div>
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Super Admins</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {allAdmins?.filter((a: any) => a.role === "SUPERADMIN")
                  .length || 0}
              </p>
            </div>
            <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Regular Admins</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {allAdmins?.filter((a: any) => a.role === "ADMIN").length || 0}
              </p>
            </div>
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Admin List */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold">
            All Admins
            {filteredAdmins.length !== allAdmins.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredAdmins.length} of {allAdmins.length})
              </span>
            )}
          </h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              />
            </div>

            <AdminFilter onFilterChange={handleFilterChange} />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading admins...</p>
          </div>
        ) : (
          <AdminUsersList admins={filteredAdmins} />
        )}
      </Card>
    </div>
  );
}
