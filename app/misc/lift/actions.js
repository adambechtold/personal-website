"use server";

import { sql } from "@vercel/postgres";
import { SESSIONS } from "./data";

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
 * Upserts a batch of set cells. Used for both single edits and the weight
 * cascade (which touches several sets at once).
 * @param {Array} cells - Cell descriptors
 *   ({ week, session_type, exercise_idx, set_idx, weight, reps, done }).
 */
export async function saveCells(cells) {
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
