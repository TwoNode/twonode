/** What the Surfboard user panel needs to draw on its first paint. */
export type SurfboardPanelUser = {
  firstName: string | null;
  family_name: string | null;
  email: string;
  picture: string | null;
};

export type SurfboardPanelInitial = {
  user: SurfboardPanelUser | null;
  hasSubscriptionAccess: boolean;
};

type ProfileLike = {
  firstName: string | null;
  lastName: string | null;
  email: string;
  logo: string | null;
};

/**
 * The same fields, under the same names, that
 * `GET /api/v1/surfboard/subscription/user-and-active` returns to the panel
 * today, and the same rule for access (a subscription that is active or in
 * its grace period). Only plain values: nothing here is a token or an id.
 */
export function buildSurfboardPanelInitial(
  subscription: unknown | null | undefined,
  profile: ProfileLike | null | undefined
): SurfboardPanelInitial {
  return {
    user: profile
      ? {
          firstName: profile.firstName,
          family_name: profile.lastName,
          email: profile.email,
          picture: profile.logo,
        }
      : null,
    hasSubscriptionAccess: !!subscription,
  };
}
