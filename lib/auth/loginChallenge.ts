/**
 * The `action` the web sign-in's Turnstile widget sets and the server checks
 * (lib/auth/loginGuard.ts). Kept in its own file with no imports so the sign-in
 * card (a client component) can use it without pulling the server-only guard,
 * its logger and the database client into the browser bundle.
 */
export const WEB_LOGIN_TURNSTILE_ACTION = "login";
