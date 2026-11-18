import { describe, it, expect } from "vitest";
import { normalizeGame, parsePlayerList } from "./normalizeGame";
import { SEED_GAMES } from "./seedGame";

describe("normalizeGame", () => {
  it("leaves every seed game unchanged", () => {
    for (const seed of SEED_GAMES) {
      expect(normalizeGame(seed.game)).toEqual(seed.game);
    }
  });

  it("requires at least 1 player", () => {
    expect(() => normalizeGame({ players: [] })).toThrow();
    expect(() => normalizeGame({ players: ["  ", ""] })).toThrow();
    expect(() => normalizeGame(null)).toThrow();
  });

  it("trims the name and players and drops blank players", () => {
    const game = normalizeGame({
      name: "  Friday  ",
      players: [" adam ", "", "luis"],
    });
    expect(game).toEqual({
      name: "Friday",
      players: ["adam", "luis"],
      turns: [],
    });
  });

  it("defaults a missing name to an empty string", () => {
    expect(normalizeGame({ players: ["adam"] }).name).toBe("");
  });

  it("uppercases letters and drops anything that isn't A–Z", () => {
    const game = normalizeGame({
      players: ["adam"],
      turns: [
        {
          words: [
            {
              tiles: [
                { letter: "c", bonus: "none" },
                { letter: "7", bonus: "none" },
                { letter: "AB", bonus: "none" },
                { letter: "é", bonus: "none" },
                null,
                { letter: "t", bonus: "triple-word" },
              ],
            },
          ],
          bingo: false,
        },
      ],
    });
    expect(game.turns[0].words[0].tiles).toEqual([
      { letter: "C", bonus: "none" },
      { letter: "T", bonus: "triple-word" },
    ]);
  });

  it("maps unknown bonuses to none", () => {
    const game = normalizeGame({
      players: ["adam"],
      turns: [{ words: [{ tiles: [{ letter: "A", bonus: "quadruple" }] }] }],
    });
    expect(game.turns[0].words[0].tiles[0].bonus).toBe("none");
  });

  it("drops empty words, turning an all-empty turn into a pass", () => {
    const game = normalizeGame({
      players: ["adam"],
      turns: [
        {
          words: [{ tiles: [] }, { tiles: [{ letter: "A", bonus: "none" }] }],
          bingo: true,
        },
        { words: [{ tiles: [{ letter: "1" }] }, {}], bingo: true },
        { bingo: "yes" },
      ],
    });
    expect(game.turns).toEqual([
      { words: [{ tiles: [{ letter: "A", bonus: "none" }] }], bingo: true },
      { words: [], bingo: false },
      { words: [], bingo: false },
    ]);
  });
});

describe("parsePlayerList", () => {
  it("splits on commas and trims", () => {
    expect(parsePlayerList(" adam, adela ,, luis ")).toEqual([
      "adam",
      "adela",
      "luis",
    ]);
    expect(parsePlayerList("")).toEqual([]);
  });
});
