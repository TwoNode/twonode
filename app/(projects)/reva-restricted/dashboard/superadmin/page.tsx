import { FC } from "react";
import CreateAdminUserForm from "../../components/CreateAdminUserForm";
import AdminUsersList from "../../components/AdminUsersList";
import UserRoleManagementForm from "../../components/UserRoleManagementForm";
import AllUsersList from "../../components/AllUsersList";
import { getAllUsers, getAllAdminUsers } from "../../actions/adminDbActions";

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

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "SUPERADMIN";
  emailVerified: boolean;
  is_active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count: {
    properties: number;
  };
}

const RevaPage: FC = async () => {
  // Fetch all users
  const allUsersResult = await getAllUsers();

  const allUsers =
    allUsersResult.success && allUsersResult.data?.allUsers
      ? (allUsersResult.data.allUsers as User[])
      : [];

  const adminUsers =
    allUsersResult.success && allUsersResult.data?.allUsers
      ? (allUsersResult.data.allUsers.filter(
          (user) => user.role === "ADMIN" || user.role === "SUPERADMIN"
        ) as AdminUser[])
      : [];

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage admin users, roles, and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Create Admin User Form */}
        <div>
          <CreateAdminUserForm />
        </div>

        {/* User Role Management Form */}
        <div>
          <UserRoleManagementForm users={allUsers} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admin Users List */}
        <div className="w-full">
          <AdminUsersList users={adminUsers} />
        </div>

        {/* All Users List */}
        <div className="w-full">
          <AllUsersList users={allUsers} />
        </div>
      </div>
    </div>
  );
};

export default RevaPage;
