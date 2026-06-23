// Pure date/schedule helpers for the lifting block: mapping today's weekday to
// the program's Mon-first index, deriving the current program week, and shaping
// saved run-log rows into a lookup. No React, no DB.

import { PROGRAM_WEEKS } from "../data";

// Date.getDay() is 0=Sun..6=Sat; map to Mon=0..Sun=6 to index WEEK.
export const DAY_MAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

// Program week 1 begins the Monday of the week of 2026-06-18 (Thu).
const PROGRAM_START = new Date(2026, 5, 15);

/**
 * @return {number} Today's Mon-first day index (0–6).
 */
export function todayIndex() {
  return DAY_MAP[new Date().getDay()];
}

/**
 * Derives the current program week (1–PROGRAM_WEEKS) from today's date,
 * clamped to the block's bounds.
 * @return {number} The current week number.
 */
export function currentWeek() {
  const elapsedMs = Date.now() - PROGRAM_START.getTime();
  const weekNumber = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(PROGRAM_WEEKS, Math.max(1, weekNumber));
}

/**
 * Clamps a week number to the block's bounds.
 * @param {number} weekNumber - The proposed week.
 * @return {number} The clamped week.
 */
export function clampWeek(weekNumber) {
  return Math.min(PROGRAM_WEEKS, Math.max(1, weekNumber));
}

/**
 * Builds the run logs map from saved database rows.
 * @param {Array} rows - Rows from lift_run_log.
 * @return {Object} Run logs keyed by week, then day index.
 */
export function buildRunLogs(rows = []) {
  const runLogs = {};
  for (const row of rows) {
    if (!runLogs[row.week]) runLogs[row.week] = {};
    runLogs[row.week][row.day_idx] = {
      distance: row.distance ?? "",
      done: !!row.done,
    };
  }
  return runLogs;
}
