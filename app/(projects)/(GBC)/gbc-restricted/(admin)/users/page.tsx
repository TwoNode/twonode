"use client";

import { Card } from "@/components/ui/card";
import { Users, Shield, Search } from "lucide-react";
import { AdminUsersList } from "@/gbc/components/admin/AdminUsersList";
import { InviteAdminModal } from "@/gbc/components/admin/InviteAdminModal";
import { PendingInvitations } from "@/components/admin/PendingInvitations";
import { AdminFilter } from "@/gbc/components/admin/AdminFilter";
import { useEffect, useState } from "react";
import { gbcApi } from "@/gbc/apiClient";
import { useServerList } from "@/hooks/useServerList";
import { Pagination } from "@/components/ui/pagination";

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

interface AdminFilters {
  roles: string[];
  statuses: boolean[];
}

export default function AdminUsersPage() {
  const {
    items: filteredAdmins,
    total,
    totalPages,
    loading: isLoading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: searchQuery,
    setSearch: setSearchQuery,
    filters,
    setFilters,
  } = useServerList<Admin, AdminFilters>(
    async ({ page, pageSize, search, filters }) =>
      gbcApi.users.listPaginated({
        page,
        pageSize,
        search: search || undefined,
        roles: filters.roles as ("ADMIN" | "SUPERADMIN")[],
        statuses: filters.statuses,
      }),
    {
      initialFilters: {
        roles: ["ADMIN", "SUPERADMIN"],
        statuses: [true, false],
      },
    }
  );

  const handleFilterChange = (filters: {
    roles: string[];
    statuses: boolean[];
  }) => {
    setFilters(filters);
  };

  const [stats, setStats] = useState<{
    total: number;
    superAdmins: number;
    admins: number;
  } | null>(null);
  useEffect(() => {
    gbcApi.users.stats().then((res) => {
      if (res.success && res.data) setStats(res.data);
    });
  }, []);

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
          <InviteAdminModal />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Admins</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">
                {stats?.total ?? 0}
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
                {stats?.superAdmins ?? 0}
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
                {stats?.admins ?? 0}
              </p>
            </div>
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 opacity-20" />
          </div>
        </Card>
      </div>

      <PendingInvitations api={gbcApi.invitations} />

      {/* Admin List */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold">
            All Admins
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({total})
            </span>
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
          <>
            <AdminUsersList admins={filteredAdmins} />
            {totalPages > 1 && (
              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} • {total} admins
                </p>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
