"use client";

import { PendingInvitations } from "@/components/admin/PendingInvitations";
import { revaApi } from "@/reva/apiClient";

/** Client wrapper: the superadmin page is a server component and can't pass the API client (functions) as a prop. */
export default function RevaPendingInvitations() {
  return <PendingInvitations api={revaApi.admin.invitations} />;
}
