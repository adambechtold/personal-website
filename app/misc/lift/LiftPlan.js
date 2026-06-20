"use client";

import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styles from "./lift.module.css";
import { SESSIONS, WEEK, ABBR, NOTES, CONFIG, PROGRAM_WEEKS } from "./data";
import { buildLogs } from "./logs";
import { saveCells } from "./actions";

// Date.getDay() is 0=Sun..6=Sat; map to Mon=0..Sun=6 to index WEEK.
const DAY_MAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

// Program week 1 begins the Monday of the week of 2026-06-18 (Thu).
const PROGRAM_START = new Date(2026, 5, 15);

/**
 * Derives the current program week (1–PROGRAM_WEEKS) from today's date,
 * clamped to the block's bounds.
 * @return {number} The current week number.
 */
function currentWeek() {
  const ms = Date.now() - PROGRAM_START.getTime();
  const w = Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(PROGRAM_WEEKS, Math.max(1, w));
}

/**
 * Formats a second count as M:SS.
 * @param {number} s - Seconds remaining.
 * @return {string} The formatted time.
 */
function fmt(s) {
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
}

// localStorage key for the active rest timer (survives reloads / tab discards).
const TIMER_KEY = "lift-timer";

/**
 * @param {Object|null} timer - Running timers carry endsAt; paused ones carry
 *   remaining, so the value is correct across sleep, throttling, and reloads.
 * @param {number} now - Wall-clock time in ms.
 * @return {number} Whole seconds left, floored at 0.
 */
function getRemainingTimerDurationSeconds(timer, now) {
  if (!timer) return 0;
  if (timer.paused) return Math.max(0, timer.remaining);
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

/**
 * @param {*} timer - A timer restored from storage.
 * @return {boolean} Whether it is well-formed enough to resume.
 */
function isValidTimer(timer) {
  if (!timer || typeof timer !== "object") return false;
  if (!Number.isFinite(timer.total)) return false;
  if (typeof timer.label !== "string") return false;
  if (typeof timer.paused !== "boolean") return false;
  return Number.isFinite(timer.paused ? timer.remaining : timer.endsAt);
}

/**
 * Summer Lifting Plan — a phone-first logger for a 4-day Upper/Lower block.
 * Logged sets persist to Postgres, scoped per week, so reloading resumes
 * where you left off.
 * @param {{initialLogs: Array}} props - Saved set rows from the database.
 * @return {React.ReactElement} The rendered logger.
 */
export default function LiftPlan({ initialLogs }) {
  const todayIdx = useMemo(() => DAY_MAP[new Date().getDay()], []);

  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const [week, setWeek] = useState(currentWeek);
  const [expanded, setExpanded] = useState(0);
  const [logs, setLogs] = useState(() => buildLogs(initialLogs));
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [notesOpen, setNotesOpen] = useState(false);
  const [weightEditor, setWeightEditor] = useState(null);

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
    const lo = SESSIONS[sid].ex[ex].lo;
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
    if (!was && cell.reps === "") cell.reps = String(SESSIONS[sid].ex[ex].lo);
    commit([{ ex, set, cell }]);
    if (!was && CONFIG.autoTimer) {
      const type = SESSIONS[sid].ex[ex].t;
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
  const clamp = (w) => Math.min(PROGRAM_WEEKS, Math.max(1, w));

  let title = "";
  let lean = "";
  let meta = "";
  let exercises = [];
  let pct = 0;
  let restTitle = "";
  let restNote = "";

  if (isWorkout) {
    const sess = SESSIONS[sid];
    const log = logs[week][sid];
    let totalSets = 0;
    let doneSets = 0;
    let estSec = 0;
    exercises = sess.ex.map((e, i) => {
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
    title = sess.title;
    lean = sess.lean;
    const estMin = Math.max(5, Math.round(estSec / 60 / 5) * 5);
    meta =
      sess.ex.length + " lifts · " + totalSets + " sets · ~" + estMin + " min";
    pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
  } else {
    if (sid === "run") {
      restTitle = "Run / Off";
      restNote =
        "Easy aerobic miles, or take the day fully off. If you run the morning before a lower day, keep it easy — legs come first.";
    } else {
      restTitle = "Rest Day";
      restNote =
        "Full rest. The work you put in this week turns into muscle now. Eat, sleep, repeat.";
    }
  }

  const C = 113.1;
  let timerOffset = 0;
  let timerTime = "";
  let timerLabel = "";
  if (timer) {
    const remaining = getRemainingTimerDurationSeconds(timer, now);
    const frac = timer.total ? remaining / timer.total : 0;
    timerOffset = (C * (1 - frac)).toFixed(1);
    timerTime = fmt(remaining);
    timerLabel = remaining === 0 ? "Rest complete" : timer.label;
  }

  let weightLabel = "";
  let weightVal = "";
  if (weightEditor && isWorkout) {
    weightLabel =
      SESSIONS[sid].ex[weightEditor.ex].n + " · Set " + (weightEditor.set + 1);
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
              <button
                className={styles.squareBtn}
                onClick={() => setWeek((w) => clamp(w - 1))}
                aria-label="Previous week"
              >
                ‹
              </button>
              <div className={styles.weekStr}>
                Week {week} <span className={styles.weekOf}>of 6</span>
              </div>
              <button
                className={styles.squareBtn}
                onClick={() => setWeek((w) => clamp(w + 1))}
                aria-label="Next week"
              >
                ›
              </button>
            </div>
          </div>
          <button
            className={styles.infoBtn}
            onClick={() => setNotesOpen(true)}
            aria-label="How to run it"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5" />
              <path d="M12 7.4v.01" />
            </svg>
          </button>
        </div>

        {week === 6 && (
          <div className={styles.deload}>
            Deload week — run everything at about ⅔ the sets and let it all
            catch up.
          </div>
        )}

        {/* Day strip */}
        <div className={styles.dayStrip}>
          {WEEK.map((w, i) => {
            const active = i === selectedIdx;
            const isToday = i === todayIdx;
            const quiet = w.s === "run" || w.s === "off";
            return (
              <button
                key={i}
                className={`${styles.dayChip} ${
                  active ? styles.dayChipActive : ""
                }`}
                onClick={() => selectDay(i)}
              >
                <span className={styles.dayName}>{w.d}</span>
                <span
                  className={`${styles.dayLab} ${
                    quiet ? styles.dayLabQuiet : ""
                  }`}
                >
                  {ABBR[w.s]}
                </span>
                <span
                  className={`${styles.dayDot} ${
                    isToday && !active ? styles.dayDotToday : ""
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* State A — workout session */}
        {isWorkout && (
          <div>
            <div className={styles.sessionHeader}>
              <div className={styles.sessionTitleRow}>
                <h1 className={styles.sessionTitle}>{title}</h1>
                <span className={styles.sessionLean}>{lean}</span>
              </div>
              <div className={styles.sessionMeta}>{meta}</div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: pct + "%" }}
                />
              </div>
            </div>

            <div className={styles.exList}>
              {exercises.map((ex) => (
                <div key={ex.idx} className={styles.exCard}>
                  <button
                    className={styles.exHeader}
                    onClick={() => toggleExpand(ex.idx)}
                  >
                    <div
                      className={`${styles.exBadge} ${
                        ex.complete ? styles.exBadgeDone : ""
                      }`}
                    >
                      {ex.complete ? "✓" : ex.idx + 1}
                    </div>
                    <div className={styles.exInfo}>
                      <div className={styles.exName}>
                        {ex.name}
                        {ex.sub && (
                          <span className={styles.exSub}> {ex.sub}</span>
                        )}
                      </div>
                      <div className={styles.exTarget}>
                        {ex.target} · rest {ex.rest}
                      </div>
                    </div>
                    <div className={styles.exRight}>
                      <span
                        className={`${styles.exProgress} ${
                          ex.complete ? styles.exProgressDone : ""
                        }`}
                      >
                        {ex.progress}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#aeb6c2"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        className={styles.chev}
                        style={{
                          transform: ex.open
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </button>

                  {ex.open && (
                    <div className={styles.exBody}>
                      <div className={styles.setColHead}>
                        <span className={styles.colSet}>Set</span>
                        <span className={styles.colWeight}>
                          Weight · {unit}
                        </span>
                        <span className={styles.colReps}>Reps</span>
                        <span className={styles.colDone}>Done</span>
                      </div>
                      {ex.sets.map((s, j) => (
                        <div
                          key={j}
                          className={`${styles.setRow} ${
                            s.done ? styles.setRowDone : ""
                          }`}
                        >
                          <div className={styles.colSet}>{j + 1}</div>
                          <button
                            className={styles.weightField}
                            onClick={() =>
                              setWeightEditor({ ex: ex.idx, set: j })
                            }
                          >
                            <span
                              className={`${styles.weightVal} ${
                                s.weight === "" ? styles.weightEmpty : ""
                              } ${
                                s.isRolledForward ? styles.rolledForward : ""
                              }`}
                            >
                              {s.weight === "" ? "—" : s.weight}
                            </span>
                            <span className={styles.weightUnit}>{unit}</span>
                          </button>
                          <div className={styles.repsField}>
                            <button
                              className={styles.repsBtn}
                              onClick={() => stepReps(ex.idx, j, -1)}
                              aria-label="Decrease reps"
                            >
                              −
                            </button>
                            <input
                              className={`${styles.repsInput} ${
                                s.isRolledForward ? styles.rolledForward : ""
                              }`}
                              value={s.reps}
                              inputMode="numeric"
                              placeholder={ex.ph}
                              onChange={(e) =>
                                inputReps(ex.idx, j, e.target.value)
                              }
                            />
                            <button
                              className={styles.repsBtn}
                              onClick={() => stepReps(ex.idx, j, 1)}
                              aria-label="Increase reps"
                            >
                              +
                            </button>
                          </div>
                          <button
                            className={`${styles.doneBox} ${
                              s.done ? styles.doneBoxChecked : ""
                            }`}
                            onClick={() => toggleDone(ex.idx, j)}
                            aria-label="Toggle set done"
                          >
                            {s.done && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 12l5 5L20 6" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State B — run / off day */}
        {!isWorkout && (
          <div className={styles.restWrap}>
            <div className={styles.restCard}>
              <div className={styles.restIcon}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3c84f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
              </div>
              <h1 className={styles.restTitle}>{restTitle}</h1>
              <p className={styles.restNote}>{restNote}</p>
            </div>
          </div>
        )}
      </div>

      {/* Rest timer — sticky bottom bar */}
      {timer && (
        <div className={styles.timer}>
          <svg
            width="46"
            height="46"
            viewBox="0 0 46 46"
            className={styles.ring}
          >
            <circle
              cx="23"
              cy="23"
              r="18"
              fill="none"
              stroke="#e9edf3"
              strokeWidth="3.5"
            />
            <circle
              cx="23"
              cy="23"
              r="18"
              fill="none"
              stroke="#3c84f7"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="113.1"
              strokeDashoffset={timerOffset}
              transform="rotate(-90 23 23)"
            />
          </svg>
          <div className={styles.timerInfo}>
            <div className={styles.timerLabel}>{timerLabel}</div>
            <div className={styles.timerTime}>{timerTime}</div>
          </div>
          <button
            className={styles.timerCtrl}
            onClick={togglePause}
            aria-label={timer.paused ? "Resume" : "Pause"}
          >
            {timer.paused ? "▶" : "❚❚"}
          </button>
          <button
            className={styles.timerCtrl}
            onClick={addTime}
            aria-label="Add 30 seconds"
          >
            +30
          </button>
          <button
            className={styles.timerDismiss}
            onClick={() => setTimer(null)}
            aria-label="Dismiss timer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l5 5L20 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Overlay 1 — weight dialog */}
      {weightEditor && isWorkout && (
        <div className={styles.modalWrap}>
          <div className={styles.scrim} onClick={() => setWeightEditor(null)} />
          <div className={styles.weightDialog}>
            <div className={styles.weightEyebrow}>{weightLabel}</div>
            <div className={styles.weightBigRow}>
              <input
                className={styles.weightBig}
                value={weightVal}
                inputMode="decimal"
                placeholder="0"
                onChange={(e) => weightType(e.target.value)}
              />
              <span className={styles.weightBigUnit}>{unit}</span>
            </div>
            <div className={styles.chipRow}>
              {decA.map((v) => (
                <button
                  key={v}
                  className={styles.chipMinus}
                  onClick={() => weightAdjust(-v)}
                >
                  −{v}
                </button>
              ))}
            </div>
            <div className={styles.chipRow}>
              {incA.map((v) => (
                <button
                  key={v}
                  className={styles.chipPlus}
                  onClick={() => weightAdjust(v)}
                >
                  +{v}
                </button>
              ))}
            </div>
            <div className={styles.weightHelp}>
              Applies here and to the sets below that aren’t done yet.
            </div>
            <button
              className={styles.weightDone}
              onClick={() => setWeightEditor(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Overlay 2 — "How to run it" bottom sheet */}
      {notesOpen && (
        <div className={styles.sheetWrap}>
          <div className={styles.scrim} onClick={() => setNotesOpen(false)} />
          <div className={styles.sheet}>
            <div className={styles.grabWrap}>
              <div className={styles.grab} />
            </div>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>How to run it</h2>
              <button
                className={styles.sheetClose}
                onClick={() => setNotesOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {NOTES.map((note) => (
              <div key={note.h} className={styles.note}>
                <div className={styles.noteHead}>{note.h}</div>
                <div className={styles.noteBody}>{note.t}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

LiftPlan.propTypes = {
  initialLogs: PropTypes.array,
};

LiftPlan.defaultProps = {
  initialLogs: [],
};
