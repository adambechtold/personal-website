// Pure Scrabble scoring helpers. No React, DB, or auth here so everything can
// be unit-tested directly (see scoring.test.js).

/** Standard English tile values. */
export const LETTER_VALUES = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};

/** Every tile bonus, in the order tapping a tile cycles through them. */
export const BONUSES = [
  "none",
  "double-letter",
  "triple-letter",
  "double-word",
  "triple-word",
  "blank",
];

/** Points added to a turn that uses all seven tiles. */
export const BINGO_POINTS = 50;

const LETTER_MULTIPLIERS = {
  "double-letter": 2,
  "triple-letter": 3,
  blank: 0,
};

const WORD_MULTIPLIERS = {
  "double-word": 2,
  "triple-word": 3,
};

/**
 * The face value of a single tile, ignoring its bonus square. A blank tile is
 * always worth 0.
 * @param {{letter: string, bonus: string}} tile - The tile.
 * @return {number} The tile's face value.
 */
export function tileValue(tile) {
  if (tile.bonus === "blank") return 0;
  return LETTER_VALUES[tile.letter] || 0;
}

/**
 * Scores one word: the sum of each letter's value times its letter
 * multiplier, times the product of every word multiplier in the word.
 * @param {{tiles: Array<{letter: string, bonus: string}>}} word - The word.
 * @return {number} The word's score.
 */
export function wordScore(word) {
  let letterSum = 0;
  let wordMultiplier = 1;
  for (const tile of word.tiles) {
    const letterMultiplier = LETTER_MULTIPLIERS[tile.bonus] ?? 1;
    letterSum += (LETTER_VALUES[tile.letter] || 0) * letterMultiplier;
    wordMultiplier *= WORD_MULTIPLIERS[tile.bonus] ?? 1;
  }
  return letterSum * wordMultiplier;
}

/**
 * Scores one turn: the sum of its words, plus the bingo bonus if it used all
 * seven tiles. A turn with no words (a pass) scores 0.
 * @param {{words: Array, bingo: boolean}} turn - The turn.
 * @return {number} The turn's score.
 */
export function turnScore(turn) {
  const wordsTotal = turn.words.reduce(
    (total, word) => total + wordScore(word),
    0
  );
  return wordsTotal + (turn.bingo ? BINGO_POINTS : 0);
}

/**
 * The player who played a turn, derived from its position in play order.
 * @param {number} turnIndex - The turn's index in game.turns.
 * @param {number} playerCount - How many players are in the game.
 * @return {number} The index of the player who played it.
 */
export function playerIndexForTurn(turnIndex, playerCount) {
  return turnIndex % playerCount;
}

/**
 * Groups turns into rounds ("Move 1, 2, …"), one turn per player per round,
 * attaching each turn's score and the player's running total after it.
 * @param {{players: Array<string>, turns: Array}} game - The game.
 * @return {Array<{number: number, entries: Array<Object>}>} The rounds. Each
 *   entry has turnIndex, playerIndex, turn, score, and runningTotal.
 */
export function buildRounds(game) {
  const playerCount = game.players.length;
  const runningTotals = game.players.map(() => 0);
  const rounds = [];
  game.turns.forEach((turn, turnIndex) => {
    const playerIndex = playerIndexForTurn(turnIndex, playerCount);
    const score = turnScore(turn);
    runningTotals[playerIndex] += score;
    if (playerIndex === 0 || rounds.length === 0) {
      rounds.push({ number: rounds.length + 1, entries: [] });
    }
    rounds[rounds.length - 1].entries.push({
      turnIndex,
      playerIndex,
      turn,
      score,
      runningTotal: runningTotals[playerIndex],
    });
  });
  return rounds;
}

/**
 * Each player's total score.
 * @param {{players: Array<string>, turns: Array}} game - The game.
 * @return {Array<number>} Totals, in the same order as game.players.
 */
export function playerTotals(game) {
  const totals = game.players.map(() => 0);
  game.turns.forEach((turn, turnIndex) => {
    totals[playerIndexForTurn(turnIndex, game.players.length)] +=
      turnScore(turn);
  });
  return totals;
}

/**
 * The index of the player whose turn is next.
 * @param {{players: Array<string>, turns: Array}} game - The game.
 * @return {number} The next player's index.
 */
export function currentPlayerIndex(game) {
  return playerIndexForTurn(game.turns.length, game.players.length);
}

/**
 * The indexes of the leading player(s). Nobody leads before anyone scores.
 * @param {Array<number>} totals - Totals from playerTotals.
 * @return {Array<number>} Indexes of every player tied for the top score.
 */
export function leaderIndexes(totals) {
  const topScore = Math.max(...totals);
  if (topScore <= 0) return [];
  return totals
    .map((total, playerIndex) => (total === topScore ? playerIndex : -1))
    .filter((playerIndex) => playerIndex !== -1);
}

/**
 * The bonus that follows another when a tile is tapped, wrapping around.
 * @param {string} bonus - The current bonus.
 * @return {string} The next bonus.
 */
export function nextBonus(bonus) {
  const index = BONUSES.indexOf(bonus);
  return BONUSES[(index + 1) % BONUSES.length];
}

/**
 * Turns typed text into tiles. Anything other than A–Z is dropped and letters
 * are uppercased. Each position keeps the bonus of the existing tile at that
 * position, so fixing a typo doesn't wipe the bonuses already set.
 * @param {string} text - The typed word.
 * @param {Array<{letter: string, bonus: string}>} [existingTiles] - The
 *   word's tiles before this edit.
 * @return {Array<{letter: string, bonus: string}>} The new tiles.
 */
export function tilesFromText(text, existingTiles = []) {
  const letters = String(text)
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("");
  return letters.map((letter, index) => ({
    letter,
    bonus: existingTiles[index]?.bonus ?? "none",
  }));
}

/**
 * The letters of a word as a plain string.
 * @param {{tiles: Array<{letter: string}>}} word - The word.
 * @return {string} The word's text.
 */
export function wordText(word) {
  return word.tiles.map((tile) => tile.letter).join("");
}
