import { describe, it, expect } from "vitest";
import { deriveSessionView } from "./sessionView";
import { buildLogs } from "../logs";
import { SESSIONS } from "../data";

const SESSION_ID = "upperA";

/**
 * @param {Object} overrides - Map of exercise index to override name.
 * @return {Object} The derived workout view for upperA, week 1.
 */
function view(overrides) {
  return deriveSessionView({
    session: SESSIONS[SESSION_ID],
    log: buildLogs()[1][SESSION_ID],
    expanded: null,
    restCompound: 150,
    restIso: 75,
    overrides,
  });
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
