import { describe, it, expect } from "vitest";
import { deriveSessionView } from "./sessionView";
import { buildLogs } from "../logs";
import { SESSIONS } from "../data";

const SESSION_ID = "upperA";

/**
 * @param {Object} overrides - Map of exercise index to override name.
 * @param {Object} [skips] - Map of exercise index to `true` when skipped.
 * @param {Object} [log] - A logs[week][session] structure to score against.
 * @return {Object} The derived workout view for upperA, week 1.
 */
function view(overrides, skips, log) {
  return deriveSessionView({
    session: SESSIONS[SESSION_ID],
    log: log ?? buildLogs()[1][SESSION_ID],
    expanded: null,
    restCompound: 150,
    restIso: 75,
    overrides,
    skips,
  });
}

/**
 * Marks every set of every exercise as done, so a session reads as fully logged.
 * @param {Object} log - A logs[week][session] structure to mutate.
 * @return {Object} The same structure, for chaining.
 */
function markAllSetsDone(log) {
  for (const exercise of log) {
    for (const set of exercise.sets) set.done = true;
  }
  return log;
}

describe("deriveSessionView exercise name overrides", () => {
  const canonical = SESSIONS[SESSION_ID].exercises[0].name;

  it("uses the canonical name when there is no override", () => {
    const exercise = view({}).exercises[0];
    expect(exercise.name).toBe(canonical);
    expect(exercise.baseName).toBe(canonical);
    expect(exercise.override).toBe("");
    expect(exercise.originalName).toBeNull();
  });

  it("shows the override as the name and keeps the original alongside", () => {
    const exercise = view({ 0: "Smith Machine Bench" }).exercises[0];
    expect(exercise.name).toBe("Smith Machine Bench");
    expect(exercise.override).toBe("Smith Machine Bench");
    expect(exercise.originalName).toBe(canonical);
  });

  it("treats a whitespace-only override as no override", () => {
    const exercise = view({ 0: "   " }).exercises[0];
    expect(exercise.name).toBe(canonical);
    expect(exercise.originalName).toBeNull();
  });

  it("defaults to no overrides when the map is omitted", () => {
    const viewModel = deriveSessionView({
      session: SESSIONS[SESSION_ID],
      log: buildLogs()[1][SESSION_ID],
      expanded: null,
      restCompound: 150,
      restIso: 75,
    });
    expect(viewModel.exercises[0].name).toBe(canonical);
    expect(viewModel.exercises[0].originalName).toBeNull();
  });
});

describe("deriveSessionView skipped exercises", () => {
  it("marks an exercise skipped when present in the skips map", () => {
    const exercises = view({}, { 0: true }).exercises;
    expect(exercises[0].skipped).toBe(true);
    expect(exercises[1].skipped).toBe(false);
  });

  it("defaults every exercise to not skipped when the map is omitted", () => {
    expect(view({}).exercises.every((exercise) => !exercise.skipped)).toBe(
      true
    );
  });

  it("drops a skipped exercise out of the progress denominator", () => {
    const log = buildLogs()[1][SESSION_ID];
    // Log the first exercise fully; leave the rest empty.
    for (const set of log[0].sets) set.done = true;
    // With nothing skipped, one of several exercises done is well under 100%.
    const withoutSkips = view({}, {}, log).percent;
    expect(withoutSkips).toBeLessThan(100);
    // Skip every exercise except the one that's done → the session reads 100%.
    const skips = {};
    SESSIONS[SESSION_ID].exercises.forEach((exercise, index) => {
      if (index !== 0) skips[index] = true;
    });
    SESSIONS[SESSION_ID].appendix.forEach((exercise, appendixIndex) => {
      skips[SESSIONS[SESSION_ID].exercises.length + appendixIndex] = true;
    });
    expect(view({}, skips, log).percent).toBe(100);
  });

  it("reads as complete when every exercise is skipped", () => {
    const skips = {};
    const total =
      SESSIONS[SESSION_ID].exercises.length +
      SESSIONS[SESSION_ID].appendix.length;
    for (let index = 0; index < total; index++) skips[index] = true;
    expect(view({}, skips).percent).toBe(100);
  });

  it("ignores skipped sets so a fully logged session still reads 100%", () => {
    const log = markAllSetsDone(buildLogs()[1][SESSION_ID]);
    expect(view({}, { 0: true }, log).percent).toBe(100);
  });
});
