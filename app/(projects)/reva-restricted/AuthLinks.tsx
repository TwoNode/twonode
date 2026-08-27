"use client";

import React from "react";
import { AuthLinks } from "@/reva/components/shared";

export default function AdminAuthLinks() {
  return (
    <AuthLinks
      dashboardType="admin"
      customLoginRedirect="/api/auth/success/reva-restricted"
      customRegisterRedirect="/api/auth/success/reva-restricted"
    />
  );
}
