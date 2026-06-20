import { cookies } from "next/headers";
import { COOKIE_NAME, SESSION_TTL_MS, signToken, verifyToken } from "./session";

/**
 * @return {Promise<boolean>} Whether the current request carries a valid
 *   session cookie.
 */
export async function isAuthenticated() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

/**
 * Guards a server action: throws if the caller isn't signed in. Server actions
 * are public POST endpoints, so this is the real enforcement point — the
 * middleware only gates page navigation.
 * @throws {Error} If the request is unauthenticated.
 */
export async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
}

/** Issues a signed session cookie for the current response. */
export async function createSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, await signToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}
