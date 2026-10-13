import { Platform } from "@/utils/platform";

/** What the REVA panels need to know about who is signed in. */
export interface RevaPanelUser {
  platform: Platform;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

type SessionShape = {
  platforms?: Record<string, { role?: string } | undefined>;
  platform?: string;
  role?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

/**
 * The REVA part of a (multi-platform) session, or null when this session has
 * no REVA role. Same rule the access hooks used on the client: the REVA entry
 * in `platforms`, else the legacy top-level fields when the session is a REVA
 * one. Only the fields the panels use are kept, so it is safe to hand to a
 * client component.
 */
export function pickRevaPanelUser(
  data: SessionShape | null | undefined
): RevaPanelUser | null {
  if (!data) return null;
  const role =
    data.platforms?.[Platform.REVA]?.role ??
    (data.platform === Platform.REVA ? data.role : undefined);
  if (!role) return null;
  return {
    platform: Platform.REVA,
    role,
    email: data.email ?? "",
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
  };
}
