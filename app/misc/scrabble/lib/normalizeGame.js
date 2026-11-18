// Cleans an untrusted game object (from the client or the database) into the
// stored shape. Kept out of the "use server" actions file so it can be
// unit-tested without a DB or auth.

import { BONUSES } from "./scoring";

const VALID_BONUSES = new Set(BONUSES);
const MAX_NAME_LENGTH = 100;
const MAX_PLAYER_NAME_LENGTH = 40;
const MAX_PLAYERS = 8;
const MAX_TURNS = 500;
const MAX_WORDS_PER_TURN = 20;
const MAX_TILES_PER_WORD = 15;

/**
 * Cleans one tile, or returns null if it isn't a single A–Z letter.
 * @param {*} rawTile - The untrusted tile.
 * @return {{letter: string, bonus: string}|null} The tile, or null to drop.
 */
function normalizeTile(rawTile) {
  if (!rawTile || typeof rawTile !== "object") return null;
  const letter = String(rawTile.letter ?? "").toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return null;
  const bonus = VALID_BONUSES.has(rawTile.bonus) ? rawTile.bonus : "none";
  return { letter, bonus };
}

/**
 * Cleans one word, or returns null if it has no valid tiles.
 * @param {*} rawWord - The untrusted word.
 * @return {{tiles: Array}|null} The word, or null to drop.
 */
function normalizeWord(rawWord) {
  const rawTiles = Array.isArray(rawWord?.tiles) ? rawWord.tiles : [];
  const tiles = rawTiles
    .slice(0, MAX_TILES_PER_WORD)
    .map(normalizeTile)
    .filter(Boolean);
  return tiles.length > 0 ? { tiles } : null;
}

/**
 * Cleans one turn. A turn whose words are all empty becomes a pass.
 * @param {*} rawTurn - The untrusted turn.
 * @return {{words: Array, bingo: boolean}} The turn.
 */
function normalizeTurn(rawTurn) {
  const rawWords = Array.isArray(rawTurn?.words) ? rawTurn.words : [];
  const words = rawWords
    .slice(0, MAX_WORDS_PER_TURN)
    .map(normalizeWord)
    .filter(Boolean);
  return { words, bingo: words.length > 0 && rawTurn.bingo === true };
}

/**
 * Cleans a whole game: trims the name and player names, uppercases letters
 * and drops anything that isn't A–Z, maps unknown bonuses to "none", and drops
 * empty words.
 * @param {*} input - The untrusted game.
 * @return {{name: string, players: Array<string>, turns: Array}} The game.
 * @throws {Error} If the game has no players.
 */
export function normalizeGame(input) {
  const rawPlayers = Array.isArray(input?.players) ? input.players : [];
  const players = rawPlayers
    .map((player) =>
      String(player ?? "")
        .trim()
        .slice(0, MAX_PLAYER_NAME_LENGTH)
    )
    .filter((player) => player !== "")
    .slice(0, MAX_PLAYERS);
  if (players.length === 0) throw new Error("A game needs at least 1 player.");

  const rawTurns = Array.isArray(input.turns) ? input.turns : [];
  return {
    name: String(input.name ?? "")
      .trim()
      .slice(0, MAX_NAME_LENGTH),
    players,
    turns: rawTurns.slice(0, MAX_TURNS).map(normalizeTurn),
  };
}

/**
 * Splits a comma-separated list of player names, in turn order.
 * @param {string} text - e.g. "adam, adela, luis".
 * @return {Array<string>} The trimmed, non-empty names.
 */
export function parsePlayerList(text) {
  return String(text ?? "")
    .split(",")
    .map((player) => player.trim())
    .filter((player) => player !== "");
}
