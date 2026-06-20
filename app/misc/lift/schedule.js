import { WEEK, PROGRAM_WEEKS } from "./data";

// The schedule models each weekday as two independent tracks: an optional lift
// session and an optional run. A day can hold a lift AND a run (doubling up),
// but never two lifts or two runs. Each entry is { lift: <sessionId|null>,
// run: <boolean> }, in day-index order (0–6 = Mon–Sun).

/**
 * The base weekly schedule, derived from the static WEEK template.
 * @return {Array<{lift: ?string, run: boolean}>} Seven day entries.
 */
export function defaultDaySchedule() {
  return WEEK.map((d) => ({
    lift: d.s === "run" || d.s === "off" ? null : d.s,
    run: d.s === "run",
  }));
}

/**
 * Builds the per-week schedules: the default template for every week, with any
 * saved override rows applied on top. A week is only customized if it has rows;
 * each override row replaces that day's entry entirely.
 * @param {Array} [overrideRows] - Rows from lift_schedule
 *   ({ week, day_idx, lift_session, has_run }).
 * @return {Object} Schedules keyed by week, each a seven-entry array.
 */
export function buildSchedules(overrideRows = []) {
  const byWeek = {};
  for (const row of overrideRows) {
    if (!byWeek[row.week]) byWeek[row.week] = {};
    byWeek[row.week][row.day_idx] = {
      lift: row.lift_session || null,
      run: !!row.has_run,
    };
  }
  const out = {};
  for (let week = 1; week <= PROGRAM_WEEKS; week++) {
    const def = defaultDaySchedule();
    const overrides = byWeek[week];
    out[week] = overrides ? def.map((d, i) => overrides[i] ?? d) : def;
  }
  return out;
}

/**
 * Returns the schedule for a week, falling back to the default template.
 * @param {Object} schedules - Schedules keyed by week.
 * @param {number} week - The week to read.
 * @return {Array<{lift: ?string, run: boolean}>} The week's seven entries.
 */
export function scheduleForWeek(schedules, week) {
  return schedules[week] ?? defaultDaySchedule();
}

/**
 * Moves a track's item from one day to another within a week's schedule,
 * returning a new seven-entry array. The caller guarantees the target day's
 * matching track is free (lift→lift and run→run collisions are blocked in the
 * picker). No-ops if the move would land on an occupied slot.
 * @param {Array} weekSchedule - The current week's seven entries.
 * @param {"lift"|"run"} track - Which track to move.
 * @param {number} fromIdx - The origin day index.
 * @param {number} toIdx - The destination day index.
 * @return {Array} A new seven-entry array with the move applied.
 */
export function moveInSchedule(weekSchedule, track, fromIdx, toIdx) {
  const next = weekSchedule.map((d) => ({ ...d }));
  if (fromIdx === toIdx) return next;
  if (track === "lift") {
    if (next[toIdx].lift != null) return next;
    next[toIdx].lift = next[fromIdx].lift;
    next[fromIdx].lift = null;
  } else {
    if (next[toIdx].run) return next;
    next[toIdx].run = true;
    next[fromIdx].run = false;
  }
  return next;
}
