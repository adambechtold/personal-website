import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Card from "../../../components/ui/Card";
import Check from "./Check";

/**
 * The non-workout day view: a run or rest card. Run days also carry a small
 * logger for distance + done plus a route-planning link.
 * @param {Object} props
 * @param {string} props.sessionId - The session id ("run" or "off").
 * @param {string} props.restTitle - Card heading.
 * @param {string} props.restNote - Card body copy.
 * @param {{distance: string, done: boolean}} props.runEntry - Saved run entry.
 * @param {Function} props.onCommitRun - (distance, done) => void.
 * @return {React.ReactElement}
 */
export default function RestDayCard({
  sessionId,
  restTitle,
  restNote,
  runEntry,
  onCommitRun,
}) {
  return (
    <div className={styles.restWrap}>
      <Card
        className={`${styles.restCard} ${
          sessionId === "run" && runEntry.done ? styles.restCardDone : ""
        }`}
      >
        <div className={styles.restIcon}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--accent)" }}
          >
            <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
          </svg>
        </div>
        <h1 className={styles.restTitle}>{restTitle}</h1>
        <p className={styles.restNote}>{restNote}</p>

        {sessionId === "run" && (
          <div className={styles.runLogger}>
            <div className={styles.runLoggerRow}>
              <div className={styles.runDistanceField}>
                <input
                  className={styles.runDistanceInput}
                  value={runEntry.distance}
                  inputMode="decimal"
                  placeholder="0.0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const dotIndex = raw.indexOf(".");
                    const sanitized =
                      dotIndex === -1 ? raw : raw.slice(0, dotIndex + 3);
                    onCommitRun(sanitized, runEntry.done);
                  }}
                />
                <span className={styles.runDistanceUnit}>mi</span>
              </div>
              <button
                className={`${styles.runDoneBtn} ${
                  runEntry.done ? styles.runDoneBtnChecked : ""
                }`}
                onClick={() => onCommitRun(runEntry.distance, !runEntry.done)}
              >
                {runEntry.done && <Check size={14} stroke="currentColor" />}
                {runEntry.done ? "Done" : "Mark done"}
              </button>
            </div>
            <a
              href="https://onthegomap.com/#/create"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.runMapLink}
            >
              Plan your route
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}

RestDayCard.propTypes = {
  sessionId: PropTypes.string.isRequired,
  restTitle: PropTypes.string.isRequired,
  restNote: PropTypes.string.isRequired,
  runEntry: PropTypes.shape({
    distance: PropTypes.string,
    done: PropTypes.bool,
  }).isRequired,
  onCommitRun: PropTypes.func.isRequired,
};
