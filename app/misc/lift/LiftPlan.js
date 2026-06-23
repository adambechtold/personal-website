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
  const todayIdx = useMemo(() => todayIndex(), []);

  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
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
  const [celebrateSid, setCelebrateSid] = useState(null);
  const prevPctRef = useRef({});
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
    const iv = setInterval(tick, 1000);
    // Re-sync on resume so a slept or backgrounded tab shows the right time.
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const day = WEEK[selectedIdx];
  const sid = day.s;
  const isWorkout = sid !== "run" && sid !== "off";
  const sessEx = isWorkout
    ? [...SESSIONS[sid].ex, ...(SESSIONS[sid].appendix || [])]
    : [];

  /**
   * Selects a day in the strip and collapses any expanded exercise.
   * @param {number} i - The day index (0–6).
   */
  function selectDay(i) {
    setSelectedIdx(i);
    setExpanded(0);
  }

  /**
   * Toggles an exercise card open/closed; only one is open at a time.
   * @param {number} i - The exercise index.
   */
  function toggleExpand(i) {
    setExpanded((cur) => (cur === i ? null : i));
  }

  /**
   * @param {number} sec
   * @param {string} label
   */
  function startTimer(sec, label) {
    setTimer({
      endsAt: Date.now() + sec * 1000,
      total: sec,
      label,
      paused: false,
    });
  }

  /**
   * Applies set-cell updates for the current week + session to local state and
   * persists them to the database. Each update is { ex, set, cell }.
   * @param {Array} updates - The cells to write.
   */
  function commit(updates) {
    setLogs((prev) => {
      const next = structuredClone(prev);
      for (const u of updates) {
        next[week][sid][u.ex].sets[u.set] = { ...u.cell };
      }
      return next;
    });
    saveCells(
      updates.map((u) => ({
        week,
        session_type: sid,
        exercise_idx: u.ex,
        set_idx: u.set,
        weight: u.cell.weight,
        reps: u.cell.reps,
        done: u.cell.done,
      }))
    ).catch(() => {});
  }

  /**
   * Steps a set's reps by ±1, flooring at 0; an empty field seeds off lo.
   * @param {number} ex - The exercise index.
   * @param {number} set - The set index.
   * @param {number} delta - The step direction (+1 or -1).
   */
  function stepReps(ex, set, delta) {
    const cur0 = logs[week][sid][ex].sets[set];
    const lo = sessEx[ex].lo;
    let cur = parseFloat(cur0.reps);
    if (isNaN(cur)) cur = lo - delta;
    let nv = cur + delta;
    if (nv < 0) nv = 0;
    commit([
      { ex, set, cell: { ...cur0, reps: String(nv), isRolledForward: false } },
    ]);
  }

  /**
   * Writes a typed reps value (digits only) into a set.
   * @param {number} ex - The exercise index.
   * @param {number} set - The set index.
   * @param {string} value - The raw input value.
   */
  function inputReps(ex, set, value) {
    const v = value.replace(/[^0-9]/g, "");
    const cur0 = logs[week][sid][ex].sets[set];
    commit([{ ex, set, cell: { ...cur0, reps: v, isRolledForward: false } }]);
  }

  /**
   * Toggles a set's done flag; on first check auto-fills empty reps with lo
   * and (when enabled) starts the rest timer for the exercise's type.
   * @param {number} ex - The exercise index.
   * @param {number} set - The set index.
   */
  function toggleDone(ex, set) {
    const cur0 = logs[week][sid][ex].sets[set];
    const was = cur0.done;
    const cell = { ...cur0, done: !was, isRolledForward: false };
    if (!was && cell.reps === "") cell.reps = String(sessEx[ex].lo);
    commit([{ ex, set, cell }]);
    if (!was && CONFIG.autoTimer) {
      const type = sessEx[ex].t;
      const sec = type === "c" ? restCompound : restIso;
      startTimer(sec, type === "c" ? "Compound rest" : "Isolation rest");
    }
  }

  /**
   * Cascade rule: writes a weight to this set and every set below it in the
   * same exercise that isn't already done.
   * @param {number} ex - The exercise index.
   * @param {number} set - The starting set index.
   * @param {string} value - The weight value to write.
   */
  function applyWeight(ex, set, value) {
    const arr = logs[week][sid][ex].sets;
    const updates = [
      { ex, set, cell: { ...arr[set], weight: value, isRolledForward: false } },
    ];
    for (let j = set + 1; j < arr.length; j++) {
      if (!arr[j].done) {
        updates.push({
          ex,
          set: j,
          cell: { ...arr[j], weight: value, isRolledForward: false },
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
    setRunLogs((prev) => {
      const next = { ...prev };
      next[week] = { ...next[week], [selectedIdx]: { distance, done } };
      return next;
    });
    saveRunLog(week, selectedIdx, distance, done).catch(() => {});
  }

  /**
   * Sets or clears an exercise's display-name override for the current week and
   * session, persisting it. An empty name clears the override, reverting the
   * exercise to its canonical name.
   * @param {number} ex - The exercise index.
   * @param {string} name - The override name, or "" to clear it.
   */
  function renameExercise(ex, name) {
    setOverrides((prev) => {
      const next = structuredClone(prev);
      const bucket = next[week][sid];
      if (name.trim() === "") delete bucket[ex];
      else bucket[ex] = name;
      return next;
    });
    saveOverride(week, sid, ex, name).catch(() => {});
  }

  /**
   * Applies a unit-aware increment chip to the open weight editor.
   * @param {number} delta - The amount to add (may be negative).
   */
  function weightAdjust(delta) {
    if (!weightEditor) return;
    const cur =
      parseFloat(
        logs[week][sid][weightEditor.ex].sets[weightEditor.set].weight
      ) || 0;
    let nv = cur + delta;
    if (nv < 0) nv = 0;
    nv = Math.round(nv * 100) / 100;
    applyWeight(weightEditor.ex, weightEditor.set, String(nv));
  }

  /**
   * Applies a typed weight value (digits and decimal point) to the editor.
   * @param {string} value - The raw input value.
   */
  function weightType(value) {
    if (!weightEditor) return;
    const v = value.replace(/[^0-9.]/g, "");
    applyWeight(weightEditor.ex, weightEditor.set, v);
  }

  /** Pauses (freezing remaining) or resumes (re-anchoring endsAt) the timer. */
  function togglePause() {
    setTimer((t) => {
      if (!t) return t;
      if (t.paused) {
        return { ...t, paused: false, endsAt: Date.now() + t.remaining * 1000 };
      }
      const remaining = getRemainingTimerDurationSeconds(t, Date.now());
      return { ...t, paused: true, remaining };
    });
  }

  /** Adds 30 seconds to the timer, keeping the ring within full. */
  function addTime() {
    setTimer((t) => {
      if (!t) return t;
      const r = getRemainingTimerDurationSeconds(t, Date.now()) + 30;
      const total = Math.max(t.total, r);
      if (t.paused) return { ...t, remaining: r, total };
      return { ...t, endsAt: Date.now() + r * 1000, total };
    });
  }

  // ── Derived view data ──────────────────────────────────────────────
  const view = isWorkout
    ? deriveSessionView({
        sess: SESSIONS[sid],
        log: logs[week][sid],
        expanded,
        restCompound,
        restIso,
        overrides: overrides[week][sid],
      })
    : null;
  const { restTitle, restNote } = isWorkout
    ? { restTitle: "", restNote: "" }
    : restDayCopy(sid);
  const pct = view ? view.pct : 0;

  // Trigger celebration on the first render where pct reaches 100.
  useEffect(() => {
    if (!isWorkout) return;
    const key = `${week}-${sid}`;
    const previousCompletionPct = prevPctRef.current[key];
    if (
      pct === 100 &&
      previousCompletionPct !== undefined &&
      previousCompletionPct < 100 &&
      !celebratedRef.current.has(key)
    ) {
      celebratedRef.current.add(key);
      setCelebrateSid(sid);
    }
    prevPctRef.current[key] = pct;
  });

  const runEntry = runLogs[week]?.[selectedIdx] ?? {
    distance: "",
    done: false,
  };

  let weightLabel = "";
  let weightVal = "";
  if (weightEditor && isWorkout) {
    const override = overrides[week][sid][weightEditor.ex];
    const exName =
      override && override.trim() !== ""
        ? override.trim()
        : sessEx[weightEditor.ex].n;
    weightLabel = exName + " · Set " + (weightEditor.set + 1);
    weightVal = logs[week][sid][weightEditor.ex].sets[weightEditor.set].weight;
  }
  const incA = unit === "kg" ? [1.25, 2.5, 5, 10] : [2.5, 5, 10, 25];
  const decA = unit === "kg" ? [2.5, 5, 10] : [5, 10, 25];

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
                onClick={() => setWeek((w) => clampWeek(w - 1))}
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
                onClick={() => setWeek((w) => clampWeek(w + 1))}
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
          selectedIdx={selectedIdx}
          todayIdx={todayIdx}
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
                  style={{ width: pct + "%" }}
                />
              </div>
            </div>

            <div className={styles.exList}>
              {view.exercises.map((ex) => (
                <React.Fragment key={ex.idx}>
                  {ex.idx === view.appendixStart && (
                    <div className={styles.appendixDivider}>Abs</div>
                  )}
                  <ExerciseCard
                    ex={ex}
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
            sid={sid}
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
          value={weightVal}
          unit={unit}
          incA={incA}
          decA={decA}
          onAdjust={weightAdjust}
          onType={weightType}
          onClose={() => setWeightEditor(null)}
        />
      )}

      {/* Overlay 2 — session-complete celebration */}
      {celebrateSid && (
        <WorkoutCelebration
          sid={celebrateSid}
          onDone={() => setCelebrateSid(null)}
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
