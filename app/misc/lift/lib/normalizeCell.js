// Pure validation/normalization for a single logged set cell. Kept out of the
// "use server" actions file so it can be unit-tested without a DB or auth.

import { SESSIONS, PROGRAM_WEEKS } from "../data";

const VALID_SESSIONS = new Set(Object.keys(SESSIONS));

/**
 * Validates and normalizes one cell, or returns null if it's out of bounds.
 * The exercise index spans the main lifts followed by the appendix, matching
 * how the rest of the app indexes a session's exercises.
 * @param {Object} rawCell - The raw cell descriptor (DB-shaped, snake_case).
 * @return {Object|null} The normalized cell, or null to skip it.
 */
export function normalizeCell(rawCell) {
  const week = parseInt(rawCell.week, 10);
  const sessionType = String(rawCell.session_type);
  const exerciseIndex = parseInt(rawCell.exercise_idx, 10);
  const setIndex = parseInt(rawCell.set_idx, 10);
  if (!Number.isInteger(week) || week < 1 || week > PROGRAM_WEEKS) return null;
  if (!VALID_SESSIONS.has(sessionType)) return null;
  const session = SESSIONS[sessionType];
  const allExercises = [...session.exercises, ...(session.appendix || [])];
  const exercise = allExercises[exerciseIndex];
  if (!exercise) return null;
  if (
    !Number.isInteger(setIndex) ||
    setIndex < 0 ||
    setIndex >= exercise.sets
  ) {
    return null;
  }
  return {
    week,
    sessionType,
    exerciseIndex,
    setIndex,
    weight: rawCell.weight == null ? "" : String(rawCell.weight),
    reps: rawCell.reps == null ? "" : String(rawCell.reps),
    done: !!rawCell.done,
  };
}
