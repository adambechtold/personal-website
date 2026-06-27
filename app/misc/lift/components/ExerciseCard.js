import React, { useState } from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Card from "../../../components/ui/Card";
import Check from "./Check";

/**
 * A single collapsible exercise: header with progress, and (when open) the
 * editable set rows for weight, reps, and done. The name can be renamed via the
 * pencil button, which reveals a confirm-or-cancel input next to it.
 * @param {Object} props
 * @param {Object} props.exercise - The exercise view model from
 *   deriveSessionView.
 * @param {string} props.unit - Weight unit label.
 * @param {Function} props.onToggleExpand - (exerciseIndex) => void.
 * @param {Function} props.onOpenWeight - ({exerciseIndex, setIndex}) => void.
 * @param {Function} props.onStepReps - (exerciseIndex, setIndex, delta) => void.
 * @param {Function} props.onInputReps - (exerciseIndex, setIndex, value) => void.
 * @param {Function} props.onToggleDone - (exerciseIndex, setIndex) => void.
 * @param {Function} props.onRenameExercise - (exerciseIndex, name) => void.
 * @param {Function} props.onToggleSkip - (exerciseIndex) => void.
 * @return {React.ReactElement}
 */
export default function ExerciseCard({
  exercise,
  unit,
  onToggleExpand,
  onOpenWeight,
  onStepReps,
  onInputReps,
  onToggleDone,
  onRenameExercise,
  onToggleSkip,
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  /**
   * Opens the name editor seeded with the current override, without toggling
   * the card's expanded state.
   * @param {React.MouseEvent} event - The click event.
   */
  function startEditName(event) {
    event.stopPropagation();
    setDraftName(exercise.override);
    setEditingName(true);
  }

  /** Commits the draft name (empty clears the override) and closes the editor. */
  function confirmName() {
    onRenameExercise(exercise.index, draftName);
    setEditingName(false);
  }

  /** Closes the editor without saving. */
  function cancelName() {
    setEditingName(false);
  }

  /**
   * Confirms on Enter, cancels on Escape, while typing a name.
   * @param {React.KeyboardEvent} event - The key event.
   */
  function onNameKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmName();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelName();
    }
  }

  /**
   * Toggles the card on Enter/Space when the header has keyboard focus.
   * @param {React.KeyboardEvent} event - The key event.
   */
  function onHeaderKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleExpand(exercise.index);
    }
  }

  return (
    <Card className={styles.exCard}>
      <div
        className={styles.exHeader}
        role="button"
        tabIndex={0}
        onClick={() => onToggleExpand(exercise.index)}
        onKeyDown={onHeaderKeyDown}
      >
        <div
          className={`${styles.exBadge} ${
            exercise.skipped
              ? styles.exBadgeSkipped
              : exercise.complete
              ? styles.exBadgeDone
              : ""
          }`}
        >
          {exercise.skipped ? (
            "–"
          ) : exercise.complete ? (
            <Check size={16} stroke="#fff" />
          ) : (
            exercise.index + 1
          )}
        </div>
        <div className={styles.exInfo}>
          <div
            className={`${styles.exName} ${
              exercise.skipped ? styles.exNameSkipped : ""
            }`}
          >
            {exercise.name}
            {exercise.subLabel && (
              <span className={styles.exSub}> {exercise.subLabel}</span>
            )}
            <button
              type="button"
              className={styles.editNameBtn}
              onClick={startEditName}
              aria-label="Edit exercise name"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
          </div>
          {exercise.originalName && (
            <div className={styles.exOriginal}>{exercise.originalName}</div>
          )}
          <div className={styles.exTarget}>
            {exercise.target} · rest {exercise.rest}
          </div>
        </div>
        <div className={styles.exRight}>
          <span
            className={`${styles.exProgress} ${
              exercise.skipped
                ? styles.exProgressSkipped
                : exercise.complete
                ? styles.exProgressDone
                : ""
            }`}
          >
            {exercise.skipped ? "Skipped" : exercise.progress}
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
              transform: exercise.open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {editingName && (
        <div className={styles.nameEditRow}>
          <input
            className={styles.nameEditInput}
            value={draftName}
            placeholder={exercise.baseName}
            aria-label="Override exercise name"
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={onNameKeyDown}
          />
          <button
            type="button"
            className={styles.nameConfirmBtn}
            onClick={confirmName}
            aria-label="Save name"
          >
            <Check size={16} stroke="#fff" />
          </button>
          <button
            type="button"
            className={styles.nameCancelBtn}
            onClick={cancelName}
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
      )}

      {exercise.open && exercise.skipped && (
        <div className={styles.exBody}>
          <div className={styles.skipNotice}>
            Skipped this week — it’s left out of your progress. Anything you
            already logged is kept.
          </div>
          <button
            type="button"
            className={styles.restoreBtn}
            onClick={() => onToggleSkip(exercise.index)}
          >
            Restore exercise
          </button>
        </div>
      )}

      {exercise.open && !exercise.skipped && (
        <div className={styles.exBody}>
          <div className={styles.setColHead}>
            <span className={styles.colSet}>Set</span>
            <span className={styles.colWeight}>Weight · {unit}</span>
            <span className={styles.colReps}>Reps</span>
            <span className={styles.colDone}>Done</span>
          </div>
          {exercise.sets.map((set, setIndex) => (
            <div
              key={setIndex}
              className={`${styles.setRow} ${
                set.done ? styles.setRowDone : ""
              }`}
            >
              <div className={styles.colSet}>{setIndex + 1}</div>
              <button
                className={styles.weightField}
                onClick={() =>
                  onOpenWeight({ exerciseIndex: exercise.index, setIndex })
                }
              >
                <span
                  className={`${styles.weightVal} ${
                    set.weight === "" ? styles.weightEmpty : ""
                  } ${set.isRolledForward ? styles.rolledForward : ""}`}
                >
                  {set.weight === "" ? "—" : set.weight}
                </span>
                <span className={styles.weightUnit}>{unit}</span>
              </button>
              <div className={styles.repsField}>
                <button
                  className={styles.repsBtn}
                  onClick={() => onStepReps(exercise.index, setIndex, -1)}
                  aria-label="Decrease reps"
                >
                  −
                </button>
                <input
                  className={`${styles.repsInput} ${
                    set.isRolledForward ? styles.rolledForward : ""
                  }`}
                  value={set.reps}
                  inputMode="numeric"
                  placeholder={exercise.placeholder}
                  onChange={(event) =>
                    onInputReps(exercise.index, setIndex, event.target.value)
                  }
                />
                <button
                  className={styles.repsBtn}
                  onClick={() => onStepReps(exercise.index, setIndex, 1)}
                  aria-label="Increase reps"
                >
                  +
                </button>
              </div>
              <button
                className={`${styles.doneBox} ${
                  set.done ? styles.doneBoxChecked : ""
                }`}
                onClick={() => onToggleDone(exercise.index, setIndex)}
                aria-label="Toggle set done"
              >
                {set.done && <Check size={16} stroke="#fff" />}
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.skipBtn}
            onClick={() => onToggleSkip(exercise.index)}
          >
            Skip this exercise
          </button>
        </div>
      )}
    </Card>
  );
}

ExerciseCard.propTypes = {
  exercise: PropTypes.object.isRequired,
  unit: PropTypes.string.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  onOpenWeight: PropTypes.func.isRequired,
  onStepReps: PropTypes.func.isRequired,
  onInputReps: PropTypes.func.isRequired,
  onToggleDone: PropTypes.func.isRequired,
  onRenameExercise: PropTypes.func.isRequired,
  onToggleSkip: PropTypes.func.isRequired,
};
