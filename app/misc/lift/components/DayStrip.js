import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import { WEEK, ABBR } from "../data";

/**
 * The horizontal Mon–Sun day picker. Highlights the selected day and marks
 * today with a dot on quiet (run/off) labels.
 * @param {{selectedIdx: number, todayIdx: number, onSelect: Function}} props
 * @return {React.ReactElement}
 */
export default function DayStrip({ selectedIdx, todayIdx, onSelect }) {
  return (
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
            onClick={() => onSelect(i)}
          >
            <span className={styles.dayName}>{w.d}</span>
            <span
              className={`${styles.dayLab} ${quiet ? styles.dayLabQuiet : ""}`}
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
  );
}

DayStrip.propTypes = {
  selectedIdx: PropTypes.number.isRequired,
  todayIdx: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
};
