// The one place that decides whether a request may read or change a shared
// Scrabble game or trip: the signed-in owner always may; a guest may only with
// a share key for exactly that game or trip, and guest writes are rate-limited.

import { isAuthenticated } from "./auth";
import { recordGuestWrite, shareKeyGrants } from "./shareLinks";

/**
 * Throws unless the caller may read the thing.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string|number} target - The game id or trip slug.
 * @param {string} [shareKey] - The guest's share key, if any.
 * @return {Promise<"owner"|"guest">} Who the caller is.
 * @throws {Error} If the caller has no access.
 */
export async function requireReadAccess(kind, target, shareKey) {
  if (await isAuthenticated()) return "owner";
  if (shareKey && (await shareKeyGrants(shareKey, kind, String(target)))) {
    return "guest";
  }
  throw new Error("Unauthorized");
}

/**
 * Throws unless the caller may change the thing. A guest write counts against
 * the link's rate limit.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string|number} target - The game id or trip slug.
 * @param {string} [shareKey] - The guest's share key, if any.
 * @return {Promise<"owner"|"guest">} Who the caller is.
 * @throws {Error} If the caller has no access or is over the rate limit.
 */
export async function requireWriteAccess(kind, target, shareKey) {
  if (await isAuthenticated()) return "owner";
  if (shareKey) {
    const outcome = await recordGuestWrite(shareKey, kind, String(target));
    if (outcome === "allowed") return "guest";
    if (outcome === "rate_limited") {
      throw new Error("Too many changes — wait a few minutes and try again.");
    }
  }
  throw new Error("Unauthorized");
}
