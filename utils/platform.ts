// Centralized platform constants for use throughout the project
// Add new platforms here as needed

export enum Platform {
  REVA = "reva",
  SCRAM = "scram",
  SURFBOARD = "surfboard", // Added for Surfboard platform (uses SurfboardUser model)
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
}
