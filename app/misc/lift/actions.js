"use server";

import { sql } from "@vercel/postgres";
import { SESSIONS } from "./data";
import { requireAuth } from "../../lib/auth";

const VALID_SESSIONS = new Set(Object.keys(SESSIONS));
const PROGRAM_WEEKS = 6;

/**
 * Creates the set-log table if it doesn't exist. Each row is one logged set,
 * keyed by (week, session_type, exercise_idx, set_idx) so logs are scoped per
 * week of the block. Weight and reps are stored as text to preserve exactly
 * what was entered (including empty and decimal values).
 */
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_set_log (
      week         INTEGER     NOT NULL,
      session_type TEXT        NOT NULL,
      exercise_idx INTEGER     NOT NULL,
      set_idx      INTEGER     NOT NULL,
      weight       TEXT        NOT NULL DEFAULT '',
      reps         TEXT        NOT NULL DEFAULT '',
      done         BOOLEAN     NOT NULL DEFAULT false,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (week, session_type, exercise_idx, set_idx)
    )
  `;
}

/**
 * Loads every saved set log.
 * @return {Promise<Array>} The saved rows (only cells that have been written).
 */
export async function loadLogs() {
  await requireAuth();
  await ensureSchema();
  const { rows } = await sql`
    SELECT week, session_type, exercise_idx, set_idx, weight, reps, done
    FROM lift_set_log
  `;
  return rows;
}

/**
 * Validates and normalizes one cell, or returns null if it's out of bounds.
 * @param {Object} c - The raw cell descriptor.
 * @return {Object|null} The normalized cell, or null to skip it.
 */
function normalizeCell(c) {
  const week = parseInt(c.week, 10);
  const sessionType = String(c.session_type);
  const exerciseIdx = parseInt(c.exercise_idx, 10);
  const setIdx = parseInt(c.set_idx, 10);
  if (!Number.isInteger(week) || week < 1 || week > PROGRAM_WEEKS) return null;
  if (!VALID_SESSIONS.has(sessionType)) return null;
  const exercise = SESSIONS[sessionType].ex[exerciseIdx];
  if (!exercise) return null;
  if (!Number.isInteger(setIdx) || setIdx < 0 || setIdx >= exercise.sets) {
    return null;
  }
  return {
    week,
    sessionType,
    exerciseIdx,
    setIdx,
    weight: c.weight == null ? "" : String(c.weight),
    reps: c.reps == null ? "" : String(c.reps),
    done: !!c.done,
  };
}

/**
 * Creates the run-log table if it doesn't exist. Each row is one logged run,
 * keyed by (week, day_idx) to distinguish Wednesday and Saturday runs within
 * the same program week.
 */
async function ensureRunSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_run_log (
      week       INTEGER     NOT NULL,
      day_idx    INTEGER     NOT NULL,
      distance   TEXT        NOT NULL DEFAULT '',
      done       BOOLEAN     NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (week, day_idx)
    )
  `;
}

/**
 * Loads every saved run log.
 * @return {Promise<Array>} The saved rows.
 */
export async function loadRunLogs() {
  await requireAuth();
  await ensureRunSchema();
  const { rows } = await sql`
    SELECT week, day_idx, distance, done
    FROM lift_run_log
  `;
  return rows;
}

/**
 * Upserts a run log entry for a specific week and day.
 * @param {number} week - Program week (1–PROGRAM_WEEKS).
 * @param {number} dayIdx - Day index (0–6, Mon–Sun).
 * @param {string} distance - Distance run (stored as text).
 * @param {boolean} done - Whether the run is marked complete.
 */
export async function saveRunLog(week, dayIdx, distance, done) {
  await requireAuth();
  const w = parseInt(week, 10);
  const d = parseInt(dayIdx, 10);
  if (!Number.isInteger(w) || w < 1 || w > PROGRAM_WEEKS) return;
  // A run may be scheduled on any weekday once workouts can be moved.
  if (!Number.isInteger(d) || d < 0 || d > 6) return;
  await ensureRunSchema();
  await sql`
    INSERT INTO lift_run_log (week, day_idx, distance, done, updated_at)
    VALUES (${w}, ${d}, ${String(distance)}, ${!!done}, now())
    ON CONFLICT (week, day_idx)
    DO UPDATE SET
      distance = EXCLUDED.distance,
      done = EXCLUDED.done,
      updated_at = now()
  `;
}

/**
 * Upserts a batch of set cells. Used for both single edits and the weight
 * cascade (which touches several sets at once).
 * @param {Array} cells - Cell descriptors
 *   ({ week, session_type, exercise_idx, set_idx, weight, reps, done }).
 */
export async function saveCells(cells) {
  await requireAuth();
  if (!Array.isArray(cells) || cells.length === 0) return;
  await ensureSchema();
  for (const raw of cells) {
    const c = normalizeCell(raw);
    if (!c) continue;
    await sql`
      INSERT INTO lift_set_log
        (week, session_type, exercise_idx, set_idx, weight, reps, done, updated_at)
      VALUES
        (${c.week}, ${c.sessionType}, ${c.exerciseIdx}, ${c.setIdx},
         ${c.weight}, ${c.reps}, ${c.done}, now())
      ON CONFLICT (week, session_type, exercise_idx, set_idx)
      DO UPDATE SET
        weight = EXCLUDED.weight,
        reps = EXCLUDED.reps,
        done = EXCLUDED.done,
        updated_at = now()
    `;
  }
}

/**
 * Creates the schedule-override table if it doesn't exist. Each row places one
 * day of one week: an optional lift session and whether a run is scheduled.
 * Rows exist only for weeks the user has customized; weeks without rows fall
 * back to the default template.
 */
async function ensureScheduleSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_schedule (
      week         INTEGER     NOT NULL,
      day_idx      INTEGER     NOT NULL,
      lift_session TEXT,
      has_run      BOOLEAN     NOT NULL DEFAULT false,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (week, day_idx)
    )
  `;
}

/**
 * Loads every saved schedule override.
 * @return {Promise<Array>} The saved rows (only for customized weeks).
 */
export async function loadSchedule() {
  await requireAuth();
  await ensureScheduleSchema();
  const { rows } = await sql`
    SELECT week, day_idx, lift_session, has_run
    FROM lift_schedule
  `;
  return rows;
}

/**
 * Persists a full seven-day schedule for one week. Rejects malformed input or a
 * schedule that places the same lift session on two days.
 * @param {number} week - Program week (1–PROGRAM_WEEKS).
 * @param {Array} entries - Seven { lift, run } entries in day order (Mon–Sun).
 */
export async function saveSchedule(week, entries) {
  await requireAuth();
  const w = parseInt(week, 10);
  if (!Number.isInteger(w) || w < 1 || w > PROGRAM_WEEKS) return;
  if (!Array.isArray(entries) || entries.length !== 7) return;

  const seenLifts = new Set();
  const normalized = entries.map((e, i) => {
    let lift = e && e.lift != null ? String(e.lift) : null;
    if (lift && !VALID_SESSIONS.has(lift)) lift = null;
    return { dayIdx: i, lift, run: !!(e && e.run) };
  });
  for (const n of normalized) {
    if (!n.lift) continue;
    if (seenLifts.has(n.lift)) return; // a lift can't sit on two days at once
    seenLifts.add(n.lift);
  }

  await ensureScheduleSchema();
  for (const n of normalized) {
    await sql`
      INSERT INTO lift_schedule (week, day_idx, lift_session, has_run, updated_at)
      VALUES (${w}, ${n.dayIdx}, ${n.lift}, ${n.run}, now())
      ON CONFLICT (week, day_idx)
      DO UPDATE SET
        lift_session = EXCLUDED.lift_session,
        has_run = EXCLUDED.has_run,
        updated_at = now()
    `;
  }
}

/**
 * Clears a week's overrides, restoring it to the default template.
 * @param {number} week - Program week (1–PROGRAM_WEEKS).
 */
export async function resetSchedule(week) {
  await requireAuth();
  const w = parseInt(week, 10);
  if (!Number.isInteger(w) || w < 1 || w > PROGRAM_WEEKS) return;
  await ensureScheduleSchema();
  await sql`DELETE FROM lift_schedule WHERE week = ${w}`;
}

/**
 * Migrates a run log to a new day when its run is moved, so the logged distance
 * follows the run. The destination is guaranteed run-free by the move rules; any
 * stale row there is cleared first to keep the migration safe.
 * @param {number} week - Program week (1–PROGRAM_WEEKS).
 * @param {number} fromDay - The origin day index (0–6).
 * @param {number} toDay - The destination day index (0–6).
 */
export async function moveRunLog(week, fromDay, toDay) {
  await requireAuth();
  const w = parseInt(week, 10);
  const f = parseInt(fromDay, 10);
  const t = parseInt(toDay, 10);
  if (!Number.isInteger(w) || w < 1 || w > PROGRAM_WEEKS) return;
  if (!Number.isInteger(f) || f < 0 || f > 6) return;
  if (!Number.isInteger(t) || t < 0 || t > 6 || f === t) return;
  await ensureRunSchema();
  await sql`DELETE FROM lift_run_log WHERE week = ${w} AND day_idx = ${t}`;
  await sql`
    UPDATE lift_run_log
    SET day_idx = ${t}, updated_at = now()
    WHERE week = ${w} AND day_idx = ${f}
  `;
}
