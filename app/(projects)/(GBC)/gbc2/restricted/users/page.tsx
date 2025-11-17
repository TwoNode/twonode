import { Card } from "@/components/ui/card";
import { Users, Shield, Search, Filter } from "lucide-react";
import { AdminUsersList } from "../../../components/admin/AdminUsersList";
import { AddAdminModal } from "../../../components/admin/AddAdminModal";
import { getAllAdmins } from "../../../actions/admin-actions";

export default async function AdminUsersPage() {
  const adminsResult = await getAllAdmins();
  const admins = adminsResult.success ? adminsResult.data : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-600" />
            Admin Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>

        <AddAdminModal />
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Admins</p>
              <p className="text-3xl font-bold mt-1">{admins?.length}</p>
            </div>
            <Users className="h-10 w-10 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Super Admins</p>
              <p className="text-3xl font-bold mt-1">
                {admins?.filter((a: any) => a.role === "SUPER_ADMIN").length}
              </p>
            </div>
            <Shield className="h-10 w-10 text-amber-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Regular Admins</p>
              <p className="text-3xl font-bold mt-1">
                {admins?.filter((a: any) => a.role === "ADMIN").length}
              </p>
            </div>
            <Users className="h-10 w-10 text-blue-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Admin List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">All Administrators</h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search admins..."
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        <AdminUsersList admins={admins || []} />
      </Card>
    </div>
  );
}
