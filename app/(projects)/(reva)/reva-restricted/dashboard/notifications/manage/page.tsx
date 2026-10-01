import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Plus, Settings, Users, Shield } from "lucide-react";
import { REVA_COLORS, REVA_GRADIENTS } from "@/reva/colors";
import AdminNotificationsList from "../AdminNotificationsList";

const ManageNotificationsPage = () => {
  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div
            className="p-2 sm:p-3 rounded-full"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: REVA_COLORS.text.dark }}
            >
              Notifications Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Create, view, and manage system notifications
            </p>
          </div>
        </div>
        <Link href="/reva-restricted/dashboard/notifications/create">
          <Button
            size="sm"
            className="flex items-center gap-2 w-full sm:w-auto"
            style={{ background: REVA_GRADIENTS.primary }}
          >
            <Plus className="w-4 h-4" />
            Create Notification
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Total Notifications
                </p>
                <p className="text-lg sm:text-xl font-bold">All Types</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  User Notifications
                </p>
                <p className="text-lg sm:text-xl font-bold">General Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Admin Notifications
                </p>
                <p className="text-lg sm:text-xl font-bold">General Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Superadmin Notifications
                </p>
                <p className="text-lg sm:text-xl font-bold">Superadmin Only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <AdminNotificationsList />
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageNotificationsPage;
