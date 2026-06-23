// Pure view-model builders. Given the saved log and program config, they shape
// the data the workout and rest-day views render — no React, no state.

/**
 * Builds the per-exercise view rows plus session summary for a workout day.
 * @param {Object} args
 * @param {Object} args.session - The session definition from SESSIONS.
 * @param {Array} args.log - Saved sets for the session, indexed by exercise.
 * @param {number|null} args.expanded - Index of the open exercise, if any.
 * @param {number} args.restCompound - Compound rest seconds (for time estimate).
 * @param {number} args.restIso - Isolation rest seconds (for time estimate).
 * @param {Object} [args.overrides] - Map of exercise index to override name.
 * @return {{exercises: Array, title: string, lean: string, meta: string,
 *   percent: number}} The workout view model.
 */
export function deriveSessionView({
  session,
  log,
  expanded,
  restCompound,
  restIso,
  overrides = {},
}) {
  const mainExerciseCount = session.exercises.length;
  const allExercises = [...session.exercises, ...(session.appendix || [])];
  let totalSets = 0;
  let doneSets = 0;
  let estimatedSeconds = 0;
  const exercises = allExercises.map((exercise, index) => {
    const doneSetCount = log[index].sets.filter((set) => set.done).length;
    totalSets += exercise.sets;
    doneSets += doneSetCount;
    estimatedSeconds +=
      exercise.sets * (40 + (exercise.type === "c" ? restCompound : restIso));
    const complete = doneSetCount === exercise.sets;
    const override = overrides[index] ?? "";
    const hasOverride = override.trim() !== "";
    return {
      index,
      name: hasOverride ? override : exercise.name,
      baseName: exercise.name,
      override,
      originalName: hasOverride ? exercise.name : null,
      subLabel: exercise.subLabel,
      target: exercise.sets + " × " + exercise.repLow + "–" + exercise.repHigh,
      rest: exercise.type === "c" ? "2–3 min" : "60–90 sec",
      open: expanded === index,
      progress: doneSetCount + "/" + exercise.sets,
      complete,
      placeholder: exercise.repLow + "–" + exercise.repHigh,
      sets: log[index].sets,
      isAppendix: index >= mainExerciseCount,
    };
  });
  const estimatedMinutes = Math.max(
    5,
    Math.round(estimatedSeconds / 60 / 5) * 5
  );
  return {
    exercises,
    title: session.title,
    lean: session.lean,
    meta:
      session.exercises.length +
      " lifts · " +
      totalSets +
      " sets · ~" +
      estimatedMinutes +
      " min",
    percent: totalSets ? Math.round((doneSets / totalSets) * 100) : 0,
    appendixStart: session.appendix?.length ? mainExerciseCount : null,
  };
}

/**
 * The heading and note for a non-workout day.
 * @param {string} sessionId - The session id ("run" or "off").
 * @return {{restTitle: string, restNote: string}} The rest-day copy.
 */
export function restDayCopy(sessionId) {
  if (sessionId === "run") {
    return {
      restTitle: "Run",
      restNote:
        "Easy aerobic miles. If you run the morning before a lower day, keep it easy — legs come first.",
    };
  }
  return {
    restTitle: "Rest Day",
    restNote:
      "Full rest. The work you put in this week turns into muscle now. Eat, sleep, repeat.",
  };
}
