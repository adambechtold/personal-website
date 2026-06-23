import { SESSIONS, PROGRAM_WEEKS, WEEK } from "./data";

// Workout sessions in the order they fall within a week, taken from the weekly
// schedule (run/rest days are dropped). Used to walk slots chronologically so a
// suggestion can come from earlier the same week, not just the prior week.
const ORDERED_SESSION_IDS = WEEK.map((day) => day.s).filter(
  (sid) => SESSIONS[sid]
);

/**
 * @return {Object} A fresh, unlogged set cell.
 */
function createEmptySet() {
  return { weight: "", reps: "", done: false, isRolledForward: false };
}

/**
 * @return {Object} Empty logs keyed by week, then session id, each an array of
 *   exercises holding an array of set cells.
 */
function createEmptyLogs() {
  const logs = {};
  for (let week = 1; week <= PROGRAM_WEEKS; week++) {
    logs[week] = {};
    for (const sessionId of Object.keys(SESSIONS)) {
      logs[week][sessionId] = SESSIONS[sessionId].ex.map((exercise) => ({
        sets: Array.from({ length: exercise.sets }, createEmptySet),
      }));
    }
  }
  return logs;
}

/**
 * @param {Object} logs - The logs to mutate in place.
 * @param {Array} savedRows - Rows loaded from Postgres.
 */
function overlaySavedRows(logs, savedRows) {
  for (const row of savedRows) {
    const session = logs[row.week]?.[row.session_type];
    const set = session?.[row.exercise_idx]?.sets?.[row.set_idx];
    if (!set) continue;
    set.weight = row.weight ?? "";
    set.reps = row.reps ?? "";
    set.done = !!row.done;
  }
}

/**
 * @param {Object} set - A set cell.
 * @return {boolean} Whether the user entered a weight or reps for it.
 */
function hasLoggedValue(set) {
  return set.weight !== "" || set.reps !== "";
}

/**
 * @param {Object} set - A set cell.
 * @return {boolean} Whether the user has not interacted with it at all.
 */
function isUntouched(set) {
  return set.weight === "" && set.reps === "" && !set.done;
}

/**
 * The chronological list of workout slots across the whole block, ordered by
 * week and then by the session's position in the weekly schedule.
 * @return {Array<{week: number, sessionId: string}>} The ordered slots.
 */
function orderedSlots() {
  const slots = [];
  for (let week = 1; week <= PROGRAM_WEEKS; week++) {
    for (const sessionId of ORDERED_SESSION_IDS) {
      slots.push({ week, sessionId });
    }
  }
  return slots;
}

/**
 * Finds the value to roll forward into a set: the same set of the same exercise
 * the most recent earlier time it was performed — in any session, not just the
 * prior week of this one — that the user actually logged. Exercises are matched
 * by name, so a lift that appears on more than one day (e.g. Lateral Raise)
 * inherits from whichever day it was last done. Rolled-forward sets are skipped
 * so suggestions never chain off other suggestions.
 * @param {Object} logs - The logs structure.
 * @param {Array} slots - The chronological slot list from orderedSlots().
 * @param {number} slotPos - The index of the slot being filled within slots.
 * @param {string} exerciseName - The name of the exercise being filled.
 * @param {number} setIdx - The set index.
 * @return {Object|null} The source set, or null if it was never logged before.
 */
function findSetToRollForward(logs, slots, slotPos, exerciseName, setIdx) {
  for (let i = slotPos - 1; i >= 0; i--) {
    const { week, sessionId } = slots[i];
    const exerciseIdx = SESSIONS[sessionId].ex.findIndex(
      (e) => e.n === exerciseName
    );
    if (exerciseIdx === -1) continue;
    const set = logs[week][sessionId][exerciseIdx].sets[setIdx];
    if (set && !set.isRolledForward && hasLoggedValue(set)) return set;
  }
  return null;
}

/**
 * Pre-fills each untouched set with the weight and reps from the most recent
 * earlier time that exercise was logged, marking it rolled-forward. The
 * completion flag is never carried — each session starts unchecked.
 * @param {Object} logs - The logs to mutate in place.
 */
function rollSetsForward(logs) {
  const slots = orderedSlots();
  slots.forEach(({ week, sessionId }, slotPos) => {
    logs[week][sessionId].forEach((exercise, exerciseIdx) => {
      const exerciseName = SESSIONS[sessionId].ex[exerciseIdx].n;
      exercise.sets.forEach((set, setIdx) => {
        if (!isUntouched(set)) return;
        const source = findSetToRollForward(
          logs,
          slots,
          slotPos,
          exerciseName,
          setIdx
        );
        if (!source) return;
        set.weight = source.weight;
        set.reps = source.reps;
        set.isRolledForward = true;
      });
    });
  });
}

/**
 * Builds the in-memory logs: an empty structure, the saved rows overlaid, then
 * each untouched set rolled forward from the last time that exercise was logged.
 * @param {Array} [savedRows] - Rows loaded from Postgres.
 * @return {Object} The logs keyed by week and session id.
 */
export function buildLogs(savedRows = []) {
  const logs = createEmptyLogs();
  overlaySavedRows(logs, savedRows);
  rollSetsForward(logs);
  return logs;
}
