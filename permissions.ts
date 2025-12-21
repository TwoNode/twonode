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
  return [REVA_ROLES.user, REVA_ROLES.admin, REVA_ROLES.super_admin].includes(
    role ?? ""
  );
};

export const canAccessRevaSuperAdminPanel = (role: string | null = "") => {
  return role === REVA_ROLES.super_admin;
};

export const isRevaSuperAdmin = (role: string | null = "") => {
  return role === REVA_ROLES.super_admin;
};

export const isRevaRegularUser = (role: string | null = "") => {
  return role === REVA_ROLES.user;
};

// Legacy function for backward compatibility
export const is_admin = isRevaAdmin;

// Surfboard permission helpers
// Surfboard permission helpers
const SURFBOARD_USER_ROLE = "USER";
const SURFBOARD_ADMIN_ROLE = "ADMIN";
const SURFBOARD_SUPERADMIN_ROLE = "SUPERADMIN";

export const SURFBOARD_ROLES = {
  user: SURFBOARD_USER_ROLE,
  admin: SURFBOARD_ADMIN_ROLE,
  super_admin: SURFBOARD_SUPERADMIN_ROLE,
};

export const isSurfAdmin = (role: string | null = "") => {
  return [SURFBOARD_ROLES.admin, SURFBOARD_ROLES.super_admin].includes(
    role ?? ""
  );
};

export const canAccessSurfAdminPanel = (role: string | null = "") => {
  return [SURFBOARD_ROLES.admin, SURFBOARD_ROLES.super_admin].includes(
    role ?? ""
  );
};

export const canAccessSurfUserPanel = (role: string | null = "") => {
  return [
    SURFBOARD_ROLES.user,
    SURFBOARD_ROLES.admin,
    SURFBOARD_ROLES.super_admin,
  ].includes(role ?? "");
};

export const canAccessSurfSuperAdminPanel = (role: string | null = "") => {
  return role === SURFBOARD_ROLES.super_admin;
};

export const isSurfSuperAdmin = (role: string | null = "") => {
  return role === SURFBOARD_ROLES.super_admin;
};

export const isSurfRegularUser = (role: string | null = "") => {
  return role === SURFBOARD_ROLES.user;
};

// MDA (Ministry, Department & Agency) permission helpers
// These roles are used in the surf-mda portal
const MDA_ROLES = {
  accounts: "ACCOUNTS",
  charting: "CHARTING",
  surcon: "SURCON",
  records_i: "RECORDS_I",
  records_ii: "RECORDS_II",
  mda_superadmin: "MDA_SUPERADMIN",
};

export const MDA_ROLE_LIST = [
  MDA_ROLES.accounts,
  MDA_ROLES.charting,
  MDA_ROLES.surcon,
  MDA_ROLES.records_i,
  MDA_ROLES.records_ii,
  MDA_ROLES.mda_superadmin,
];

export const isMDARole = (role: string | null = "") => {
  return MDA_ROLE_LIST.includes(role ?? "");
};

export const canAccessMDAPanel = (role: string | null = "") => {
  // MDA users can access the MDA panel, as can SUPERADMIN
  return (
    MDA_ROLE_LIST.includes(role ?? "") || role === SURFBOARD_ROLES.super_admin
  );
};

export const isMDASuperAdmin = (role: string | null = "") => {
  return (
    role === MDA_ROLES.mda_superadmin || role === SURFBOARD_ROLES.super_admin
  );
};

// GBC permission helpers
const GBC_USER_ROLE = "USER";
const GBC_ADMIN_ROLE = "ADMIN";
const GBC_SUPERADMIN_ROLE = "SUPERADMIN";

export const GBC_ROLES = {
  user: GBC_USER_ROLE,
  admin: GBC_ADMIN_ROLE,
  super_admin: GBC_SUPERADMIN_ROLE,
};

export const isGBCAdmin = (role: string | null = "") => {
  return [GBC_ROLES.admin, GBC_ROLES.super_admin].includes(role ?? "");
};

export const canAccessGBCAdminPanel = (role: string | null = "") => {
  return [GBC_ROLES.admin, GBC_ROLES.super_admin].includes(role ?? "");
};

export const canAccessGBCUserPanel = (role: string | null = "") => {
  return [GBC_ROLES.user, GBC_ROLES.admin, GBC_ROLES.super_admin].includes(
    role ?? ""
  );
};

export const canAccessGBCSuperAdminPanel = (role: string | null = "") => {
  return role === GBC_ROLES.super_admin;
};

export const isGBCSuperAdmin = (role: string | null = "") => {
  return role === GBC_ROLES.super_admin;
};

export const isGBCRegularUser = (role: string | null = "") => {
  return role === GBC_ROLES.user;
};
