import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/utils/authUser";
import AdminNotificationsList from "./AdminNotificationsList";

const NotificationsPage = async () => {
  try {
    const user = await getAuthenticatedUser();

    // If user is superadmin, redirect to manage page
    if (user?.role === "SUPERADMIN") {
      redirect("/reva-restricted/dashboard/notifications/manage");
    }

    // For regular admins, show the notifications list
    return <AdminNotificationsList />;
  } catch (error) {
    console.error("Error in notifications page:", error);
    // Fallback to regular notifications list
    return <AdminNotificationsList />;
  }
};

export default NotificationsPage;
