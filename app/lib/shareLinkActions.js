"use server";

import { requireAuth } from "./auth";
import { issueShareKey, revokeShareKey } from "./shareLinks";
import { isShareKind } from "./shareKey";

/**
 * Checks an owner's share request names a real kind and a plausible target.
 * @param {*} kind - The untrusted kind.
 * @param {*} target - The untrusted game id or trip slug.
 * @return {string} The target as a string.
 */
function validateShareTarget(kind, target) {
  if (!isShareKind(kind)) throw new Error("Unknown share kind");
  const targetText = String(target ?? "");
  if (!/^[a-z0-9-]{1,64}$/.test(targetText)) throw new Error("Invalid target");
  return targetText;
}

/**
 * Owner only: shares a game or trip, or resets its link so the old URL stops
 * working.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string|number} target - The game id or trip slug.
 * @return {Promise<string>} The new share key.
 */
export async function createShareLink(kind, target) {
  await requireAuth();
  return issueShareKey(kind, validateShareTarget(kind, target));
}

/**
 * Owner only: stops sharing a game or trip.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string|number} target - The game id or trip slug.
 */
export async function stopSharing(kind, target) {
  await requireAuth();
  await revokeShareKey(kind, validateShareTarget(kind, target));
}
