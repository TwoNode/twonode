import { FC } from "react";
import InviteAdminUserForm from "../../components/InviteAdminUserForm";
import RevaPendingInvitations from "../../components/RevaPendingInvitations";
import AdminUsersList from "../../components/AdminUsersList";
import UserRoleManagementForm from "../../components/UserRoleManagementForm";
import AllUsersList from "../../components/AllUsersList";
import CreateNotificationForm from "../../components/CreateNotificationForm";
import { getAllUsers } from "@/reva/services/adminUserService";

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

const RevaPage: FC = async () => {
  // Only UserRoleManagementForm's dropdown needs the full unpaginated roster —
  // AdminUsersList/AllUsersList below now fetch their own paginated data.
  let allUsers: User[] = [];
  try {
    const result = await getAllUsers();
    allUsers = result.allUsers as User[];
  } catch {
    // fall through with empty list
  }

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage admin users, roles, system settings, and notifications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Invite Admin User Form */}
        <div>
          <InviteAdminUserForm />
        </div>

        {/* User Role Management Form */}
        <div>
          <UserRoleManagementForm users={allUsers} />
        </div>
      </div>

      <RevaPendingInvitations />

      {/* Notification Creation Form */}
      <div className="mb-8">
        <CreateNotificationForm />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admin Users List */}
        <div className="w-full">
          <AdminUsersList />
        </div>

        {/* All Users List */}
        <div className="w-full">
          <AllUsersList />
        </div>
      </div>
    </div>
  );
};

export default RevaPage;
