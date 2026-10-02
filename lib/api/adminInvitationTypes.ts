/** Client-safe shapes for the admin-invitation endpoints (dates arrive as ISO strings). */

export type AdminInvitationStatus =
  "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export interface AdminInvitationRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: AdminInvitationStatus;
  invitedByName: string;
  invitedByEmail: string;
  expiresAt: string;
  lastSentAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InviteAdminInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

/** `emailSent: false` means the invitation was saved but the email failed — it can be resent. */
export interface InviteResult {
  invitation: AdminInvitationRow;
  emailSent: boolean;
}

const ACRONYM_WORDS = new Set(["SURCON"]);

/** "SUPERADMIN" -> "Super Admin", "RECORDS_II" -> "Records II", "SURCON" -> "SURCON". */
export function roleLabel(role: string): string {
  if (role === "SUPERADMIN") return "Super Admin";
  return role
    .split("_")
    .map((word) =>
      // Keep roman numerals (RECORDS_II) and acronyms (SURCON) as written.
      /^[IVX]+$/.test(word) || ACRONYM_WORDS.has(word)
        ? word
        : word.charAt(0) + word.slice(1).toLowerCase()
    )
    .join(" ");
}
