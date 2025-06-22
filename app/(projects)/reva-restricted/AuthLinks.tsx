"use client";

import React from "react";
import { AuthLinks } from "@/components/reva/shared";

export default function AdminAuthLinks() {
  return (
    <AuthLinks
      dashboardType="admin"
      customLoginRedirect="/api/auth/success/reva-restricted"
      customRegisterRedirect="/api/auth/success/reva-restricted"
    />
  );
}
