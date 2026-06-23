import { describe, it, expect } from "vitest";
import { deriveSessionView } from "./sessionView";
import { buildLogs } from "../logs";
import { SESSIONS } from "../data";

const SID = "upperA";

/**
 * @param {Object} overrides - Map of exercise index to override name.
 * @return {Object} The derived workout view for upperA, week 1.
 */
function view(overrides) {
  return deriveSessionView({
    sess: SESSIONS[SID],
    log: buildLogs()[1][SID],
    expanded: null,
    restCompound: 150,
    restIso: 75,
    overrides,
  });
}

describe("deriveSessionView exercise name overrides", () => {
  const canonical = SESSIONS[SID].ex[0].n;

  it("uses the canonical name when there is no override", () => {
    const ex = view({}).exercises[0];
    expect(ex.name).toBe(canonical);
    expect(ex.baseName).toBe(canonical);
    expect(ex.override).toBe("");
    expect(ex.originalName).toBeNull();
  });

  it("shows the override as the name and keeps the original alongside", () => {
    const ex = view({ 0: "Smith Machine Bench" }).exercises[0];
    expect(ex.name).toBe("Smith Machine Bench");
    expect(ex.override).toBe("Smith Machine Bench");
    expect(ex.originalName).toBe(canonical);
  });

  it("treats a whitespace-only override as no override", () => {
    const ex = view({ 0: "   " }).exercises[0];
    expect(ex.name).toBe(canonical);
    expect(ex.originalName).toBeNull();
  });

  it("defaults to no overrides when the map is omitted", () => {
    const v = deriveSessionView({
      sess: SESSIONS[SID],
      log: buildLogs()[1][SID],
      expanded: null,
      restCompound: 150,
      restIso: 75,
    });
    expect(v.exercises[0].name).toBe(canonical);
    expect(v.exercises[0].originalName).toBeNull();
  });
});
