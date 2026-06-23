// Pure validation/normalization for a single logged set cell. Kept out of the
// "use server" actions file so it can be unit-tested without a DB or auth.

import { SESSIONS, PROGRAM_WEEKS } from "../data";

const VALID_SESSIONS = new Set(Object.keys(SESSIONS));

/**
 * Validates and normalizes one cell, or returns null if it's out of bounds.
 * The exercise index spans the main lifts followed by the appendix, matching
 * how the rest of the app indexes a session's exercises.
 * @param {Object} c - The raw cell descriptor.
 * @return {Object|null} The normalized cell, or null to skip it.
 */
export function normalizeCell(c) {
  const week = parseInt(c.week, 10);
  const sessionType = String(c.session_type);
  const exerciseIdx = parseInt(c.exercise_idx, 10);
  const setIdx = parseInt(c.set_idx, 10);
  if (!Number.isInteger(week) || week < 1 || week > PROGRAM_WEEKS) return null;
  if (!VALID_SESSIONS.has(sessionType)) return null;
  const sess = SESSIONS[sessionType];
  const allEx = [...sess.ex, ...(sess.appendix || [])];
  const exercise = allEx[exerciseIdx];
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
