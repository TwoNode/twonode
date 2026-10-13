/**
 * A login URL that brings the user back to the page they were on.
 *
 * The proxy already adds `?post_login_redirect_url=` when it bounces a visit to
 * login. Redirects that happen in the browser (an access check that finds no
 * session) build their own login URL, so they use this to keep the same
 * contract. `NativeAuthCard` only follows a same-origin relative path.
 *
 * Nothing is added for the login, logout or home pages, so a return can never
 * loop through authentication screens.
 */
export function loginUrlWithReturn(
  loginPath: string,
  here?: { pathname: string; search: string }
): string {
  const loc =
    here ?? (typeof window !== "undefined" ? window.location : undefined);
  if (!loc) return loginPath;
  const target = `${loc.pathname}${loc.search}`;
  if (
    loc.pathname === "/" ||
    /\/(login|logout|error-login)(\/|$)/.test(loc.pathname)
  ) {
    return loginPath;
  }
  return `${loginPath}?post_login_redirect_url=${encodeURIComponent(target)}`;
}
