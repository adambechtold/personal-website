"use client";

import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import styles from "./comments.module.css";
import CommentTrigger from "./CommentTrigger";
import CommentThread from "./CommentThread";

/**
 * Shell B — overlay. The trigger sits on the card; tapping it opens the shared
 * thread in a focused overlay. On mobile this reads as a bottom sheet; on
 * desktop (wider viewport) it centers as a modal. Pure CSS handles the
 * difference; the body is identical to the inline shell.
 * @param {Object} props
 * @param {ReturnType<import('./useComments').useComments>} props.thread
 * @param {string} props.label - Expense description, shown in the sheet header.
 * @return {React.ReactElement}
 */
export default function CommentSheet({ thread, label }) {
  const [open, setOpen] = useState(false);
  const { comments } = thread;
  const latest = comments[comments.length - 1];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.inlineWrap}>
      <CommentTrigger
        count={comments.length}
        latest={latest}
        active={open}
        showTeaser
        onClick={() => setOpen(true)}
      />
      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={`Comments on ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>{label}</span>
              <button
                type="button"
                className={styles.sheetClose}
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <CommentThread thread={thread} />
          </div>
        </div>
      )}
    </div>
  );
}

CommentSheet.propTypes = {
  thread: PropTypes.object.isRequired,
  label: PropTypes.string,
};
