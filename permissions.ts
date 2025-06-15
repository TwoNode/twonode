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

const USER = "USER";
const ADMIN = "ADMIN";
const SUPERADMIN = "SUPERADMIN";

export const REVA_ROLES = {
  user: USER,
  admin: ADMIN,
  super_admin: SUPERADMIN,
};

export const is_admin = (role: string | null = "") => {
  return [REVA_ROLES.admin, REVA_ROLES.super_admin].includes(role ?? "");
};
