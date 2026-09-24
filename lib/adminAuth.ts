/* =========================================================================
 * MasjidCheckIn — Admin Session Helpers
 *
 * The admin session is a simple httpOnly cookie set by `POST /api/auth`.
 * These constants + the `isAdminRequest()` guard are shared between the
 * auth route and any API route that behaves differently for admins
 * (e.g. `register-face` allows admin registration even when public
 * registration is closed).
 * ========================================================================= */

/** Name of the session cookie. */
export const ADMIN_COOKIE_NAME = "admin_token";

/** Opaque salt token stored in the cookie — NOT the password itself. */
export const ADMIN_TOKEN_VALUE = "masjidcheckin-admin-session-v1";

/**
 * Returns true when the incoming request carries a valid admin cookie.
 * Works with the plain Web `Request` object used by Next.js Route Handlers.
 */
export function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .some((part) => part.trim() === `${ADMIN_COOKIE_NAME}=${ADMIN_TOKEN_VALUE}`);
}
