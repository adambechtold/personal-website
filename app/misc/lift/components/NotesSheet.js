import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Button from "../../../components/ui/Button";
import { NOTES } from "../data";

/**
 * The "How to run it" bottom sheet listing the program notes.
 * @param {{onClose: Function}} props
 * @return {React.ReactElement}
 */
export default function NotesSheet({ onClose }) {
  return (
    <div className={styles.sheetWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.grabWrap}>
          <div className={styles.grab} />
        </div>
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>How to run it</h2>
          <Button
            variant="outlined"
            className={styles.sheetClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </Button>
        </div>
        {NOTES.map((note) => (
          <div key={note.h} className={styles.note}>
            <div className={styles.noteHead}>{note.h}</div>
            <div className={styles.noteBody}>{note.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

NotesSheet.propTypes = {
  onClose: PropTypes.func.isRequired,
};
