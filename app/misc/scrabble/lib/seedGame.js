// In-progress games inserted into scrabble_games, each exactly once (see
// SEED_GAMES and ensureSchema in ../actions.js).

const SHORTHAND_BONUSES = {
  "'": "double-letter",
  '"': "triple-letter",
  "*": "double-word",
  "!": "triple-word",
};

/**
 * Parses one word written in shorthand, where a letter followed by ' is a
 * double letter, " a triple letter, * a double word and ! a triple word.
 * @param {string} shorthand - e.g. `TO*ES`.
 * @return {{tiles: Array<{letter: string, bonus: string}>}} The word.
 */
export function parseShorthandWord(shorthand) {
  const tiles = [];
  for (const character of shorthand) {
    const bonus = SHORTHAND_BONUSES[character];
    if (bonus && tiles.length > 0) {
      tiles[tiles.length - 1].bonus = bonus;
    } else if (/[A-Za-z]/.test(character)) {
      tiles.push({ letter: character.toUpperCase(), bonus: "none" });
    }
  }
  return { tiles };
}

/**
 * Parses one turn written in shorthand: words separated by commas.
 * @param {string} shorthand - e.g. `F"IST, OF", K'I`.
 * @return {{words: Array, bingo: boolean}} The turn.
 */
export function parseShorthandTurn(shorthand) {
  return {
    words: shorthand
      .split(",")
      .map((word) => word.trim())
      .filter((word) => word !== "")
      .map(parseShorthandWord),
    bingo: false,
  };
}

const ADAM_ADELA_LUIS_TURNS = [
  "TO*ES",
  "TOK'E",
  'F"IST, OF", K\'I',
  "O*F, OFF",
  "R!UBLI, IT",
  'UNG"REEN*',
  "D'ELI*",
  "UNGREENS, SPI'TZ",
  "BORA'X, TA', OX",
  "CU'BING*",
  'V"OID, OD',
  "COVE'N, OVOID",
  "W'IZ",
  "AE*RIAL",
  "AJ*I, AG",
  "SPITZE!S",
];

export const SEED_GAME = {
  name: "Adam, Adela & Luis",
  players: ["adam", "adela", "luis"],
  turns: ADAM_ADELA_LUIS_TURNS.map(parseShorthandTurn),
};

const LUIS_ADAM_ADELA_TURNS = [
  "W*ADI",
  'C"OD',
  "W'ET', AT', WE",
  "L'OX, L'AT, XI",
];

export const LUIS_ADAM_ADELA_GAME = {
  name: "Luis, Adam & Adela",
  players: ["luis", "adam", "adela"],
  turns: LUIS_ADAM_ADELA_TURNS.map(parseShorthandTurn),
};

/**
 * Every seed game, keyed so each one is inserted exactly once. Keys are
 * recorded in the scrabble_seeds table; never rename or reuse one, or the
 * game would be inserted again.
 */
export const SEED_GAMES = [
  { key: "adam-adela-luis", game: SEED_GAME },
  { key: "luis-adam-adela", game: LUIS_ADAM_ADELA_GAME },
];
