import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SurfboardUserPanelLayout from "@/surfboard/layouts/surfboardUserPanelLayout";
import { getServerSession } from "@/lib/auth/session-edge";
import { getUserActiveSubscription } from "@/lib/auth/subscriptionLookup";
import { Platform } from "@/utils/platform";
import "maplibre-gl/dist/maplibre-gl.css";

export const maxDuration = 60;

const ALWAYS_ALLOWED_EVEN_UNSUBSCRIBED = new Set([
  "/surfboard/dashboard",
  "/surfboard/dashboard/settings",
  "/surfboard/dashboard/subscription",
]);

/**
 * proxy.ts's native-session fast path deliberately stopped fetching
 * subscription status itself (that was the one live DB query anywhere in
 * that Edge-Runtime middleware, which Netlify's Edge Runtime can't execute
 * Prisma against) — it now only checks role access and forwards the
 * request's pathname via an `x-pathname` header. This is where the
 * subscription gate actually runs: a Node-runtime Server Component, so
 * Prisma works normally. A request that came in through the legacy Kinde
 * flow instead (no native JWT session) was already gated by middleware
 * using its session-cookie-cached subscription value, so this is a no-op
 * for those requests.
 */
async function enforceSurfboardSubscriptionGate() {
  const nativeSession = await getServerSession(Platform.SURFBOARD);
  if (!nativeSession) return; // legacy Kinde flow already gated this in middleware

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (ALWAYS_ALLOWED_EVEN_UNSUBSCRIBED.has(pathname)) return;

  const subscription = await getUserActiveSubscription(nativeSession.sub);
  const isGracePeriod =
    subscription?.status === "canceled" &&
    subscription.expiresAt &&
    new Date(subscription.expiresAt) >= new Date();

  if (!subscription || (subscription.status !== "active" && !isGracePeriod)) {
    redirect("/surfboard/dashboard/subscription");
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforceSurfboardSubscriptionGate();
  return <SurfboardUserPanelLayout>{children}</SurfboardUserPanelLayout>;
}
