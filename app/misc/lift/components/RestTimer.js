import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Check from "./Check";
import {
  RING_CIRCUMFERENCE,
  fmt,
  getRemainingTimerDurationSeconds,
} from "../lib/timer";

/**
 * Sticky rest-timer bar with a countdown ring and pause / +30 / dismiss
 * controls. Derives its display from the timer + current wall clock.
 * @param {Object} props
 * @param {Object} props.timer - The active timer.
 * @param {number} props.now - Current time in ms.
 * @param {Function} props.onTogglePause - Pause/resume handler.
 * @param {Function} props.onAddTime - Add-30-seconds handler.
 * @param {Function} props.onDismiss - Dismiss handler.
 * @return {React.ReactElement}
 */
export default function RestTimer({
  timer,
  now,
  onTogglePause,
  onAddTime,
  onDismiss,
}) {
  const remaining = getRemainingTimerDurationSeconds(timer, now);
  const frac = timer.total ? remaining / timer.total : 0;
  const offset = (RING_CIRCUMFERENCE * (1 - frac)).toFixed(1);
  const label = remaining === 0 ? "Rest complete" : timer.label;

  return (
    <Card className={styles.timer}>
      <svg width="46" height="46" viewBox="0 0 46 46" className={styles.ring}>
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
          stroke="var(--accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="113.1"
          strokeDashoffset={offset}
          transform="rotate(-90 23 23)"
        />
      </svg>
      <div className={styles.timerInfo}>
        <div className={styles.timerLabel}>{label}</div>
        <div className={styles.timerTime}>{fmt(remaining)}</div>
      </div>
      <Button
        variant="outlined"
        className={styles.timerCtrl}
        onClick={onTogglePause}
        aria-label={timer.paused ? "Resume" : "Pause"}
      >
        {timer.paused ? "▶" : "❚❚"}
      </Button>
      <Button
        variant="outlined"
        className={styles.timerCtrl}
        onClick={onAddTime}
        aria-label="Add 30 seconds"
      >
        +30
      </Button>
      <button
        className={`${styles.doneBox} ${styles.doneBoxChecked}`}
        onClick={onDismiss}
        aria-label="Dismiss timer"
      >
        <Check size={16} stroke="#fff" />
      </button>
    </Card>
  );
}

RestTimer.propTypes = {
  timer: PropTypes.object.isRequired,
  now: PropTypes.number.isRequired,
  onTogglePause: PropTypes.func.isRequired,
  onAddTime: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};
