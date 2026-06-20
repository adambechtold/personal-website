import { describe, it, expect } from "vitest";
import {
  defaultDaySchedule,
  buildSchedules,
  scheduleForWeek,
  moveInSchedule,
} from "./schedule";
import { PROGRAM_WEEKS } from "./data";

describe("defaultDaySchedule", () => {
  it("places the four lifts Mon/Tue/Thu/Fri and runs Wed/Sat", () => {
    const s = defaultDaySchedule();
    expect(s.map((d) => d.lift)).toEqual([
      "upperA",
      "lowerA",
      null,
      "upperB",
      "lowerB",
      null,
      null,
    ]);
    expect(s.map((d) => d.run)).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
  });
});

describe("buildSchedules", () => {
  it("returns the default template for every week when there are no overrides", () => {
    const schedules = buildSchedules();
    for (let week = 1; week <= PROGRAM_WEEKS; week++) {
      expect(schedules[week]).toEqual(defaultDaySchedule());
    }
  });

  it("applies override rows only to the weeks that have them", () => {
    // Week 2: lift moved off Tue (day 1) and onto Wed (day 2) with its run.
    const rows = [
      { week: 2, day_idx: 1, lift_session: null, has_run: false },
      { week: 2, day_idx: 2, lift_session: "lowerA", has_run: true },
    ];
    const schedules = buildSchedules(rows);
    expect(schedules[1]).toEqual(defaultDaySchedule());
    expect(schedules[2][1]).toEqual({ lift: null, run: false });
    expect(schedules[2][2]).toEqual({ lift: "lowerA", run: true });
    // Untouched days of a customized week still fall back to the default.
    expect(schedules[2][0]).toEqual({ lift: "upperA", run: false });
  });
});

describe("scheduleForWeek", () => {
  it("falls back to the default template for an unknown week", () => {
    expect(scheduleForWeek({}, 3)).toEqual(defaultDaySchedule());
  });
});

describe("moveInSchedule", () => {
  it("moves a lift onto a run day, doubling it up and vacating the origin", () => {
    const before = defaultDaySchedule();
    const after = moveInSchedule(before, "lift", 1, 2); // Tue lift → Wed
    expect(after[1]).toEqual({ lift: null, run: false });
    expect(after[2]).toEqual({ lift: "lowerA", run: true });
    expect(before[1].lift).toBe("lowerA"); // original is untouched
  });

  it("chains: move Tue→Wed, then Mon→Tue", () => {
    const s1 = moveInSchedule(defaultDaySchedule(), "lift", 1, 2);
    const s2 = moveInSchedule(s1, "lift", 0, 1); // Mon lift → now-empty Tue
    expect(s2[0].lift).toBeNull();
    expect(s2[1].lift).toBe("upperA");
    expect(s2[2].lift).toBe("lowerA");
  });

  it("no-ops a lift move onto a day that already has a lift", () => {
    const before = defaultDaySchedule();
    const after = moveInSchedule(before, "lift", 0, 1); // Mon → Tue (occupied)
    expect(after).toEqual(before);
  });

  it("no-ops a run move onto a day that already has a run", () => {
    const before = defaultDaySchedule();
    const after = moveInSchedule(before, "run", 2, 5); // Wed run → Sat (occupied)
    expect(after).toEqual(before);
  });

  it("moves a run and carries nothing else with it", () => {
    const after = moveInSchedule(defaultDaySchedule(), "run", 2, 3); // Wed → Thu
    expect(after[2].run).toBe(false);
    expect(after[3]).toEqual({ lift: "upperB", run: true });
  });
});
