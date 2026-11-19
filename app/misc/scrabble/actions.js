"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "../../lib/auth";
import { requireReadAccess, requireWriteAccess } from "../../lib/access";
import { revokeShareKey } from "../../lib/shareLinks";
import { normalizeGame, parsePlayerList } from "./lib/normalizeGame";
import { SEED_GAMES } from "./lib/seedGame";

/**
 * Creates the games table and the seed ledger if they don't exist, then
 * inserts any seed game that hasn't been inserted before. One row per game;
 * every edit overwrites `state` with the whole game.
 *
 * `scrabble_seeds` records each seed key once it has been inserted, so a seed
 * goes in exactly once: it isn't duplicated by racing instances and doesn't
 * come back after the game is deleted.
 */
async function migrateSchema() {
  const { rows } = await sql`
    SELECT to_regclass('scrabble_games') AS games_table,
           to_regclass('scrabble_seeds') AS seeds_table
  `;
  const gamesTableExisted = rows[0]?.games_table != null;
  const seedsTableExisted = rows[0]?.seeds_table != null;
  await sql`
    CREATE TABLE IF NOT EXISTS scrabble_games (
      id         SERIAL      PRIMARY KEY,
      state      JSONB       NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Snapshots of earlier game states, so a game wrecked by a bad edit (or a
  // bad actor with a share link) can be restored by hand. See saveGame.
  await sql`
    CREATE TABLE IF NOT EXISTS scrabble_game_revisions (
      id       SERIAL      PRIMARY KEY,
      game_id  INTEGER     NOT NULL,
      state    JSONB       NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS scrabble_game_revisions_game_saved
    ON scrabble_game_revisions (game_id, saved_at)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scrabble_seeds (
      key         TEXT        PRIMARY KEY,
      inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  if (gamesTableExisted && !seedsTableExisted) {
    // The games table predates the ledger, and creating it inserted the first
    // seed game. Record that so the game isn't inserted a second time.
    await sql`
      INSERT INTO scrabble_seeds (key) VALUES (${SEED_GAMES[0].key})
      ON CONFLICT DO NOTHING
    `;
  }
  for (const seed of SEED_GAMES) {
    const seedState = JSON.stringify(normalizeGame(seed.game));
    // Claiming the key and inserting the game is one statement, so the game
    // is inserted only by whichever caller claims the key.
    await sql`
      WITH claimed AS (
        INSERT INTO scrabble_seeds (key) VALUES (${seed.key})
        ON CONFLICT DO NOTHING
        RETURNING key
      )
      INSERT INTO scrabble_games (state)
      SELECT ${seedState}::jsonb FROM claimed
    `;
  }
}

// The in-flight or completed migration for this server instance.
let schemaReady = null;

/**
 * Ensures the games table exists. The migration runs once per server instance
 * rather than before every query; a failed run is forgotten so the next call
 * retries it.
 * @return {Promise<void>}
 */
export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = migrateSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/**
 * Parses a game id from untrusted input.
 * @param {*} gameId - The raw id.
 * @return {number|null} The id, or null if it isn't a positive integer.
 */
function parseGameId(gameId) {
  const parsedGameId = Number(gameId);
  return Number.isInteger(parsedGameId) && parsedGameId > 0
    ? parsedGameId
    : null;
}

/**
 * Lists every game, most recently edited first.
 * @return {Promise<Array<{id: number, game: Object, updatedAt: string}>>}
 */
export async function listGames() {
  await requireAuth();
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, state, updated_at FROM scrabble_games
    ORDER BY updated_at DESC, id DESC
  `;
  const games = [];
  for (const row of rows) {
    try {
      games.push({
        id: row.id,
        game: normalizeGame(row.state),
        updatedAt: new Date(row.updated_at).toISOString(),
      });
    } catch {
      // A row that can't be normalized (no players) is skipped, not fatal.
    }
  }
  return games;
}

/**
 * Loads one game.
 * @param {number} gameId - The game id.
 * @param {string} [shareKey] - A guest's share key for this game.
 * @return {Promise<Object|null>} The normalized game, or null if not found.
 */
export async function loadGame(gameId, shareKey) {
  const parsedGameId = parseGameId(gameId);
  if (parsedGameId == null) return null;
  await requireReadAccess("scrabble", parsedGameId, shareKey);
  await ensureSchema();
  const { rows } =
    await sql`SELECT state FROM scrabble_games WHERE id = ${parsedGameId}`;
  if (rows.length === 0) return null;
  return normalizeGame(rows[0].state);
}

// At most one revision per game per this many minutes, kept this many days.
// Time-based (not count-based) retention means a flood of bad saves can't push
// the good snapshots out.
const REVISION_INTERVAL_MINUTES = 5;
const REVISION_RETENTION_DAYS = 30;

/**
 * Snapshots a game's current state before it is overwritten, unless it was
 * snapshotted in the last few minutes, and drops snapshots past retention.
 * @param {number} gameId - The parsed game id.
 */
async function snapshotGame(gameId) {
  await sql`
    INSERT INTO scrabble_game_revisions (game_id, state)
    SELECT id, state FROM scrabble_games
    WHERE id = ${gameId} AND NOT EXISTS (
      SELECT 1 FROM scrabble_game_revisions
      WHERE game_id = ${gameId}
        AND saved_at > now() - make_interval(mins => ${REVISION_INTERVAL_MINUTES})
    )
  `;
  await sql`
    DELETE FROM scrabble_game_revisions
    WHERE game_id = ${gameId}
      AND saved_at < now() - make_interval(days => ${REVISION_RETENTION_DAYS})
  `;
}

/**
 * Overwrites a game's state with the whole (normalized) game.
 * @param {number} gameId - The game id.
 * @param {Object} game - The full game.
 * @param {string} [shareKey] - A guest's share key for this game.
 * @return {Promise<Object>} The game as stored.
 */
export async function saveGame(gameId, game, shareKey) {
  const parsedGameId = parseGameId(gameId);
  if (parsedGameId == null) throw new Error("Invalid game id");
  await requireWriteAccess("scrabble", parsedGameId, shareKey);
  const normalizedGame = normalizeGame(game);
  await ensureSchema();
  await snapshotGame(parsedGameId);
  const { rowCount } = await sql`
    UPDATE scrabble_games
    SET state = ${JSON.stringify(normalizedGame)}::jsonb, updated_at = now()
    WHERE id = ${parsedGameId}
  `;
  if (rowCount === 0) {
    throw new Error("Game not found — it may have been deleted.");
  }
  revalidatePath("/misc/scrabble");
  return normalizedGame;
}

/**
 * Creates a game and redirects to it.
 * @param {string} name - Optional game name.
 * @param {string} playersText - Comma-separated players in turn order.
 * @return {Promise<{error: string}|undefined>} An error for the form, or
 *   nothing (the redirect ends the request) on success.
 */
export async function createGame(name, playersText) {
  await requireAuth();
  const players = parsePlayerList(playersText);
  if (players.length === 0) return { error: "Add at least one player." };
  const game = normalizeGame({ name, players, turns: [] });
  await ensureSchema();
  const { rows } = await sql`
    INSERT INTO scrabble_games (state)
    VALUES (${JSON.stringify(game)}::jsonb)
    RETURNING id
  `;
  revalidatePath("/misc/scrabble");
  redirect(`/misc/scrabble/${rows[0].id}`);
}

/**
 * Deletes a game and returns to the game list.
 * @param {number} gameId - The game id.
 */
export async function deleteGame(gameId) {
  await requireAuth();
  const parsedGameId = parseGameId(gameId);
  if (parsedGameId == null) throw new Error("Invalid game id");
  await ensureSchema();
  await sql`DELETE FROM scrabble_games WHERE id = ${parsedGameId}`;
  await revokeShareKey("scrabble", parsedGameId);
  revalidatePath("/misc/scrabble");
  redirect("/misc/scrabble");
}
