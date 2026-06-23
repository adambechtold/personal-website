"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./lift.module.css";
import Button from "../../components/ui/Button";
import { SESSIONS, WEEK, CONFIG } from "./data";
import { buildLogs, buildOverrides } from "./logs";
import { saveCells, saveRunLog, saveOverride } from "./actions";
import WorkoutCelebration from "./WorkoutCelebration";
import {
  TIMER_KEY,
  getRemainingTimerDurationSeconds,
  isValidTimer,
} from "./lib/timer";
import {
  buildRunLogs,
  clampWeek,
  currentWeek,
  todayIndex,
} from "./lib/schedule";
import { deriveSessionView, restDayCopy } from "./lib/sessionView";
import DayStrip from "./components/DayStrip";
import ExerciseCard from "./components/ExerciseCard";
import RestDayCard from "./components/RestDayCard";
import RestTimer from "./components/RestTimer";
import WeightEditor from "./components/WeightEditor";
import NotesSheet from "./components/NotesSheet";

/**
 * Summer Lifting Plan — a phone-first logger for a 4-day Upper/Lower block.
 * Logged sets persist to Postgres, scoped per week, so reloading resumes
 * where you left off. State and persistence live here; rendering is delegated
 * to the day strip, exercise cards, rest-day card, and the timer/editor/notes
 * overlays.
 * @param {{initialLogs: Array, initialRunLogs: Array,
 *   initialOverrides: Array}} props - Saved rows.
 * @return {React.ReactElement} The rendered logger.
 */
export default function LiftPlan({
  initialLogs,
  initialRunLogs,
  initialOverrides,
}) {
  const todayDayIndex = useMemo(() => todayIndex(), []);

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);
  const [week, setWeek] = useState(currentWeek);
  const [expanded, setExpanded] = useState(0);
  const [logs, setLogs] = useState(() => buildLogs(initialLogs));
  const [runLogs, setRunLogs] = useState(() => buildRunLogs(initialRunLogs));
  const [overrides, setOverrides] = useState(() =>
    buildOverrides(initialOverrides)
  );
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [notesOpen, setNotesOpen] = useState(false);
  const [weightEditor, setWeightEditor] = useState(null);
  const [celebrateSessionId, setCelebrateSessionId] = useState(null);
  const previousPercentRef = useRef({});
  const celebratedRef = useRef(new Set());

  const unit = CONFIG.weightUnit;
  const restCompound = CONFIG.restCompound;
  const restIso = CONFIG.restIso;

  useEffect(() => {
    let restored = null;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) restored = JSON.parse(raw);
    } catch {
      restored = null;
    }
    if (isValidTimer(restored)) {
      setTimer(restored);
    } else {
      try {
        localStorage.removeItem(TIMER_KEY);
      } catch {
        // storage unavailable (e.g. private mode)
      }
    }
  }, []);

  useEffect(() => {
    try {
      if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
      else localStorage.removeItem(TIMER_KEY);
    } catch {
      // storage unavailable (e.g. private mode)
    }
  }, [timer]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const intervalId = setInterval(tick, 1000);
    // Re-sync on resume so a slept or backgrounded tab shows the right time.
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const day = WEEK[selectedDayIndex];
  const sessionId = day.session;
  const isWorkout = sessionId !== "run" && sessionId !== "off";
  const sessionExercises = isWorkout
    ? [
        ...SESSIONS[sessionId].exercises,
        ...(SESSIONS[sessionId].appendix || []),
      ]
    : [];

  /**
   * Selects a day in the strip and collapses any expanded exercise.
   * @param {number} dayIndex - The day index (0–6).
   */
  function selectDay(dayIndex) {
    setSelectedDayIndex(dayIndex);
    setExpanded(0);
  }

  /**
   * Toggles an exercise card open/closed; only one is open at a time.
   * @param {number} exerciseIndex - The exercise index.
   */
  function toggleExpand(exerciseIndex) {
    setExpanded((current) =>
      current === exerciseIndex ? null : exerciseIndex
    );
  }

  /**
   * @param {number} seconds
   * @param {string} label
   */
  function startTimer(seconds, label) {
    setTimer({
      endsAt: Date.now() + seconds * 1000,
      total: seconds,
      label,
      paused: false,
    });
  }

  /**
   * Applies set-cell updates for the current week + session to local state and
   * persists them to the database. Each update is
   * { exerciseIndex, setIndex, cell }.
   * @param {Array} updates - The cells to write.
   */
  function commit(updates) {
    setLogs((previous) => {
      const next = structuredClone(previous);
      for (const update of updates) {
        next[week][sessionId][update.exerciseIndex].sets[update.setIndex] = {
          ...update.cell,
        };
      }
      return next;
    });
    saveCells(
      updates.map((update) => ({
        week,
        session_type: sessionId,
        exercise_idx: update.exerciseIndex,
        set_idx: update.setIndex,
        weight: update.cell.weight,
        reps: update.cell.reps,
        done: update.cell.done,
      }))
    ).catch(() => {});
  }

  /**
   * Steps a set's reps by ±1, flooring at 0; an empty field seeds off repLow.
   * @param {number} exerciseIndex - The exercise index.
   * @param {number} setIndex - The set index.
   * @param {number} delta - The step direction (+1 or -1).
   */
  function stepReps(exerciseIndex, setIndex, delta) {
    const currentSet = logs[week][sessionId][exerciseIndex].sets[setIndex];
    const repLow = sessionExercises[exerciseIndex].repLow;
    let currentReps = parseFloat(currentSet.reps);
    if (isNaN(currentReps)) currentReps = repLow - delta;
    let newReps = currentReps + delta;
    if (newReps < 0) newReps = 0;
    commit([
      {
        exerciseIndex,
        setIndex,
        cell: { ...currentSet, reps: String(newReps), isRolledForward: false },
      },
    ]);
  }

  /**
   * Writes a typed reps value (digits only) into a set.
   * @param {number} exerciseIndex - The exercise index.
   * @param {number} setIndex - The set index.
   * @param {string} value - The raw input value.
   */
  function inputReps(exerciseIndex, setIndex, value) {
    const sanitized = value.replace(/[^0-9]/g, "");
    const currentSet = logs[week][sessionId][exerciseIndex].sets[setIndex];
    commit([
      {
        exerciseIndex,
        setIndex,
        cell: { ...currentSet, reps: sanitized, isRolledForward: false },
      },
    ]);
  }

  /**
   * Toggles a set's done flag; on first check auto-fills empty reps with repLow
   * and (when enabled) starts the rest timer for the exercise's type.
   * @param {number} exerciseIndex - The exercise index.
   * @param {number} setIndex - The set index.
   */
  function toggleDone(exerciseIndex, setIndex) {
    const currentSet = logs[week][sessionId][exerciseIndex].sets[setIndex];
    const wasDone = currentSet.done;
    const cell = { ...currentSet, done: !wasDone, isRolledForward: false };
    if (!wasDone && cell.reps === "") {
      cell.reps = String(sessionExercises[exerciseIndex].repLow);
    }
    commit([{ exerciseIndex, setIndex, cell }]);
    if (!wasDone && CONFIG.autoTimer) {
      const type = sessionExercises[exerciseIndex].type;
      const seconds = type === "c" ? restCompound : restIso;
      startTimer(seconds, type === "c" ? "Compound rest" : "Isolation rest");
    }
  }

  /**
   * Cascade rule: writes a weight to this set and every set below it in the
   * same exercise that isn't already done.
   * @param {number} exerciseIndex - The exercise index.
   * @param {number} setIndex - The starting set index.
   * @param {string} value - The weight value to write.
   */
  function applyWeight(exerciseIndex, setIndex, value) {
    const sets = logs[week][sessionId][exerciseIndex].sets;
    const updates = [
      {
        exerciseIndex,
        setIndex,
        cell: { ...sets[setIndex], weight: value, isRolledForward: false },
      },
    ];
    for (
      let belowIndex = setIndex + 1;
      belowIndex < sets.length;
      belowIndex++
    ) {
      if (!sets[belowIndex].done) {
        updates.push({
          exerciseIndex,
          setIndex: belowIndex,
          cell: { ...sets[belowIndex], weight: value, isRolledForward: false },
        });
      }
    }
    commit(updates);
  }

  /**
   * Updates the run log for the current week and selected day and persists it.
   * @param {string} distance - The distance value.
   * @param {boolean} done - Whether the run is complete.
   */
  function commitRun(distance, done) {
    setRunLogs((previous) => {
      const next = { ...previous };
      next[week] = { ...next[week], [selectedDayIndex]: { distance, done } };
      return next;
    });
    saveRunLog(week, selectedDayIndex, distance, done).catch(() => {});
  }

  /**
   * Sets or clears an exercise's display-name override for the current week and
   * session, persisting it. An empty name clears the override, reverting the
   * exercise to its canonical name.
   * @param {number} exerciseIndex - The exercise index.
   * @param {string} name - The override name, or "" to clear it.
   */
  function renameExercise(exerciseIndex, name) {
    setOverrides((previous) => {
      const next = structuredClone(previous);
      const bucket = next[week][sessionId];
      if (name.trim() === "") delete bucket[exerciseIndex];
      else bucket[exerciseIndex] = name;
      return next;
    });
    saveOverride(week, sessionId, exerciseIndex, name).catch(() => {});
  }

  /**
   * Applies a unit-aware increment chip to the open weight editor.
   * @param {number} delta - The amount to add (may be negative).
   */
  function weightAdjust(delta) {
    if (!weightEditor) return;
    const currentWeight =
      parseFloat(
        logs[week][sessionId][weightEditor.exerciseIndex].sets[
          weightEditor.setIndex
        ].weight
      ) || 0;
    let newWeight = currentWeight + delta;
    if (newWeight < 0) newWeight = 0;
    newWeight = Math.round(newWeight * 100) / 100;
    applyWeight(
      weightEditor.exerciseIndex,
      weightEditor.setIndex,
      String(newWeight)
    );
  }

  /**
   * Applies a typed weight value (digits and decimal point) to the editor.
   * @param {string} value - The raw input value.
   */
  function weightType(value) {
    if (!weightEditor) return;
    const sanitized = value.replace(/[^0-9.]/g, "");
    applyWeight(weightEditor.exerciseIndex, weightEditor.setIndex, sanitized);
  }

  /** Pauses (freezing remaining) or resumes (re-anchoring endsAt) the timer. */
  function togglePause() {
    setTimer((current) => {
      if (!current) return current;
      if (current.paused) {
        return {
          ...current,
          paused: false,
          endsAt: Date.now() + current.remaining * 1000,
        };
      }
      const remaining = getRemainingTimerDurationSeconds(current, Date.now());
      return { ...current, paused: true, remaining };
    });
  }

  /** Adds 30 seconds to the timer, keeping the ring within full. */
  function addTime() {
    setTimer((current) => {
      if (!current) return current;
      const remaining =
        getRemainingTimerDurationSeconds(current, Date.now()) + 30;
      const total = Math.max(current.total, remaining);
      if (current.paused) return { ...current, remaining, total };
      return { ...current, endsAt: Date.now() + remaining * 1000, total };
    });
  }

  // ── Derived view data ──────────────────────────────────────────────
  const view = isWorkout
    ? deriveSessionView({
        session: SESSIONS[sessionId],
        log: logs[week][sessionId],
        expanded,
        restCompound,
        restIso,
        overrides: overrides[week][sessionId],
      })
    : null;
  const { restTitle, restNote } = isWorkout
    ? { restTitle: "", restNote: "" }
    : restDayCopy(sessionId);
  const percent = view ? view.percent : 0;

  // Trigger celebration on the first render where percent reaches 100.
  useEffect(() => {
    if (!isWorkout) return;
    const key = `${week}-${sessionId}`;
    const previousCompletionPercent = previousPercentRef.current[key];
    if (
      percent === 100 &&
      previousCompletionPercent !== undefined &&
      previousCompletionPercent < 100 &&
      !celebratedRef.current.has(key)
    ) {
      celebratedRef.current.add(key);
      setCelebrateSessionId(sessionId);
    }
    previousPercentRef.current[key] = percent;
  });

  const runEntry = runLogs[week]?.[selectedDayIndex] ?? {
    distance: "",
    done: false,
  };

  let weightLabel = "";
  let weightValue = "";
  if (weightEditor && isWorkout) {
    const override = overrides[week][sessionId][weightEditor.exerciseIndex];
    const exerciseName =
      override && override.trim() !== ""
        ? override.trim()
        : sessionExercises[weightEditor.exerciseIndex].name;
    weightLabel = exerciseName + " · Set " + (weightEditor.setIndex + 1);
    weightValue =
      logs[week][sessionId][weightEditor.exerciseIndex].sets[
        weightEditor.setIndex
      ].weight;
  }
  const weightIncrements =
    unit === "kg" ? [1.25, 2.5, 5, 10] : [2.5, 5, 10, 25];
  const weightDecrements = unit === "kg" ? [2.5, 5, 10] : [5, 10, 25];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header — eyebrow, week stepper, notes button */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Summer Block</div>
            <div className={styles.weekStepper}>
              <Button
                variant="outlined"
                className={styles.squareBtn}
                onClick={() => setWeek((current) => clampWeek(current - 1))}
                aria-label="Previous week"
              >
                ‹
              </Button>
              <div className={styles.weekStr}>
                Week {week} <span className={styles.weekOf}>of 6</span>
              </div>
              <Button
                variant="outlined"
                className={styles.squareBtn}
                onClick={() => setWeek((current) => clampWeek(current + 1))}
                aria-label="Next week"
              >
                ›
              </Button>
            </div>
          </div>
          <Button
            variant="outlined"
            className={styles.infoBtn}
            onClick={() => setNotesOpen(true)}
            aria-label="How to run it"
          >
            <span className={styles.infoBadge}>i</span>
          </Button>
        </div>

        {week === 6 && (
          <div className={styles.deload}>
            Deload week — run everything at about ⅔ the sets and let it all
            catch up.
          </div>
        )}

        <DayStrip
          selectedDayIndex={selectedDayIndex}
          todayDayIndex={todayDayIndex}
          onSelect={selectDay}
        />

        {/* State A — workout session */}
        {isWorkout && (
          <div>
            <div className={styles.sessionHeader}>
              <div className={styles.sessionTitleRow}>
                <h1 className={styles.sessionTitle}>{view.title}</h1>
                <span className={styles.sessionLean}>{view.lean}</span>
              </div>
              <div className={styles.sessionMeta}>{view.meta}</div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: percent + "%" }}
                />
              </div>
            </div>

            <div className={styles.exList}>
              {view.exercises.map((exercise) => (
                <React.Fragment key={exercise.index}>
                  {exercise.index === view.appendixStart && (
                    <div className={styles.appendixDivider}>Abs</div>
                  )}
                  <ExerciseCard
                    exercise={exercise}
                    unit={unit}
                    onToggleExpand={toggleExpand}
                    onOpenWeight={setWeightEditor}
                    onStepReps={stepReps}
                    onInputReps={inputReps}
                    onToggleDone={toggleDone}
                    onRenameExercise={renameExercise}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* State B — run / off day */}
        {!isWorkout && (
          <RestDayCard
            sessionId={sessionId}
            restTitle={restTitle}
            restNote={restNote}
            runEntry={runEntry}
            onCommitRun={commitRun}
          />
        )}
      </div>

      {/* Rest timer — sticky bottom bar */}
      {timer && (
        <RestTimer
          timer={timer}
          now={now}
          onTogglePause={togglePause}
          onAddTime={addTime}
          onDismiss={() => setTimer(null)}
        />
      )}

      {/* Overlay 1 — weight dialog */}
      {weightEditor && isWorkout && (
        <WeightEditor
          label={weightLabel}
          value={weightValue}
          unit={unit}
          weightIncrements={weightIncrements}
          weightDecrements={weightDecrements}
          onAdjust={weightAdjust}
          onType={weightType}
          onClose={() => setWeightEditor(null)}
        />
      )}

      {/* Overlay 2 — session-complete celebration */}
      {celebrateSessionId && (
        <WorkoutCelebration
          sessionId={celebrateSessionId}
          onDone={() => setCelebrateSessionId(null)}
        />
      )}

      {/* Overlay 3 — "How to run it" bottom sheet */}
      {notesOpen && <NotesSheet onClose={() => setNotesOpen(false)} />}
    </div>
  );
}

LiftPlan.propTypes = {
  initialLogs: PropTypes.array,
  initialRunLogs: PropTypes.array,
  initialOverrides: PropTypes.array,
};

LiftPlan.defaultProps = {
  initialLogs: [],
  initialRunLogs: [],
  initialOverrides: [],
};
