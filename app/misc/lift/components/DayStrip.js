import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import { WEEK, ABBR } from "../data";

/**
 * The horizontal Mon–Sun day picker. Highlights the selected day and marks
 * today with a dot on quiet (run/off) labels.
 * @param {{selectedDayIndex: number, todayDayIndex: number,
 *   onSelect: Function}} props
 * @return {React.ReactElement}
 */
export default function DayStrip({
  selectedDayIndex,
  todayDayIndex,
  onSelect,
}) {
  return (
    <div className={styles.dayStrip}>
      {WEEK.map((day, index) => {
        const active = index === selectedDayIndex;
        const isToday = index === todayDayIndex;
        const quiet = day.session === "run" || day.session === "off";
        return (
          <button
            key={index}
            className={`${styles.dayChip} ${
              active ? styles.dayChipActive : ""
            }`}
            onClick={() => onSelect(index)}
          >
            <span className={styles.dayName}>{day.day}</span>
            <span
              className={`${styles.dayLab} ${quiet ? styles.dayLabQuiet : ""}`}
            >
              {ABBR[day.session]}
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
  selectedDayIndex: PropTypes.number.isRequired,
  todayDayIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
};
