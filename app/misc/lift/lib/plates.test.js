import { describe, it, expect } from "vitest";
import { computePlates, platePresetForUnit, PLATE_PRESETS } from "./plates";

const POUNDS = PLATE_PRESETS.lb;
const KILOS = PLATE_PRESETS.kg;

describe("computePlates", () => {
  it("returns empty for a non-numeric weight", () => {
    const result = computePlates("", POUNDS);
    expect(result.empty).toBe(true);
    expect(result.perSide).toEqual([]);
  });

  it("flags a weight below the bar", () => {
    const result = computePlates("40", POUNDS);
    expect(result.belowBar).toBe(true);
    expect(result.perSide).toEqual([]);
  });

  it("treats the bare bar as exact with no plates", () => {
    const result = computePlates("45", POUNDS);
    expect(result.belowBar).toBe(false);
    expect(result.perSide).toEqual([]);
    expect(result.isExact).toBe(true);
  });

  it("loads 135 lb as one 45 per side", () => {
    const result = computePlates("135", POUNDS);
    expect(result.perSide).toEqual([{ plateSize: 45, count: 1 }]);
    expect(result.isExact).toBe(true);
    expect(result.remainderPerSide).toBe(0);
  });

  it("loads 225 lb as two 45s per side", () => {
    const result = computePlates("225", POUNDS);
    expect(result.perSide).toEqual([{ plateSize: 45, count: 2 }]);
    expect(result.isExact).toBe(true);
  });

  it("greedily mixes plate sizes largest-first", () => {
    // (185 - 45) / 2 = 70 per side = 45 + 25.
    const result = computePlates("185", POUNDS);
    expect(result.perSide).toEqual([
      { plateSize: 45, count: 1 },
      { plateSize: 25, count: 1 },
    ]);
    expect(result.isExact).toBe(true);
  });

  it("handles fractional plates without float drift", () => {
    // (140 - 45) / 2 = 47.5 per side = 45 + 2.5.
    const result = computePlates("140", POUNDS);
    expect(result.perSide).toEqual([
      { plateSize: 45, count: 1 },
      { plateSize: 2.5, count: 1 },
    ]);
    expect(result.remainderPerSide).toBe(0);
    expect(result.isExact).toBe(true);
  });

  it("reports a remainder when plates cannot hit the target exactly", () => {
    // (137 - 45) / 2 = 46 per side = 45, leaving 1 unmatched.
    const result = computePlates("137", POUNDS);
    expect(result.perSide).toEqual([{ plateSize: 45, count: 1 }]);
    expect(result.isExact).toBe(false);
    expect(result.remainderPerSide).toBe(1);
  });

  it("loads a metric bar with kilo plates", () => {
    // (100 - 20) / 2 = 40 per side = 25 + 15.
    const result = computePlates("100", KILOS);
    expect(result.perSide).toEqual([
      { plateSize: 25, count: 1 },
      { plateSize: 15, count: 1 },
    ]);
    expect(result.isExact).toBe(true);
  });
});

describe("platePresetForUnit", () => {
  it("returns the kilogram preset for kg", () => {
    expect(platePresetForUnit("kg")).toBe(PLATE_PRESETS.kg);
  });

  it("falls back to pounds for an unknown unit", () => {
    expect(platePresetForUnit("stone")).toBe(PLATE_PRESETS.lb);
  });
});
