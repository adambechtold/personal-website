"use server";

import { sql } from "@vercel/postgres";
import { SESSIONS, WEEK } from "./data";
import { requireAuth } from "../../lib/auth";
import { normalizeCell } from "./lib/normalizeCell";

const VALID_SESSIONS = new Set(Object.keys(SESSIONS));
const PROGRAM_WEEKS = 6;
const RUN_DAY_INDICES = new Set(
  WEEK.map((day, index) => (day.session === "run" ? index : -1)).filter(
    (index) => index !== -1
  )
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
 * Creates the exercise-override table if it doesn't exist. Each row renames one
 * exercise for a given week + session, keyed by (week, session_type,
 * exercise_idx). A missing row means the exercise shows its canonical name.
 */
export async function ensureOverrideSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_exercise_override (
      week         INTEGER     NOT NULL,
      session_type TEXT        NOT NULL,
      exercise_idx INTEGER     NOT NULL,
      name         TEXT        NOT NULL DEFAULT '',
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (week, session_type, exercise_idx)
    )
  `;
}

/**
 * Loads every saved exercise-name override.
 * @return {Promise<Array>} The saved rows (only exercises that were renamed).
 */
export async function loadOverrides() {
  await requireAuth();
  await ensureOverrideSchema();
  const { rows } = await sql`
    SELECT week, session_type, exercise_idx, name
    FROM lift_exercise_override
  `;
  return rows;
}

/**
 * Upserts an exercise-name override. An empty (or whitespace-only) name clears
 * the override by deleting the row, so the exercise reverts to its canonical
 * name as if it was never renamed.
 * @param {number} week - Program week (1–PROGRAM_WEEKS).
 * @param {string} sessionType - The session id.
 * @param {number} exerciseIndex - The exercise index (main lifts + appendix).
 * @param {string} name - The override name, or "" to clear it.
 */
export async function saveOverride(week, sessionType, exerciseIndex, name) {
  await requireAuth();
  const weekNumber = parseInt(week, 10);
  const sessionTypeStr = String(sessionType);
  const parsedExerciseIndex = parseInt(exerciseIndex, 10);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > PROGRAM_WEEKS
  )
    return;
  if (!VALID_SESSIONS.has(sessionTypeStr)) return;
  const session = SESSIONS[sessionTypeStr];
  const exerciseCount =
    session.exercises.length + (session.appendix?.length || 0);
  if (
    !Number.isInteger(parsedExerciseIndex) ||
    parsedExerciseIndex < 0 ||
    parsedExerciseIndex >= exerciseCount
  )
    return;
  await ensureOverrideSchema();
  const trimmed = name == null ? "" : String(name).trim();
  if (trimmed === "") {
    await sql`
      DELETE FROM lift_exercise_override
      WHERE week = ${weekNumber}
        AND session_type = ${sessionTypeStr}
        AND exercise_idx = ${parsedExerciseIndex}
    `;
    return;
  }
  await sql`
    INSERT INTO lift_exercise_override
      (week, session_type, exercise_idx, name, updated_at)
    VALUES (${weekNumber}, ${sessionTypeStr}, ${parsedExerciseIndex}, ${trimmed}, now())
    ON CONFLICT (week, session_type, exercise_idx)
    DO UPDATE SET name = EXCLUDED.name, updated_at = now()
  `;
}

/**
 * Creates the exercise-skip table if it doesn't exist. Each row marks one
 * exercise as skipped for a given week + session, keyed by (week, session_type,
 * exercise_idx). A missing row means the exercise is active (not skipped).
 */
export async function ensureSkipSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_exercise_skip (
      week         INTEGER     NOT NULL,
      session_type TEXT        NOT NULL,
      exercise_idx INTEGER     NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (week, session_type, exercise_idx)
    )
  `;
}

/**
 * Loads every skipped-exercise marker.
 * @return {Promise<Array>} The saved rows (only exercises that were skipped).
 */
export async function loadSkips() {
  await requireAuth();
  await ensureSkipSchema();
  const { rows } = await sql`
    SELECT week, session_type, exercise_idx
    FROM lift_exercise_skip
  `;
  return rows;
}

/**
 * Marks or unmarks an exercise as skipped. Skipping inserts the marker row;
 * unskipping deletes it, so the exercise becomes active again exactly as if it
 * was never skipped. Logged sets are left untouched either way.
 * @param {number} week - Program week (1–PROGRAM_WEEKS).
 * @param {string} sessionType - The session id.
 * @param {number} exerciseIndex - The exercise index (main lifts + appendix).
 * @param {boolean} skipped - Whether the exercise should be skipped.
 */
export async function saveSkip(week, sessionType, exerciseIndex, skipped) {
  await requireAuth();
  const weekNumber = parseInt(week, 10);
  const sessionTypeStr = String(sessionType);
  const parsedExerciseIndex = parseInt(exerciseIndex, 10);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > PROGRAM_WEEKS
  )
    return;
  if (!VALID_SESSIONS.has(sessionTypeStr)) return;
  const session = SESSIONS[sessionTypeStr];
  const exerciseCount =
    session.exercises.length + (session.appendix?.length || 0);
  if (
    !Number.isInteger(parsedExerciseIndex) ||
    parsedExerciseIndex < 0 ||
    parsedExerciseIndex >= exerciseCount
  )
    return;
  await ensureSkipSchema();
  if (!skipped) {
    await sql`
      DELETE FROM lift_exercise_skip
      WHERE week = ${weekNumber}
        AND session_type = ${sessionTypeStr}
        AND exercise_idx = ${parsedExerciseIndex}
    `;
    return;
  }
  await sql`
    INSERT INTO lift_exercise_skip
      (week, session_type, exercise_idx, updated_at)
    VALUES (${weekNumber}, ${sessionTypeStr}, ${parsedExerciseIndex}, now())
    ON CONFLICT (week, session_type, exercise_idx)
    DO UPDATE SET updated_at = now()
  `;
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
 * @param {number} dayIndex - Day index (0–6, Mon–Sun).
 * @param {string} distance - Distance run (stored as text).
 * @param {boolean} done - Whether the run is marked complete.
 */
export async function saveRunLog(week, dayIndex, distance, done) {
  await requireAuth();
  const weekNumber = parseInt(week, 10);
  const parsedDayIndex = parseInt(dayIndex, 10);
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > PROGRAM_WEEKS
  )
    return;
  if (!RUN_DAY_INDICES.has(parsedDayIndex)) return;
  await ensureRunSchema();
  await sql`
    INSERT INTO lift_run_log (week, day_idx, distance, done, updated_at)
    VALUES (${weekNumber}, ${parsedDayIndex}, ${String(
      distance
    )}, ${!!done}, now())
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
  for (const rawCell of cells) {
    const cell = normalizeCell(rawCell);
    if (!cell) continue;
    await sql`
      INSERT INTO lift_set_log
        (week, session_type, exercise_idx, set_idx, weight, reps, done, updated_at)
      VALUES
        (${cell.week}, ${cell.sessionType}, ${cell.exerciseIndex}, ${cell.setIndex},
         ${cell.weight}, ${cell.reps}, ${cell.done}, now())
      ON CONFLICT (week, session_type, exercise_idx, set_idx)
      DO UPDATE SET
        weight = EXCLUDED.weight,
        reps = EXCLUDED.reps,
        done = EXCLUDED.done,
        updated_at = now()
    `;
  }
}
