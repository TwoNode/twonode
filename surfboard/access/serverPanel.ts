import { getServerSession } from "@/lib/auth/session";
import { getUserAndActiveSub } from "@/surfboard/services/subscriptionService";
import { getProfile } from "@/surfboard/services/profileService";
import { Platform } from "@/utils/platform";
import {
  buildSurfboardPanelInitial,
  type SurfboardPanelInitial,
} from "./panelInitial";

/**
 * The signed-in Surfboard user's name and subscription state, read on the
 * server for the dashboard layout, so the panel draws with the right menu on
 * the first paint instead of waiting for the browser to ask. It runs the same
 * two lookups as `GET /api/v1/surfboard/subscription/user-and-active`.
 * proxy.ts stays the security boundary (it already gates these pages on the
 * subscription). Returns null (the layout then falls back to the browser
 * check, behind a skeleton) when there is no session or anything fails.
 */
export async function getInitialSurfboardPanel(): Promise<SurfboardPanelInitial | null> {
  try {
    const session = await getServerSession(Platform.SURFBOARD);
    if (!session) return null;
    const [{ subscription }, profile] = await Promise.all([
      getUserAndActiveSub(session.sub),
      getProfile(session.sub).catch(() => null),
    ]);
    return buildSurfboardPanelInitial(subscription, profile);
  } catch {
    return null;
  }
}
