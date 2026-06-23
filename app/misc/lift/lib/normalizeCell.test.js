import { describe, it, expect } from "vitest";
import { normalizeCell } from "./normalizeCell";
import { SESSIONS, PROGRAM_WEEKS } from "../data";

const SESSION_ID = "upperA";
const MAIN_COUNT = SESSIONS[SESSION_ID].exercises.length;
const APPENDIX_COUNT = SESSIONS[SESSION_ID].appendix.length;

/**
 * @param {Object} overrides - Fields to override on the default cell.
 * @return {Object} A raw cell descriptor for upperA / set 0.
 */
function cell(overrides) {
  return {
    week: 1,
    session_type: SESSION_ID,
    exercise_idx: 0,
    set_idx: 0,
    weight: "100",
    reps: "10",
    done: true,
    ...overrides,
  };
}

describe("normalizeCell", () => {
  it("accepts a main-lift cell", () => {
    const normalized = normalizeCell(cell({ exercise_idx: 0 }));
    expect(normalized).toMatchObject({
      exerciseIndex: 0,
      weight: "100",
      reps: "10",
    });
  });

  it("accepts appendix (abs) cells", () => {
    for (let offset = 0; offset < APPENDIX_COUNT; offset++) {
      const index = MAIN_COUNT + offset;
      const normalized = normalizeCell(cell({ exercise_idx: index }));
      expect(normalized, `appendix index ${index}`).not.toBeNull();
      expect(normalized.exerciseIndex).toBe(index);
    }
  });

  it("rejects an index past the appendix", () => {
    const index = MAIN_COUNT + APPENDIX_COUNT;
    expect(normalizeCell(cell({ exercise_idx: index }))).toBeNull();
  });

  it("rejects an unknown session", () => {
    expect(normalizeCell(cell({ session_type: "nope" }))).toBeNull();
  });

  it("rejects out-of-range weeks", () => {
    expect(normalizeCell(cell({ week: 0 }))).toBeNull();
    expect(normalizeCell(cell({ week: PROGRAM_WEEKS + 1 }))).toBeNull();
  });

  it("rejects a set index past the exercise's set count", () => {
    const sets = SESSIONS[SESSION_ID].exercises[0].sets;
    expect(normalizeCell(cell({ set_idx: sets }))).toBeNull();
  });
});
