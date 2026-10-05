/**
 * The public origin of the deployment that is running this code, for links
 * that leave the app (emails, payment callbacks, share links).
 *
 * Resolution order:
 *   1. BASE_URL: set per environment to that environment's own URL.
 *   2. Vercel preview deployment: its own branch URL (covers a staging
 *      environment where BASE_URL was never set).
 *   3. NEXT_PUBLIC_APP_URL, then NEXT_PUBLIC_SITE_URL.
 *   4. The live site.
 *
 * ONLINE_BASE_URL is always the live site, so it is not used here. Use
 * `LIVE_SITE_URL` directly only where the live site is the only place that
 * works (for example SEO canonical URLs or logo images in emails).
 *
 * Deliberately not derived from the request's Host header: a forged Host
 * would poison password-reset and verification links.
 */
export const LIVE_SITE_URL = "https://www.twonodetechnologies.com";

const clean = (value: string | undefined) => {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : undefined;
};

const withProtocol = (host: string) =>
  /^https?:\/\//i.test(host) ? host : `https://${host}`;

export function getSiteUrl(): string {
  const configured = clean(process.env.BASE_URL);
  if (configured) return configured;
  if (process.env.VERCEL_ENV === "preview") {
    const host =
      clean(process.env.VERCEL_BRANCH_URL) ?? clean(process.env.VERCEL_URL);
    if (host) return withProtocol(host);
  }
  return (
    clean(process.env.NEXT_PUBLIC_APP_URL) ??
    clean(process.env.NEXT_PUBLIC_SITE_URL) ??
    LIVE_SITE_URL
  );
}
