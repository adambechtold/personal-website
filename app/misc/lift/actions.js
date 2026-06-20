"use server";

import { sql } from "@vercel/postgres";
import { SESSIONS, WEEK } from "./data";
import { requireAuth } from "../../lib/auth";

const VALID_SESSIONS = new Set(Object.keys(SESSIONS));
const PROGRAM_WEEKS = 6;
const RUN_DAY_INDICES = new Set(
  WEEK.map((d, i) => (d.s === "run" ? i : -1)).filter((i) => i !== -1)
);

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
  if (!RUN_DAY_INDICES.has(d)) return;
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
