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
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  /**
   * Opens the name editor seeded with the current override, without toggling
   * the card's expanded state.
   * @param {React.MouseEvent} e - The click event.
   */
  function startEditName(e) {
    e.stopPropagation();
    setDraftName(ex.override);
    setEditingName(true);
  }

  /** Commits the draft name (empty clears the override) and closes the editor. */
  function confirmName() {
    onRenameExercise(ex.idx, draftName);
    setEditingName(false);
  }

  /** Closes the editor without saving. */
  function cancelName() {
    setEditingName(false);
  }

  /**
   * Confirms on Enter, cancels on Escape, while typing a name.
   * @param {React.KeyboardEvent} e - The key event.
   */
  function onNameKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelName();
    }
  }

  /**
   * Toggles the card on Enter/Space when the header has keyboard focus.
   * @param {React.KeyboardEvent} e - The key event.
   */
  function onHeaderKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleExpand(ex.idx);
    }
  }

  return (
    <Card className={styles.exCard}>
      <div
        className={styles.exHeader}
        role="button"
        tabIndex={0}
        onClick={() => onToggleExpand(ex.idx)}
        onKeyDown={onHeaderKeyDown}
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
      </div>

      {editingName && (
        <div className={styles.nameEditRow}>
          <input
            className={styles.nameEditInput}
            value={draftName}
            placeholder={ex.baseName}
            aria-label="Override exercise name"
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
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

      {ex.open && (
        <div className={styles.exBody}>
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
