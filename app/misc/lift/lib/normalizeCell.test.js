import { describe, it, expect } from "vitest";
import { normalizeCell } from "./normalizeCell";
import { SESSIONS, PROGRAM_WEEKS } from "../data";

const SID = "upperA";
const MAIN_COUNT = SESSIONS[SID].ex.length;
const APPENDIX_COUNT = SESSIONS[SID].appendix.length;

/**
 * @param {Object} overrides - Fields to override on the default cell.
 * @return {Object} A raw cell descriptor for upperA / set 0.
 */
function cell(overrides) {
  return {
    week: 1,
    session_type: SID,
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
    const c = normalizeCell(cell({ exercise_idx: 0 }));
    expect(c).toMatchObject({ exerciseIdx: 0, weight: "100", reps: "10" });
  });

  it("accepts appendix (abs) cells", () => {
    for (let i = 0; i < APPENDIX_COUNT; i++) {
      const idx = MAIN_COUNT + i;
      const c = normalizeCell(cell({ exercise_idx: idx }));
      expect(c, `appendix index ${idx}`).not.toBeNull();
      expect(c.exerciseIdx).toBe(idx);
    }
  });

  it("rejects an index past the appendix", () => {
    const idx = MAIN_COUNT + APPENDIX_COUNT;
    expect(normalizeCell(cell({ exercise_idx: idx }))).toBeNull();
  });

  it("rejects an unknown session", () => {
    expect(normalizeCell(cell({ session_type: "nope" }))).toBeNull();
  });

  it("rejects out-of-range weeks", () => {
    expect(normalizeCell(cell({ week: 0 }))).toBeNull();
    expect(normalizeCell(cell({ week: PROGRAM_WEEKS + 1 }))).toBeNull();
  });

  it("rejects a set index past the exercise's set count", () => {
    const sets = SESSIONS[SID].ex[0].sets;
    expect(normalizeCell(cell({ set_idx: sets }))).toBeNull();
  });
});
