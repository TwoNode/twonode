// Centralized platform constants for use throughout the project
// Add new platforms here as needed

export enum Platform {
  REVA = "reva",
  SCRAM = "scram",
  SURFBOARD = "surfboard", // Added for Surfboard platform (uses SurfboardUser model)
  GBC = "gbc", // Added for GBC platform
  // Add more platforms as needed
}

// Enum for REVA user roles
export enum RevaRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}

export enum SurfboardRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",

  CHARTING = "CHARTING",
  ACCOUNTS = "ACCOUNTS",
  SURCON = "SURCON",
  RECORDS_I = "RECORDS_I",
  RECORDS_II = "RECORDS_II",
  MDA_SUPERADMIN = "MDA_SUPERADMIN",
}

export enum GBCRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}
