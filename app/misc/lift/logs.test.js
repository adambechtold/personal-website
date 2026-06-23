import { describe, it, expect } from "vitest";
import { buildLogs } from "./logs";
import { PROGRAM_WEEKS } from "./data";

const SID = "upperA";
const EX = 0;
const SET = 0;

/**
 * @param {Object} overrides - Fields to override on the default saved row.
 * @return {Object} A saved set-log row for upperA / exercise 0 / set 0.
 */
function row(overrides) {
  return {
    week: 1,
    session_type: SID,
    exercise_idx: EX,
    set_idx: SET,
    weight: "",
    reps: "",
    done: false,
    ...overrides,
  };
}

/**
 * @param {Object} logs - A built logs structure.
 * @param {number} week - The week to read.
 * @return {Object} The upperA / exercise 0 / set 0 cell for that week.
 */
function setAt(logs, week) {
  return logs[week][SID][EX].sets[SET];
}

describe("buildLogs", () => {
  it("creates an entry for every week of the block", () => {
    const logs = buildLogs();
    for (let week = 1; week <= PROGRAM_WEEKS; week++) {
      expect(logs[week][SID][EX].sets).toHaveLength(4);
    }
  });

  it("starts every set empty when nothing is saved", () => {
    const logs = buildLogs();
    expect(setAt(logs, 1)).toEqual({
      weight: "",
      reps: "",
      done: false,
      isRolledForward: false,
    });
  });

  it("overlays a saved row onto the matching week/session/exercise/set", () => {
    const logs = buildLogs([row({ weight: "135", reps: "8", done: true })]);
    expect(setAt(logs, 1)).toEqual({
      weight: "135",
      reps: "8",
      done: true,
      isRolledForward: false,
    });
  });
});

describe("rolling sets forward", () => {
  it("pre-fills next week's weight and reps as a suggestion", () => {
    const logs = buildLogs([row({ week: 1, weight: "135", reps: "8" })]);
    expect(setAt(logs, 2)).toEqual({
      weight: "135",
      reps: "8",
      done: false,
      isRolledForward: true,
    });
  });

  it("never rolls completion forward", () => {
    const logs = buildLogs([
      row({ week: 1, weight: "135", reps: "8", done: true }),
    ]);
    expect(setAt(logs, 2).done).toBe(false);
  });

  it("leaves week 1 untouched (no earlier week to inherit from)", () => {
    const logs = buildLogs([row({ week: 1, weight: "135", reps: "8" })]);
    expect(setAt(logs, 1).isRolledForward).toBe(false);
  });

  it("inherits from the most recently logged week", () => {
    const logs = buildLogs([
      row({ week: 1, weight: "135", reps: "8" }),
      row({ week: 2, weight: "145", reps: "7" }),
    ]);
    expect(setAt(logs, 3)).toMatchObject({
      weight: "145",
      reps: "7",
      isRolledForward: true,
    });
  });

  it("rolls across gaps — an unlogged week inherits from the last logged one", () => {
    const logs = buildLogs([row({ week: 1, weight: "135", reps: "8" })]);
    expect(setAt(logs, 3)).toMatchObject({ weight: "135", reps: "8" });
    expect(setAt(logs, PROGRAM_WEEKS)).toMatchObject({
      weight: "135",
      reps: "8",
    });
  });

  it("does not overwrite a week that has its own logged value", () => {
    const logs = buildLogs([
      row({ week: 1, weight: "135", reps: "8" }),
      row({ week: 2, weight: "140", reps: "6" }),
    ]);
    expect(setAt(logs, 2)).toMatchObject({
      weight: "140",
      reps: "6",
      isRolledForward: false,
    });
  });

  it("does not roll into an unrelated set that was never logged", () => {
    const logs = buildLogs([row({ week: 1, weight: "135", reps: "8" })]);
    expect(logs[2][SID][EX].sets[1]).toEqual({
      weight: "",
      reps: "",
      done: false,
      isRolledForward: false,
    });
  });

  // Lateral Raise is exercise index 4 in both upperA (Mon) and upperB (Thu).
  const LAT = 4;

  it("inherits an exercise done on another day from its last occurrence", () => {
    const logs = buildLogs([
      row({
        week: 1,
        session_type: "upperA",
        exercise_idx: LAT,
        weight: "25",
        reps: "15",
      }),
    ]);
    // Same week, later day: upperB's Lateral Raise inherits from upperA's,
    // rather than waiting a full week for the next upperB.
    expect(logs[1].upperB[LAT].sets[SET]).toMatchObject({
      weight: "25",
      reps: "15",
      isRolledForward: true,
    });
  });

  it("rolls forward from the most recent day the exercise was performed", () => {
    const logs = buildLogs([
      row({
        week: 1,
        session_type: "upperA",
        exercise_idx: LAT,
        weight: "25",
        reps: "15",
      }),
      row({
        week: 1,
        session_type: "upperB",
        exercise_idx: LAT,
        weight: "30",
        reps: "12",
      }),
    ]);
    // Week 2 upperA inherits from week 1 upperB (the latest), not week 1 upperA.
    expect(logs[2].upperA[LAT].sets[SET]).toMatchObject({
      weight: "30",
      reps: "12",
      isRolledForward: true,
    });
  });
});
