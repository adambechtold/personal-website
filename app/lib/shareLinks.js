// Share links: an unguessable key that grants a guest (no account, no
// password) access to exactly one Scrabble game or one trip. This module is
// server-only data access — it is deliberately NOT a "use server" file, so
// none of these functions is callable from the browser. The owner-facing
// actions live in shareLinkActions.js; guest access is checked in access.js.

import { sql } from "@vercel/postgres";
import {
  generateShareKey,
  isShareKind,
  isWellFormedShareKey,
} from "./shareKey";

// Each link may make this many writes per window before guests are turned
// away. Generous for a real game night, small enough that a script can't run
// up the bill or fill the database.
export const GUEST_WRITE_LIMIT = 120;
export const GUEST_WRITE_WINDOW_MINUTES = 10;

/**
 * Creates the share-links table. One link per shared thing: resetting a link
 * replaces its key, which makes the old URL stop working.
 */
async function migrateSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS share_links (
      key               TEXT        PRIMARY KEY,
      kind              TEXT        NOT NULL,
      target            TEXT        NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      write_count       INTEGER     NOT NULL DEFAULT 0,
      UNIQUE (kind, target)
    )
  `;
}

// The in-flight or completed migration for this server instance.
let schemaReady = null;

/**
 * Ensures the share-links table exists, once per server instance.
 * @return {Promise<void>}
 */
async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = migrateSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/**
 * Looks up what a share key grants access to.
 * @param {*} shareKey - The untrusted key.
 * @return {Promise<{kind: string, target: string}|null>} The link, or null
 *   if the key is malformed, unknown, or revoked.
 */
export async function findShareLink(shareKey) {
  if (!isWellFormedShareKey(shareKey)) return null;
  await ensureSchema();
  const { rows } =
    await sql`SELECT kind, target FROM share_links WHERE key = ${shareKey}`;
  return rows[0] ? { kind: rows[0].kind, target: rows[0].target } : null;
}

/**
 * Whether a share key grants access to a specific thing.
 * @param {*} shareKey - The untrusted key.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string} target - The game id or trip slug.
 * @return {Promise<boolean>} Whether the key is valid for that thing.
 */
export async function shareKeyGrants(shareKey, kind, target) {
  const shareLink = await findShareLink(shareKey);
  return (
    shareLink != null &&
    shareLink.kind === kind &&
    shareLink.target === String(target)
  );
}

/**
 * Counts one guest write against a link's rate limit. The check and the
 * increment are one statement, so concurrent requests can't slip past it.
 * @param {*} shareKey - The untrusted key.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string} target - The game id or trip slug.
 * @return {Promise<"allowed"|"denied"|"rate_limited">} The outcome.
 */
export async function recordGuestWrite(shareKey, kind, target) {
  if (!isWellFormedShareKey(shareKey)) return "denied";
  await ensureSchema();
  const windowMinutes = GUEST_WRITE_WINDOW_MINUTES;
  const { rows } = await sql`
    UPDATE share_links SET
      write_count = CASE
        WHEN window_started_at < now() - make_interval(mins => ${windowMinutes})
        THEN 1 ELSE write_count + 1 END,
      window_started_at = CASE
        WHEN window_started_at < now() - make_interval(mins => ${windowMinutes})
        THEN now() ELSE window_started_at END
    WHERE key = ${shareKey} AND kind = ${kind} AND target = ${String(target)}
    RETURNING write_count
  `;
  if (rows.length === 0) return "denied";
  return rows[0].write_count > GUEST_WRITE_LIMIT ? "rate_limited" : "allowed";
}

/**
 * The current share key for a thing, for the owner's share panel.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string} target - The game id or trip slug.
 * @return {Promise<string|null>} The key, or null if it isn't shared.
 */
export async function findShareKeyFor(kind, target) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT key FROM share_links WHERE kind = ${kind} AND target = ${String(
      target
    )}
  `;
  return rows[0]?.key ?? null;
}

/**
 * Creates a share link for a thing, or replaces its key if it already has
 * one (so the previous URL stops working).
 * @param {string} kind - "scrabble" or "trip".
 * @param {string} target - The game id or trip slug.
 * @return {Promise<string>} The new key.
 */
export async function issueShareKey(kind, target) {
  if (!isShareKind(kind)) throw new Error("Unknown share kind");
  await ensureSchema();
  const shareKey = generateShareKey();
  await sql`
    INSERT INTO share_links (key, kind, target) VALUES (${shareKey}, ${kind}, ${String(
      target
    )})
    ON CONFLICT (kind, target) DO UPDATE SET
      key = EXCLUDED.key,
      created_at = now(),
      window_started_at = now(),
      write_count = 0
  `;
  return shareKey;
}

/**
 * Removes a thing's share link, so its URL stops working.
 * @param {string} kind - "scrabble" or "trip".
 * @param {string} target - The game id or trip slug.
 */
export async function revokeShareKey(kind, target) {
  await ensureSchema();
  await sql`
    DELETE FROM share_links WHERE kind = ${kind} AND target = ${String(target)}
  `;
}
