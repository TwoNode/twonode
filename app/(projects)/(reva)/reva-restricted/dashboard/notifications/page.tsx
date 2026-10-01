import React from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedRevaUser } from "@/reva/utils/revaAuth";
import AdminNotificationsList from "./AdminNotificationsList";

// Reads the session cookie on every request, so it can never be prerendered.
export const dynamic = "force-dynamic";

const NotificationsPage = async () => {
  // A failed lookup falls back to the regular admin list. It must not wrap the
  // redirect below: redirect() works by throwing, and a surrounding catch
  // would swallow it and leave superadmins on this page.
  const user = await getAuthenticatedRevaUser().catch((error) => {
    console.error("Error in notifications page:", error);
    return null;
  });

  if (user?.role === "SUPERADMIN") {
    redirect("/reva-restricted/dashboard/notifications/manage");
  }

  return <AdminNotificationsList />;
};

export default NotificationsPage;
