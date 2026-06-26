import { describe, it, expect } from "vitest";
import { buildLogs, buildOverrides, buildSkips } from "./logs";
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
});

/**
 * @param {Object} overrides - Fields to override on the default override row.
 * @return {Object} An exercise-override row for upperA / exercise 0.
 */
function overrideRow(overrides) {
  return {
    week: 1,
    session_type: SID,
    exercise_idx: EX,
    name: "DB Bench",
    ...overrides,
  };
}

describe("buildOverrides", () => {
  it("gives every week and session an empty bucket when nothing is saved", () => {
    const overrides = buildOverrides();
    for (let week = 1; week <= PROGRAM_WEEKS; week++) {
      expect(overrides[week][SID]).toEqual({});
    }
  });

  it("maps a saved override onto its week/session/exercise", () => {
    const overrides = buildOverrides([overrideRow({ name: "Smith Bench" })]);
    expect(overrides[1][SID][EX]).toBe("Smith Bench");
  });

  it("ignores empty and whitespace-only override names", () => {
    const overrides = buildOverrides([
      overrideRow({ exercise_idx: 0, name: "" }),
      overrideRow({ exercise_idx: 1, name: "   " }),
    ]);
    expect(overrides[1][SID][0]).toBeUndefined();
    expect(overrides[1][SID][1]).toBeUndefined();
  });

  it("scopes an override to its own week", () => {
    const overrides = buildOverrides([overrideRow({ week: 1 })]);
    expect(overrides[1][SID][EX]).toBe("DB Bench");
    expect(overrides[2][SID][EX]).toBeUndefined();
  });
});

/**
 * @param {Object} overrides - Fields to override on the default skip row.
 * @return {Object} A skip row for upperA / exercise 0.
 */
function skipRow(overrides) {
  return {
    week: 1,
    session_type: SID,
    exercise_idx: EX,
    ...overrides,
  };
}

describe("buildSkips", () => {
  it("gives every week and session an empty bucket when nothing is saved", () => {
    const skips = buildSkips();
    for (let week = 1; week <= PROGRAM_WEEKS; week++) {
      expect(skips[week][SID]).toEqual({});
    }
  });

  it("marks a saved skip on its week/session/exercise", () => {
    const skips = buildSkips([skipRow({})]);
    expect(skips[1][SID][EX]).toBe(true);
  });

  it("scopes a skip to its own week", () => {
    const skips = buildSkips([skipRow({ week: 1 })]);
    expect(skips[1][SID][EX]).toBe(true);
    expect(skips[2][SID][EX]).toBeUndefined();
  });

  it("ignores rows whose week or session is out of range", () => {
    const skips = buildSkips([
      skipRow({ week: 99 }),
      skipRow({ session_type: "nope" }),
    ]);
    expect(skips[1][SID][EX]).toBeUndefined();
  });
});
