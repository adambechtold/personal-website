import { describe, it, expect } from "vitest";
import {
  LETTER_VALUES,
  BONUSES,
  tileValue,
  wordScore,
  turnScore,
  buildRounds,
  playerTotals,
  currentPlayerIndex,
  leaderIndexes,
  nextBonus,
  tilesFromText,
  wordText,
} from "./scoring";
import {
  SEED_GAME,
  LUIS_ADAM_ADELA_GAME,
  SEED_GAMES,
  parseShorthandWord,
  parseShorthandTurn,
} from "./seedGame";

/**
 * Builds a word from shorthand for terser tests.
 * @param {string} shorthand - e.g. `TO*ES`.
 * @return {Object} The word.
 */
function word(shorthand) {
  return parseShorthandWord(shorthand);
}

describe("LETTER_VALUES", () => {
  it("uses the standard English values", () => {
    expect(LETTER_VALUES.A).toBe(1);
    expect(LETTER_VALUES.D).toBe(2);
    expect(LETTER_VALUES.B).toBe(3);
    expect(LETTER_VALUES.F).toBe(4);
    expect(LETTER_VALUES.K).toBe(5);
    expect(LETTER_VALUES.J).toBe(8);
    expect(LETTER_VALUES.X).toBe(8);
    expect(LETTER_VALUES.Q).toBe(10);
    expect(LETTER_VALUES.Z).toBe(10);
    expect(Object.keys(LETTER_VALUES)).toHaveLength(26);
  });
});

describe("wordScore", () => {
  it("sums plain letters", () => {
    expect(wordScore(word("CAT"))).toBe(5);
  });

  it("applies letter multipliers to that letter only", () => {
    expect(wordScore(word("C'AT"))).toBe(8);
    expect(wordScore(word('C"AT'))).toBe(11);
  });

  it("multiplies the whole word by every word multiplier", () => {
    expect(wordScore(word("CA*T"))).toBe(10);
    expect(wordScore(word("C!AT"))).toBe(15);
    expect(wordScore(word("C*AT*"))).toBe(20);
    expect(wordScore(word("C!AT!"))).toBe(45);
  });

  it("applies letter multipliers before word multipliers", () => {
    // (3*2 + 1 + 1) * 2
    expect(wordScore(word("C'AT*"))).toBe(16);
  });

  it("scores a blank tile as 0", () => {
    const blankWord = {
      tiles: [
        { letter: "Q", bonus: "blank" },
        { letter: "I", bonus: "none" },
      ],
    };
    expect(wordScore(blankWord)).toBe(1);
    expect(tileValue(blankWord.tiles[0])).toBe(0);
    expect(tileValue(blankWord.tiles[1])).toBe(1);
  });
});

describe("turnScore", () => {
  it("sums every word in the turn", () => {
    expect(turnScore(parseShorthandTurn('F"IST, OF", K\'I'))).toBe(39);
  });

  it("adds 50 for a bingo", () => {
    expect(turnScore({ words: [word("CAT")], bingo: true })).toBe(55);
  });

  it("scores a pass as 0", () => {
    expect(turnScore({ words: [], bingo: false })).toBe(0);
  });
});

describe("seed game", () => {
  it("totals adam 138, adela 93, luis 133", () => {
    expect(playerTotals(SEED_GAME)).toEqual([138, 93, 133]);
  });

  it("has adela up next", () => {
    expect(SEED_GAME.players[currentPlayerIndex(SEED_GAME)]).toBe("adela");
  });

  it("crowns adam", () => {
    expect(leaderIndexes(playerTotals(SEED_GAME))).toEqual([0]);
  });

  it("groups into six rounds with running totals", () => {
    const rounds = buildRounds(SEED_GAME);
    expect(rounds.map((round) => round.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rounds[0].entries.map((entry) => entry.score)).toEqual([8, 13, 39]);
    expect(rounds[1].entries.map((entry) => entry.runningTotal)).toEqual([
      27, 36, 63,
    ]);
    expect(rounds[5].entries).toHaveLength(1);
    expect(rounds[5].entries[0]).toMatchObject({
      turnIndex: 15,
      playerIndex: 0,
      score: 54,
      runningTotal: 138,
    });
  });
});

describe("luis, adam & adela seed game", () => {
  it("matches the score sheet: luis 40, adam 12, adela 19", () => {
    expect(playerTotals(LUIS_ADAM_ADELA_GAME)).toEqual([40, 12, 19]);
    expect(
      buildRounds(LUIS_ADAM_ADELA_GAME).flatMap((round) =>
        round.entries.map((entry) => entry.score)
      )
    ).toEqual([16, 12, 19, 24]);
  });

  it("has adam up next", () => {
    expect(
      LUIS_ADAM_ADELA_GAME.players[currentPlayerIndex(LUIS_ADAM_ADELA_GAME)]
    ).toBe("adam");
  });
});

describe("SEED_GAMES", () => {
  it("has unique keys", () => {
    const keys = SEED_GAMES.map((seed) => seed.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("buildRounds", () => {
  it("returns no rounds for a new game", () => {
    expect(buildRounds({ players: ["a", "b"], turns: [] })).toEqual([]);
  });

  it("counts passes as turns", () => {
    const game = {
      players: ["a", "b"],
      turns: [
        { words: [], bingo: false },
        { words: [word("CAT")], bingo: false },
        { words: [word("DOG")], bingo: false },
      ],
    };
    const rounds = buildRounds(game);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].entries[0]).toMatchObject({ score: 0, runningTotal: 0 });
    expect(rounds[1].entries[0]).toMatchObject({
      playerIndex: 0,
      runningTotal: 5,
    });
    expect(currentPlayerIndex(game)).toBe(1);
  });
});

describe("leaderIndexes", () => {
  it("has no leader before anyone scores", () => {
    expect(leaderIndexes([0, 0])).toEqual([]);
  });

  it("crowns everyone tied for the lead", () => {
    expect(leaderIndexes([10, 4, 10])).toEqual([0, 2]);
  });
});

describe("nextBonus", () => {
  it("cycles through every bonus in order and wraps", () => {
    let bonus = "none";
    const seen = [];
    for (let index = 0; index < BONUSES.length; index++) {
      seen.push(bonus);
      bonus = nextBonus(bonus);
    }
    expect(seen).toEqual(BONUSES);
    expect(bonus).toBe("none");
    expect(nextBonus("none")).toBe("double-letter");
    expect(nextBonus("triple-word")).toBe("blank");
  });
});

describe("tilesFromText", () => {
  it("uppercases and drops anything but A–Z", () => {
    expect(tilesFromText("ca t1!")).toEqual([
      { letter: "C", bonus: "none" },
      { letter: "A", bonus: "none" },
      { letter: "T", bonus: "none" },
    ]);
  });

  it("keeps each position's existing bonus when fixing a typo", () => {
    const existing = word("CA*X").tiles;
    expect(tilesFromText("CAT", existing)).toEqual([
      { letter: "C", bonus: "none" },
      { letter: "A", bonus: "double-word" },
      { letter: "T", bonus: "none" },
    ]);
  });

  it("gives new positions no bonus and drops removed ones", () => {
    const existing = word("C'A").tiles;
    expect(tilesFromText("CAT", existing)[2].bonus).toBe("none");
    expect(tilesFromText("C", existing)).toEqual([
      { letter: "C", bonus: "double-letter" },
    ]);
  });
});

describe("parseShorthandWord", () => {
  it("applies each marker to the letter before it", () => {
    expect(parseShorthandWord("R!UB'L\"I*").tiles).toEqual([
      { letter: "R", bonus: "triple-word" },
      { letter: "U", bonus: "none" },
      { letter: "B", bonus: "double-letter" },
      { letter: "L", bonus: "triple-letter" },
      { letter: "I", bonus: "double-word" },
    ]);
    expect(wordText(parseShorthandWord("R!UBLI"))).toBe("RUBLI");
  });
});
