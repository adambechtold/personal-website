import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Card from "../../../components/ui/Card";
import Check from "./Check";

/**
 * A single collapsible exercise: header with progress, and (when open) the
 * editable set rows for weight, reps, and done.
 * @param {Object} props
 * @param {Object} props.ex - The exercise view model from deriveSessionView.
 * @param {string} props.unit - Weight unit label.
 * @param {Function} props.onToggleExpand - (idx) => void.
 * @param {Function} props.onOpenWeight - ({ex, set}) => void.
 * @param {Function} props.onStepReps - (ex, set, delta) => void.
 * @param {Function} props.onInputReps - (ex, set, value) => void.
 * @param {Function} props.onToggleDone - (ex, set) => void.
 * @param {Function} props.onRenameExercise - (idx, name) => void.
 * @return {React.ReactElement}
 */
export default function ExerciseCard({
  ex,
  unit,
  onToggleExpand,
  onOpenWeight,
  onStepReps,
  onInputReps,
  onToggleDone,
  onRenameExercise,
}) {
  return (
    <Card className={styles.exCard}>
      <button
        className={styles.exHeader}
        onClick={() => onToggleExpand(ex.idx)}
      >
        <div
          className={`${styles.exBadge} ${
            ex.complete ? styles.exBadgeDone : ""
          }`}
        >
          {ex.complete ? <Check size={16} stroke="#fff" /> : ex.idx + 1}
        </div>
        <div className={styles.exInfo}>
          <div className={styles.exName}>
            {ex.name}
            {ex.sub && <span className={styles.exSub}> {ex.sub}</span>}
          </div>
          {ex.originalName && (
            <div className={styles.exOriginal}>{ex.originalName}</div>
          )}
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
            stroke="#aaa"
            strokeWidth="2.4"
            strokeLinecap="round"
            className={styles.chev}
            style={{
              transform: ex.open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {ex.open && (
        <div className={styles.exBody}>
          <div className={styles.nameEditRow}>
            <span className={styles.nameEditLabel}>Name</span>
            <input
              className={styles.nameEditInput}
              value={ex.override}
              placeholder={ex.baseName}
              aria-label="Override exercise name"
              onChange={(e) => onRenameExercise(ex.idx, e.target.value)}
            />
            {ex.override.trim() !== "" && (
              <button
                type="button"
                className={styles.nameClearBtn}
                onClick={() => onRenameExercise(ex.idx, "")}
                aria-label="Clear name override"
              >
                Reset
              </button>
            )}
          </div>
          <div className={styles.setColHead}>
            <span className={styles.colSet}>Set</span>
            <span className={styles.colWeight}>Weight · {unit}</span>
            <span className={styles.colReps}>Reps</span>
            <span className={styles.colDone}>Done</span>
          </div>
          {ex.sets.map((s, j) => (
            <div
              key={j}
              className={`${styles.setRow} ${s.done ? styles.setRowDone : ""}`}
            >
              <div className={styles.colSet}>{j + 1}</div>
              <button
                className={styles.weightField}
                onClick={() => onOpenWeight({ ex: ex.idx, set: j })}
              >
                <span
                  className={`${styles.weightVal} ${
                    s.weight === "" ? styles.weightEmpty : ""
                  } ${s.isRolledForward ? styles.rolledForward : ""}`}
                >
                  {s.weight === "" ? "—" : s.weight}
                </span>
                <span className={styles.weightUnit}>{unit}</span>
              </button>
              <div className={styles.repsField}>
                <button
                  className={styles.repsBtn}
                  onClick={() => onStepReps(ex.idx, j, -1)}
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
                  onChange={(e) => onInputReps(ex.idx, j, e.target.value)}
                />
                <button
                  className={styles.repsBtn}
                  onClick={() => onStepReps(ex.idx, j, 1)}
                  aria-label="Increase reps"
                >
                  +
                </button>
              </div>
              <button
                className={`${styles.doneBox} ${
                  s.done ? styles.doneBoxChecked : ""
                }`}
                onClick={() => onToggleDone(ex.idx, j)}
                aria-label="Toggle set done"
              >
                {s.done && <Check size={16} stroke="#fff" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

ExerciseCard.propTypes = {
  ex: PropTypes.object.isRequired,
  unit: PropTypes.string.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  onOpenWeight: PropTypes.func.isRequired,
  onStepReps: PropTypes.func.isRequired,
  onInputReps: PropTypes.func.isRequired,
  onToggleDone: PropTypes.func.isRequired,
  onRenameExercise: PropTypes.func.isRequired,
};
