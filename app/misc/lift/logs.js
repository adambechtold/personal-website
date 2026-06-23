import { SESSIONS, PROGRAM_WEEKS } from "./data";

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
      const session = SESSIONS[sessionId];
      const allExercises = [...session.exercises, ...(session.appendix || [])];
      logs[week][sessionId] = allExercises.map((exercise) => ({
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
 * Finds the value to roll forward into a set: the same set in the most recent
 * earlier week the user actually logged. Rolled-forward sets are skipped so
 * suggestions never chain off other suggestions.
 * @param {Object} logs - The logs structure.
 * @param {number} week - The week being filled.
 * @param {string} sessionId - The session id.
 * @param {number} exerciseIndex - The exercise index.
 * @param {number} setIndex - The set index.
 * @return {Object|null} The source set, or null if no earlier week logged it.
 */
function findSetToRollForward(logs, week, sessionId, exerciseIndex, setIndex) {
  for (let priorWeek = week - 1; priorWeek >= 1; priorWeek--) {
    const set = logs[priorWeek][sessionId][exerciseIndex].sets[setIndex];
    if (!set.isRolledForward && hasLoggedValue(set)) return set;
  }
  return null;
}

/**
 * Pre-fills each untouched set with the weight and reps from the most recent
 * earlier week that logged it, marking it rolled-forward. The completion flag
 * is never carried — each week starts unchecked.
 * @param {Object} logs - The logs to mutate in place.
 */
function rollSetsForward(logs) {
  for (let week = 2; week <= PROGRAM_WEEKS; week++) {
    for (const sessionId of Object.keys(SESSIONS)) {
      logs[week][sessionId].forEach((exercise, exerciseIndex) => {
        exercise.sets.forEach((set, setIndex) => {
          if (!isUntouched(set)) return;
          const source = findSetToRollForward(
            logs,
            week,
            sessionId,
            exerciseIndex,
            setIndex
          );
          if (!source) return;
          set.weight = source.weight;
          set.reps = source.reps;
          set.isRolledForward = true;
        });
      });
    }
  }
}

/**
 * Builds the in-memory logs: an empty structure, the saved rows overlaid, then
 * each week's untouched sets rolled forward from the last week that logged them.
 * @param {Array} [savedRows] - Rows loaded from Postgres.
 * @return {Object} The logs keyed by week and session id.
 */
export function buildLogs(savedRows = []) {
  const logs = createEmptyLogs();
  overlaySavedRows(logs, savedRows);
  rollSetsForward(logs);
  return logs;
}

/**
 * Builds the in-memory exercise-name overrides: a structure keyed by week, then
 * session id, then exercise index, holding the override name. Exercises without
 * an override are simply absent, so a lookup falls back to the canonical name.
 * @param {Array} [savedRows] - Override rows loaded from Postgres.
 * @return {Object} The overrides keyed by week and session id.
 */
export function buildOverrides(savedRows = []) {
  const overrides = {};
  for (let week = 1; week <= PROGRAM_WEEKS; week++) {
    overrides[week] = {};
    for (const sessionId of Object.keys(SESSIONS)) {
      overrides[week][sessionId] = {};
    }
  }
  for (const row of savedRows) {
    const bucket = overrides[row.week]?.[row.session_type];
    if (!bucket) continue;
    const name = row.name == null ? "" : String(row.name);
    if (name.trim() === "") continue;
    bucket[row.exercise_idx] = name;
  }
  return overrides;
}
