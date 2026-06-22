// Pure view-model builders. Given the saved log and program config, they shape
// the data the workout and rest-day views render — no React, no state.

/**
 * Builds the per-exercise view rows plus session summary for a workout day.
 * @param {Object} args
 * @param {Object} args.sess - The session definition from SESSIONS.
 * @param {Array} args.log - Saved sets for the session, indexed by exercise.
 * @param {number|null} args.expanded - Index of the open exercise, if any.
 * @param {number} args.restCompound - Compound rest seconds (for time estimate).
 * @param {number} args.restIso - Isolation rest seconds (for time estimate).
 * @return {{exercises: Array, title: string, lean: string, meta: string,
 *   pct: number}} The workout view model.
 */
export function deriveSessionView({
  sess,
  log,
  expanded,
  restCompound,
  restIso,
}) {
  let totalSets = 0;
  let doneSets = 0;
  let estSec = 0;
  const exercises = sess.ex.map((e, i) => {
    const dc = log[i].sets.filter((s) => s.done).length;
    totalSets += e.sets;
    doneSets += dc;
    estSec += e.sets * (40 + (e.t === "c" ? restCompound : restIso));
    const complete = dc === e.sets;
    return {
      idx: i,
      name: e.n,
      sub: e.sub,
      target: e.sets + " × " + e.lo + "–" + e.hi,
      rest: e.t === "c" ? "2–3 min" : "60–90 sec",
      open: expanded === i,
      progress: dc + "/" + e.sets,
      complete,
      ph: e.lo + "–" + e.hi,
      sets: log[i].sets,
    };
  });
  const estMin = Math.max(5, Math.round(estSec / 60 / 5) * 5);
  return {
    exercises,
    title: sess.title,
    lean: sess.lean,
    meta:
      sess.ex.length + " lifts · " + totalSets + " sets · ~" + estMin + " min",
    pct: totalSets ? Math.round((doneSets / totalSets) * 100) : 0,
  };
}

/**
 * The heading and note for a non-workout day.
 * @param {string} sid - The session id ("run" or "off").
 * @return {{restTitle: string, restNote: string}} The rest-day copy.
 */
export function restDayCopy(sid) {
  if (sid === "run") {
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
