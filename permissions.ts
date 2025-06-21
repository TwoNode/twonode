const REVA_USER = "reva_user";
const REVA_ADMIN = "reva_admin";
const REVA_SUPER_ADMIN = "reva_super_admin";

const SCRAM_USER = "scram_user";
const SCRAM_ADMIN = "scram_admin";
const SCRAM_SUPER_ADMIN = "scram_super_admin";

export const USER_PERMS = {
  reva_user: REVA_USER,
  reva_admin: REVA_ADMIN,
  reva_super_admin: REVA_SUPER_ADMIN,

  scram_user: SCRAM_USER,
  scram_admin: SCRAM_ADMIN,
  scram_super_admin: SCRAM_SUPER_ADMIN,
};

const REVA_USER_ROLE = "USER";
const REVA_ADMIN_ROLE = "ADMIN";
const REVA_SUPERADMIN_ROLE = "SUPERADMIN";

export const REVA_ROLES = {
  user: REVA_USER_ROLE,
  admin: REVA_ADMIN_ROLE,
  super_admin: REVA_SUPERADMIN_ROLE,
};

export const isRevaAdmin = (role: string | null = "") => {
  return [REVA_ROLES.admin, REVA_ROLES.super_admin].includes(role ?? "");
};

// Enhanced role checking functions - REVA specific
export const canAccessRevaAdminPanel = (role: string | null = "") => {
  return [REVA_ROLES.admin, REVA_ROLES.super_admin].includes(role ?? "");
};

export const canAccessRevaUserPanel = (role: string | null = "") => {
  return [REVA_ROLES.user, REVA_ROLES.admin, REVA_ROLES.super_admin].includes(role ?? "");
};

export const isRevaSuperAdmin = (role: string | null = "") => {
  return role === REVA_ROLES.super_admin;
};

export const isRevaRegularUser = (role: string | null = "") => {
  return role === REVA_ROLES.user;
};

// Legacy function for backward compatibility
export const is_admin = isRevaAdmin;
