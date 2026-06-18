"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./lift.module.css";
import { SESSIONS, WEEK, ABBR, NOTES, CONFIG } from "./data";

// Date.getDay() is 0=Sun..6=Sat; map to Mon=0..Sun=6 to index WEEK.
const DAY_MAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

// Program week 1 begins the Monday of the week of 2026-06-18 (Thu).
const PROGRAM_START = new Date(2026, 5, 15);
const PROGRAM_WEEKS = 6;

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
 * Builds the empty per-session log structure: for each session, an array of
 * exercises, each holding an array of { weight, reps, done } set cells.
 * @return {Object} The freshly-seeded logs keyed by session id.
 */
function buildLogs() {
  const o = {};
  for (const k of Object.keys(SESSIONS)) {
    o[k] = SESSIONS[k].ex.map((e) => ({
      sets: Array.from({ length: e.sets }, () => ({
        weight: "",
        reps: "",
        done: false,
      })),
    }));
  }
  return o;
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

/**
 * Summer Lifting Plan — a phone-first logger for a 4-day Upper/Lower block.
 * State is held in memory only; nothing persists across reloads.
 * @return {React.ReactElement} The rendered logger.
 */
export default function LiftPlan() {
  const todayIdx = useMemo(() => DAY_MAP[new Date().getDay()], []);

  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const [week, setWeek] = useState(currentWeek);
  const [expanded, setExpanded] = useState(0);
  const [logs, setLogs] = useState(buildLogs);
  const [timer, setTimer] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [weightEditor, setWeightEditor] = useState(null);

  const unit = CONFIG.weightUnit;
  const restCompound = CONFIG.restCompound;
  const restIso = CONFIG.restIso;

  // Tick the rest timer down once a second while running.
  useEffect(() => {
    const iv = setInterval(() => {
      setTimer((t) => {
        if (!t || t.paused || t.remaining <= 0) return t;
        return { ...t, remaining: t.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(iv);
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
   * Starts the rest timer.
   * @param {number} sec - Duration in seconds.
   * @param {string} label - The timer label.
   */
  function startTimer(sec, label) {
    setTimer({ remaining: sec, total: sec, label, paused: false });
  }

  /**
   * Steps a set's reps by ±1, flooring at 0; an empty field seeds off lo.
   * @param {number} ex - The exercise index.
   * @param {number} set - The set index.
   * @param {number} delta - The step direction (+1 or -1).
   */
  function stepReps(ex, set, delta) {
    setLogs((prev) => {
      const next = structuredClone(prev);
      const cell = next[sid][ex].sets[set];
      const lo = SESSIONS[sid].ex[ex].lo;
      let cur = parseFloat(cell.reps);
      if (isNaN(cur)) cur = lo - delta;
      let nv = cur + delta;
      if (nv < 0) nv = 0;
      cell.reps = String(nv);
      return next;
    });
  }

  /**
   * Writes a typed reps value (digits only) into a set.
   * @param {number} ex - The exercise index.
   * @param {number} set - The set index.
   * @param {string} value - The raw input value.
   */
  function inputReps(ex, set, value) {
    const v = value.replace(/[^0-9]/g, "");
    setLogs((prev) => {
      const next = structuredClone(prev);
      next[sid][ex].sets[set].reps = v;
      return next;
    });
  }

  /**
   * Toggles a set's done flag; on first check auto-fills empty reps with lo
   * and (when enabled) starts the rest timer for the exercise's type.
   * @param {number} ex - The exercise index.
   * @param {number} set - The set index.
   */
  function toggleDone(ex, set) {
    let started = null;
    setLogs((prev) => {
      const next = structuredClone(prev);
      const cell = next[sid][ex].sets[set];
      const was = cell.done;
      cell.done = !was;
      if (!was && cell.reps === "") cell.reps = String(SESSIONS[sid].ex[ex].lo);
      if (!was && CONFIG.autoTimer) {
        const type = SESSIONS[sid].ex[ex].t;
        started =
          type === "c"
            ? { sec: restCompound, label: "Compound rest" }
            : { sec: restIso, label: "Isolation rest" };
      }
      return next;
    });
    if (started) startTimer(started.sec, started.label);
  }

  /**
   * Cascade rule: writes a weight to this set and every set below it in the
   * same exercise that isn't already done.
   * @param {number} ex - The exercise index.
   * @param {number} set - The starting set index.
   * @param {string} value - The weight value to write.
   */
  function applyWeight(ex, set, value) {
    setLogs((prev) => {
      const next = structuredClone(prev);
      const arr = next[sid][ex].sets;
      arr[set].weight = value;
      for (let j = set + 1; j < arr.length; j++) {
        if (!arr[j].done) arr[j].weight = value;
      }
      return next;
    });
  }

  /**
   * Applies a unit-aware increment chip to the open weight editor.
   * @param {number} delta - The amount to add (may be negative).
   */
  function weightAdjust(delta) {
    if (!weightEditor) return;
    const cur =
      parseFloat(logs[sid][weightEditor.ex].sets[weightEditor.set].weight) || 0;
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

  /**
   * Pauses or resumes the running rest timer.
   */
  function togglePause() {
    setTimer((t) => (t ? { ...t, paused: !t.paused } : t));
  }

  /**
   * Adds 30 seconds to the rest timer, keeping the ring within full.
   */
  function addTime() {
    setTimer((t) => {
      if (!t) return t;
      const r = t.remaining + 30;
      return { ...t, remaining: r, total: Math.max(t.total, r), paused: false };
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
  let hasNext = false;
  let nextIdx = 0;
  let nextName = "";

  if (isWorkout) {
    const sess = SESSIONS[sid];
    const log = logs[sid];
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
    for (let k = 1; k <= 7; k++) {
      const j = (selectedIdx + k) % 7;
      if (WEEK[j].s !== "run" && WEEK[j].s !== "off") {
        hasNext = true;
        nextIdx = j;
        nextName = SESSIONS[WEEK[j].s].title + " · " + SESSIONS[WEEK[j].s].lean;
        break;
      }
    }
  }

  const C = 113.1;
  let timerOffset = 0;
  let timerTime = "";
  let timerLabel = "";
  if (timer) {
    const frac = timer.total ? timer.remaining / timer.total : 0;
    timerOffset = (C * (1 - frac)).toFixed(1);
    timerTime = fmt(timer.remaining);
    timerLabel = timer.remaining === 0 ? "Rest complete" : timer.label;
  }

  let weightLabel = "";
  let weightVal = "";
  if (weightEditor && isWorkout) {
    weightLabel =
      SESSIONS[sid].ex[weightEditor.ex].n + " · Set " + (weightEditor.set + 1);
    weightVal = logs[sid][weightEditor.ex].sets[weightEditor.set].weight;
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
                              className={styles.repsInput}
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
            {hasNext && (
              <button
                className={styles.nextCard}
                onClick={() => selectDay(nextIdx)}
              >
                <div>
                  <div className={styles.nextEyebrow}>Next session</div>
                  <div className={styles.nextName}>{nextName}</div>
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3c84f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            )}
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
