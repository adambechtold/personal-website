"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "../../lib/auth";
import { normalizeGame, parsePlayerList } from "./lib/normalizeGame";
import { SEED_GAME } from "./lib/seedGame";

/**
 * Creates the games table if it doesn't exist. One row per game; every edit
 * overwrites `state` with the whole game. When the table is created for the
 * first time, the in-progress seed game is inserted (only if the table is
 * still empty, so two instances racing to create it can't both seed it).
 */
async function migrateSchema() {
  const { rows } =
    await sql`SELECT to_regclass('scrabble_games') AS existing_table`;
  const tableExisted = rows[0]?.existing_table != null;
  await sql`
    CREATE TABLE IF NOT EXISTS scrabble_games (
      id         SERIAL      PRIMARY KEY,
      state      JSONB       NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  if (tableExisted) return;
  const seedState = JSON.stringify(normalizeGame(SEED_GAME));
  await sql`
    INSERT INTO scrabble_games (state)
    SELECT ${seedState}::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM scrabble_games)
  `;
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
 * @return {Promise<Object|null>} The normalized game, or null if not found.
 */
export async function loadGame(gameId) {
  await requireAuth();
  const parsedGameId = parseGameId(gameId);
  if (parsedGameId == null) return null;
  await ensureSchema();
  const { rows } =
    await sql`SELECT state FROM scrabble_games WHERE id = ${parsedGameId}`;
  if (rows.length === 0) return null;
  return normalizeGame(rows[0].state);
}

/**
 * Overwrites a game's state with the whole (normalized) game.
 * @param {number} gameId - The game id.
 * @param {Object} game - The full game.
 * @return {Promise<Object>} The game as stored.
 */
export async function saveGame(gameId, game) {
  await requireAuth();
  const parsedGameId = parseGameId(gameId);
  if (parsedGameId == null) throw new Error("Invalid game id");
  const normalizedGame = normalizeGame(game);
  await ensureSchema();
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
  revalidatePath("/misc/scrabble");
  redirect("/misc/scrabble");
}
